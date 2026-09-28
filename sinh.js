// Module sinh 2 ban thiep tu du-lieu.json + khuon thiep-khong-prewedding.html.
// Thuan JS, khong dung API rieng cua Node -> chay duoc ca trong admin (trinh duyet)
// lan trong scratchpad khi can sinh lai bang dong lenh.
// Dung chung 1 noi de logic khong bi lech giua "sinh tay" va "sinh qua admin".
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SinhThiep = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // khung anh giu lai -> [khoa trong du-lieu.anh, vi tri crop]
  var DOI_ANH = {
    IMAGE3:  ['bia_codau',   '88% 50%'],
    IMAGE4:  ['bia_tay_hoa', '10% 50%'],
    IMAGE20: ['forever',     '50% 40%'],
    IMAGE42: ['timeline',    '50% 50%'],
    IMAGE60: ['demlui_trai', '60% 50%'],
    IMAGE61: ['demlui_phai', '62% 50%'],
    IMAGE77: ['camon',       '50% 55%'],
  };
  var AN_KHOI = ['GROUP2', 'IMAGE6'];

  // Sua co dinh tren bia (giong nhau ca 2 ban, khong phu thuoc du-lieu.json):
  // - HEADLINE4: doi font ultralight goc (vo dau tieng Viet) sang Cormorant Garamond.
  // - SHAPE1: trai tim to hon 1 chut, can chinh giua 2 dong ten (do bang getBoundingClientRect).
  // - HEADLINE30 (dresscode): can giua hang cham mau trong canvas 420px.
  var BIA_CSS = [
    '#HEADLINE4 > .ladi-headline{font-family: \'Cormorant Garamond\', serif; font-weight: 500; font-size: 24px; line-height: 1.4; color: rgb(142, 124, 105); text-transform: uppercase; letter-spacing: 6px; text-align: center;}',
    '#SHAPE1{width: 15px; height: 15.8712px; top: 42px; left: 71.5px;}',
    '#HEADLINE30{top: 54px; left: 65px;}',
  ].join('\n');

  // BUG-27: 4 icon nay truoc kia hotlink thang CDN cua cap doi mau goc (rui ro vo anh
  // neu ho xoa kho). Da tai ve anh/ladi/ va sinh.js chi con dung duong dan noi bo.
  var ICON = {
    nhan:     '../anh/ladi/s400x400-nhan.png',
    may_anh:  '../anh/ladi/s400x400-may-anh.png',
    khai_tiec:'../anh/ladi/s400x400-khai-tiec.png',
    hoa_cuoi: '../anh/ladi/s400x400-hoa-cuoi.png',
  };
  // 4 o moc chuong trinh gan cung theo vi tri: o1=IMAGE51, o2=IMAGE50, o3=IMAGE52, o4=IMAGE53
  var O_ICON = ['IMAGE51', 'IMAGE50', 'IMAGE52', 'IMAGE53'];
  // icon mac dinh cua khuon (khi ban khong doi) — dung de biet co can hoan hay khong
  var ICON_GOC = { IMAGE51: 'may_anh', IMAGE50: 'nhan', IMAGE52: 'khai_tiec', IMAGE53: 'hoa_cuoi' };

  var THU_TRONG_TUAN = ['CHỦ NHẬT', 'THỨ HAI', 'THỨ BA', 'THỨ TƯ', 'THỨ NĂM', 'THỨ SÁU', 'THỨ BẢY'];

  // ----- am lich (thuat toan Ho Ngoc Duc, mui gio +7) -----
  function jdFromDate(dd, mm, yy) {
    var a = Math.floor((14 - mm) / 12);
    var y = yy + 4800 - a;
    var m = mm + 12 * a - 3;
    var jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
    if (jd < 2299161) jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
    return jd;
  }
  function NewMoon(k) {
    var T = k / 1236.85, T2 = T * T, T3 = T2 * T, dr = Math.PI / 180;
    var Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
    Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
    var M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
    var Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
    var F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
    var C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
    C1 -= 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
    C1 -= 0.0004 * Math.sin(dr * 3 * Mpr);
    C1 += 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
    C1 -= 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
    C1 -= 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
    C1 += 0.0010 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
    var deltat;
    if (T < -11) deltat = 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3;
    else deltat = -0.000278 + 0.000265 * T + 0.000262 * T2;
    return Jd1 + C1 - deltat;
  }
  function SunLongitude(jdn) {
    var T = (jdn - 2451545.0) / 36525, T2 = T * T, dr = Math.PI / 180;
    var M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
    var L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
    var DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
    DL += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.000290 * Math.sin(dr * 3 * M);
    var L = L0 + DL;
    L = L * dr - Math.PI * 2 * Math.floor(L * dr / (Math.PI * 2));
    return L;
  }
  function getSunLongitude(dayNumber, timeZone) { return Math.floor(SunLongitude(dayNumber - 0.5 - timeZone / 24) / Math.PI * 6); }
  function getNewMoonDay(k, timeZone) { return Math.floor(NewMoon(k) + 0.5 + timeZone / 24); }
  function getLunarMonth11(yy, timeZone) {
    var off = jdFromDate(31, 12, yy) - 2415021;
    var k = Math.floor(off / 29.530588853);
    var nm = getNewMoonDay(k, timeZone);
    var sunLong = getSunLongitude(nm, timeZone);
    if (sunLong >= 9) nm = getNewMoonDay(k - 1, timeZone);
    return nm;
  }
  function getLeapMonthOffset(a11, timeZone) {
    var k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
    var last = 0, i = 1, arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
    do { last = arc; i++; arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone); } while (arc !== last && i < 14);
    return i - 1;
  }
  function convertSolar2Lunar(dd, mm, yy, timeZone) {
    var dayNumber = jdFromDate(dd, mm, yy);
    var k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
    var monthStart = getNewMoonDay(k + 1, timeZone);
    if (monthStart > dayNumber) monthStart = getNewMoonDay(k, timeZone);
    var a11 = getLunarMonth11(yy, timeZone);
    var b11 = a11;
    var lunarYear;
    if (a11 >= monthStart) { lunarYear = yy; a11 = getLunarMonth11(yy - 1, timeZone); }
    else { lunarYear = yy + 1; b11 = getLunarMonth11(yy + 1, timeZone); }
    var lunarDay = dayNumber - monthStart + 1;
    var diff = Math.floor((monthStart - a11) / 29);
    var lunarLeap = 0, lunarMonth = diff + 11;
    if (b11 - a11 > 365) {
      var leapMonthDiff = getLeapMonthOffset(a11, timeZone);
      if (diff >= leapMonthDiff) { lunarMonth = diff + 10; if (diff === leapMonthDiff) lunarLeap = 1; }
    }
    if (lunarMonth > 12) lunarMonth -= 12;
    if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;
    return { day: lunarDay, month: lunarMonth, year: lunarYear, leap: lunarLeap };
  }
  var CAN = ['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
  var CHI = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
  function canChiNam(namDuong) { return CAN[(namDuong + 6) % 10] + ' ' + CHI[(namDuong + 8) % 12]; }

  // BUG-11: chan ngay rong / sai dinh dang truoc khi tinh -> bao loi ro thay vi sinh "undefined"/"NaN"
  // BUG-24: kiem CA hinh dang LAN mien gia tri. Chi kiem regex thi "2026-13-45" va "25:99"
  // van lot ra thiep that qua duong sua tay du-lieu.json + chay deploy.sh.
  var RE_NGAY = /^(\d{4})-(\d{2})-(\d{2})$/;
  function kiemNgay(iso, moTa) {
    var m = RE_NGAY.exec(iso || '');
    var oK = false;
    if (m) {
      var yy = +m[1], mm = +m[2], dd = +m[3];
      // dung Date roi doi chieu nguoc lai -> bat duoc ca 31/02 lan nam nhuan
      var d = new Date(Date.UTC(yy, mm - 1, dd));
      oK = yy >= 1900 && yy <= 2999 && mm >= 1 && mm <= 12 && dd >= 1 &&
        d.getUTCFullYear() === yy && d.getUTCMonth() === mm - 1 && d.getUTCDate() === dd;
    }
    if (!oK) {
      throw new Error('Ngày dương không hợp lệ' + (moTa ? ' ở "' + moTa + '"' : '') +
        ': "' + (iso == null || iso === '' ? '(để trống)' : iso) + '". Cần một ngày có thật, dạng YYYY-MM-DD.');
    }
    return iso;
  }
  function kiemGio(gio, moTa) {
    var m = /^(\d{2}):(\d{2})$/.exec(gio || '');
    if (!m || +m[1] > 23 || +m[2] > 59) {
      throw new Error('Giờ không hợp lệ' + (moTa ? ' ở "' + moTa + '"' : '') +
        ': "' + (gio == null || gio === '' ? '(để trống)' : gio) + '". Cần dạng HH:mm, giờ 00-23 và phút 00-59.');
    }
    return gio;
  }

  function amLich(ngayDuongISO) {
    kiemNgay(ngayDuongISO);
    var p = ngayDuongISO.split('-');
    var yy = +p[0], mm = +p[1], dd = +p[2];
    var al = convertSolar2Lunar(dd, mm, yy, 7);
    return {
      ngay: al.day, thang: al.month, nam: al.year,
      chuoi: '( Tức ngày ' + String(al.day).padStart(2, '0') + ' tháng ' + String(al.month).padStart(2, '0') + ' năm ' + canChiNam(al.year) + ' )',
    };
  }
  function thuTrongTuan(ngayDuongISO) {
    kiemNgay(ngayDuongISO);
    var p = ngayDuongISO.split('-').map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    return THU_TRONG_TUAN[d.getUTCDay()];
  }
  function ngayGon(iso) { // 2026-10-29 -> "29 . 10 . 2026"
    kiemNgay(iso);
    var p = iso.split('-');
    return p[2] + ' . ' + p[1] + ' . ' + p[0];
  }
  function ngaySlash2so(iso) { // 2026-10-29 -> "29 / 10 / 26"
    kiemNgay(iso);
    var p = iso.split('-');
    return p[2] + ' / ' + p[1] + ' / ' + p[0].slice(2);
  }
  var THANG_ANH = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function ngayThangChuXepDoc(iso) { // 2026-10-29 -> "29<br>Oct<br>2026"
    kiemNgay(iso);
    var p = iso.split('-');
    return p[2] + '<br>' + THANG_ANH[(+p[1]) - 1] + '<br>' + p[0];
  }

  // ----- tien ich cat/thay chuoi (giu nguyen tu ban Node truoc) -----
  function catTheDiv(s, moTa) {
    var i = s.indexOf(moTa);
    if (i < 0) return { s: s, ok: false };
    var het = i, sau = 0;
    var re = /<div\b|<\/div>/g, m;
    re.lastIndex = i;
    while ((m = re.exec(s))) {
      if (m[0] === '</div>') sau--; else sau++;
      if (sau === 0) { het = m.index + m[0].length; break; }
    }
    return { s: s.slice(0, i) + s.slice(het), ok: true };
  }
  // BUG-19: thay chuoi ma KHONG de JS hieu "$&", "$1", "$`" la mau thay the.
  function thayChuoi(s, mauTim, giaTri) {
    return s.replace(mauTim, function () { return giaTri; });
  }

  // BUG-12: chan HTML injection. Moi gia tri nguoi dung nhap deu duoc escape,
  // rieng <br> (va <br/>) duoc hoan nguyen vi vai truong can xuong dong.
  function escHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function sachChoThiep(v) {
    return escHtml(v).replace(/&lt;br\s*\/?&gt;/gi, '<br>');
  }
  // Truong khong duoc phep xuong dong (ten nguoi, nhan ngan...) -> bo sach the.
  function boThe(v) {
    return String(v == null ? '' : v).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function datText(s, id, html, log) {
    var re = new RegExp('(id="' + id + '"[^>]*>\\s*<([a-z0-9]+)[^>]*>)([\\s\\S]*?)(</\\2>)');
    if (!re.test(s)) { if (log) log.push('  !! khong thay ' + id); return s; }
    var noiDung = sachChoThiep(html);
    return s.replace(re, function (m, mo, tag, cu, dong) { return mo + noiDung + dong; });
  }
  // Giong datText nhung nhung THANG HTML da dung san (khong escape) — dung cho cac
  // doan can chen the (vd cham mau dresscode), noi dung ben trong da tu escape tu truoc.
  function datHtml(s, id, htmlSan, log) {
    var re = new RegExp('(id="' + id + '"[^>]*>\\s*<([a-z0-9]+)[^>]*>)([\\s\\S]*?)(</\\2>)');
    if (!re.test(s)) { if (log) log.push('  !! khong thay ' + id); return s; }
    return s.replace(re, function (m, mo, tag, cu, dong) { return mo + htmlSan + dong; });
  }
  // BUG-28: hex mau dresscode do nguoi dung nhap qua <input type=color> nhung van la
  // chuoi tu do -> chan truoc khi nhung thang vao style inline de khong lo CSS/HTML injection.
  function hexAnToan(hex) {
    var m = /^#[0-9a-fA-F]{3,8}$/.exec(String(hex == null ? '' : hex).trim());
    return m ? m[0] : '#8E7C69';
  }
  function chamMau(hex) {
    return '<span style="display:inline-block;width:20px;height:20px;border-radius:50%;' +
      'vertical-align:middle;margin:0 7px 5px 0;box-shadow:inset 0 0 0 1px rgba(142,124,105,.45);' +
      'background:' + hexAnToan(hex) + '"></span>';
  }
  // Man intro "phong thu" truoc khi vao thiep chinh (BUG-29). Chay doc lap voi phan
  // con lai: tu chen HTML + <style> + <script> ngay dau <body>, khoa cuon bang class
  // tren <html>, roi go het khoi nay khi khach cham/vuot mo thu xong.
  // Font dung lai: 'Cormorant Garamond' (Google Font co san) + font viet tay
  // SVN-JaneLotus (ten @font-face da bi LadiPage lam roi, giu nguyen chuoi obfuscate
  // FONT_VIET_TAY de tai dung file .otf co san, khong tai them font moi).
  var FONT_VIET_TAY = 'UZOLUphbmVsbRcyvdGY';
  // Loi moi rieng cho man intro CO Y co dinh, KHONG lay tu b.loiMoi: intro chi dung
  // 1 cau chung "THAM DU LE CUOI..." giong anh mau, con loi moi that theo tung su
  // kien (VD "toi du bua com than mat") van hien o HEADLINE13 trong than thiep nhu cu.
  var LOI_MOI_INTRO = 'THAM DỰ LỄ CƯỚI<br>CỦA GIA ĐÌNH CHÚNG TÔI';
  // Van giay mo cho phong bi: SVG feTurbulence nhung thang (khong them file anh).
  var HAT_GIAY = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E" +
    "%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E" +
    "%3CfeColorMatrix values='0 0 0 0 .38 0 0 0 0 .36 0 0 0 0 .24 0 0 0 .1 0'/%3E%3C/filter%3E" +
    "%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";
  function khoiIntro(opts) {
    var tenTren = escHtml(opts.tenTren.toUpperCase());
    var tenDuoi = escHtml(opts.tenDuoi.toUpperCase());
    var monogram = escHtml(opts.monogram);
    var tuPhatNhac = opts.tuPhatNhac ? 'true' : 'false';
    var doveSvg = '<svg class="ti-dove" viewBox="0 0 64 40" aria-hidden="true">' +
      '<g class="ti-wing ti-wing-l"><path d="M32 21 C21 10,6 11,0 4 C5 17,15 23,29 25 Z"/></g>' +
      '<g class="ti-wing ti-wing-r"><path d="M32 21 C43 10,58 11,64 4 C59 17,49 23,35 25 Z"/></g>' +
      '<path d="M27.5 23 C29 18.5,35 18.5,36.5 23 C38.5 25.5,36 29.5,32 28.3 C28 29.5,25.5 25.5,27.5 23 Z"/>' +
      '</svg>';
    return [
      '<div id="thiep-intro" role="button" tabindex="0" aria-label="Chạm hoặc vuốt lên để mở thiệp">',
      '<style id="style_intro">',
      // BUG-34: KHONG duoc khoa cuon bang cach sua layout cua html/body (position:fixed /
      // width:100% / overflow:hidden). Dien thoai tu thu nho trang 420px cho vua man hinh
      // dua tren be rong trang LUC TAI; ep html/body ve be rong man hinh luc tai khien
      // trinh duyet khong thu nho, mo thu xong trang bi phong to va tran ngang. Khoa cuon
      // bang cach chan su kien (touchmove/wheel/phim) trong script ben duoi.
      // BUG-30: align-items:center bien .ti-content thanh flex-item "co giu theo noi
      // dung" (shrink-to-fit) -> ten khach dai se ep rong khung TO RA THEO CHU thay vi
      // bi gioi han theo man hinh, khien vong lap tu-co-chu (scrollWidth>clientWidth)
      // khong bao gio dung vi 2 gia tri luon bang nhau. Dung "stretch" (mac dinh) de
      // cac khoi con full-width, roi tu can giua tung dong bang text-align rieng.
      // BUG-32: doi justify-content sang "center" de ca cum chu + phong bi gom lai
      // thanh 1 khoi va nam giua man hinh (truoc do "space-between" day chu len sat
      // dinh, de lai khoang trong lon giua chung voi phong bi).
      '#thiep-intro{position:fixed;inset:0;z-index:999999;display:flex;flex-direction:column;align-items:stretch;justify-content:center;',
      'background:radial-gradient(120% 100% at 50% 18%,#FDFCF7 0%,#F6F4EC 55%,#ECEAE0 100%);',
      'padding:min(5vh,36px) 24px max(3vh,18px);box-sizing:border-box;text-align:center;cursor:pointer;',
      'font-family:"Cormorant Garamond",serif;color:#8E7C69;-webkit-tap-highlight-color:transparent;',
      '-webkit-touch-callout:none;user-select:none;touch-action:none;',
      'transition:opacity .9s cubic-bezier(.4,0,.2,1),transform .9s cubic-bezier(.4,0,.2,1);}',
      '#thiep-intro *{box-sizing:border-box;}',
      '#thiep-intro.ti-closing{opacity:0;transform:scale(1.05);pointer-events:none;}',
      '.ti-content{opacity:0;transform:translateY(14px);animation:ti-fade-in .9s .15s cubic-bezier(.16,1,.3,1) forwards;}',
      '@keyframes ti-fade-in{to{opacity:1;transform:none;}}',
      '.ti-names{font-size:clamp(34px,10.5vw,48px);letter-spacing:2px;line-height:1.26;font-weight:500;}',
      '.ti-amp{display:block;font-size:.58em;opacity:.85;margin:2px 0;font-style:italic;}',
      '.ti-invite{margin-top:20px;font-size:clamp(15px,4.2vw,19px);letter-spacing:3px;text-transform:uppercase;opacity:.85;}',
      '#thiep-intro-khach{display:block;margin-top:14px;font-family:"' + FONT_VIET_TAY + '";font-size:clamp(34px,11vw,46px);line-height:1.3;white-space:nowrap;}',
      // BUG-33: ".ti-message" co max-width nhung khong co margin auto -> trong 1 khoi
      // cha full-width (do BUG-30 fix o tren), no bam sat le TRAI thay vi nam giua,
      // du ban than chu ben trong van text-align:center (chi chu giua HOP, HOP thi lech).
      '.ti-message{margin:18px auto 0;font-size:clamp(16px,4.6vw,20px);font-weight:500;letter-spacing:1.2px;line-height:1.6;opacity:.85;max-width:320px;}',
      '.ti-stage{position:relative;width:min(78vw,290px);flex:0 0 auto;margin:28px auto 0;}',
      '.ti-envelope{position:relative;width:100%;aspect-ratio:8/5;perspective:1000px;}',
      // Phong bi theo anh mau (bao thu ivory ngả xanh + nét gấp màu ô liu): các mảng
      // phẳng khác nhau rất nhẹ về độ sáng (mau lay mau truc tiep tu anh), vân giấy
      // mờ, và 2 đường viền nắp màu ô liu đậm — đường viền là thứ tách phong bì khỏi
      // nền chứ không phải độ tương phản màu.
      '.ti-env-body{position:absolute;inset:0;border-radius:4px;overflow:hidden;background:#DAD8C0;',
      'border:1px solid rgba(110,104,70,.4);box-shadow:0 18px 34px -16px rgba(70,66,40,.42),0 2px 6px rgba(70,66,40,.12);}',
      '.ti-env-back{position:absolute;inset:0;width:100%;height:100%;display:block;}',
      '.ti-env-grain{position:absolute;inset:0;background-image:' + HAT_GIAY + ';pointer-events:none;}',
      '.ti-env-flap{position:absolute;top:0;left:0;width:100%;height:78%;transform-origin:top center;transform-style:preserve-3d;',
      'transition:transform .8s cubic-bezier(.61,-0.15,.35,1.35);}',
      // KHONG dat filter len .ti-env-flap: filter ep transform-style ve "flat" -> mat 3D,
      // luc nap lat len se thay mat TRUOC bi lat nguoc (chu ĐT nguoc) thay vi mat trong.
      // Bong do cua nap la 1 lop tinh rieng, mo di khi mo thu.
      '.ti-flap-shadow{position:absolute;top:0;left:0;width:100%;height:78%;clip-path:polygon(0 0,100% 0,50% 100%);',
      'background:rgba(70,66,40,.28);transform:translateY(2.5px);transition:opacity .3s;}',
      '#thiep-intro.ti-opening .ti-flap-shadow{opacity:0;}',
      '.ti-env-flap-face{position:absolute;inset:0;backface-visibility:hidden;clip-path:polygon(0 0,100% 0,50% 100%);}',
      '.ti-front{background:' + HAT_GIAY + ',linear-gradient(176deg,#ECEBDE 0%,#E4E3D3 100%);}',
      // mat trong da tu lat rotateX(180deg) trong hop cua no -> tam giac phai ve NGUOC
      // (day o duoi) thi sau khi lat moi trung khit hinh mat ngoai (day o ban le).
      '.ti-back{background:' + HAT_GIAY + ',linear-gradient(4deg,#D6D4BB,#CBC8AD);transform:rotateX(180deg);clip-path:polygon(0 100%,100% 100%,50% 0);}',
      '.ti-flap-line{position:absolute;inset:0;width:100%;height:100%;display:block;}',
      '.ti-flap-line polyline{fill:none;stroke:#7C7650;stroke-width:2.6;}',
      '#thiep-intro.ti-opening .ti-env-flap{transform:rotateX(150deg);}',
      // Chu long "ĐT" la anh logo rieng (anh/mono-dt.png, nen trong suot, to lai dung
      // mau muc o liu #837D53 cua anh mau). Co + vi tri theo anh mau (~30% be ngang
      // phong bi), va nam trong phan rong cua nap tam giac de khong bi cat o dinh nhon.
      '.ti-monogram-img{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);width:30%;height:auto;display:block;}',
      // BUG-31b: chim qua nho + mo dan tu scale .5 nen thoang qua la kho thay. Phong
      // to, giu do dam net hon (khong fade o dau), them vien nau nhat de noi tren
      // nen sang MA VAN noi tren phong bi sam mau vua doi o tren.
      '.ti-doves{position:absolute;left:0;right:0;top:6%;height:0;overflow:visible;pointer-events:none;}',
      '.ti-dove{position:absolute;width:68px;height:43px;left:50%;top:0;opacity:0;fill:#fffefa;stroke:#9C9770;stroke-width:1;',
      'filter:drop-shadow(0 3px 5px rgba(70,66,40,.32));}',
      '.ti-dove-l{margin-left:-100px;}',
      '.ti-dove-r{margin-left:32px;}',
      '.ti-wing{transform-origin:32px 21px;}',
      '.ti-dove.ti-flying .ti-wing{animation:ti-wingflap .2s ease-in-out infinite;}',
      '.ti-dove.ti-flying .ti-wing-r{animation-delay:.03s;}',
      '@keyframes ti-wingflap{0%,100%{transform:rotate(0deg);}50%{transform:rotate(-32deg);}}',
      '#thiep-intro.ti-opening .ti-dove-l{animation:ti-fly-l 2.1s .28s cubic-bezier(.22,.55,.4,1) forwards;}',
      '#thiep-intro.ti-opening .ti-dove-r{animation:ti-fly-r 2.1s .42s cubic-bezier(.22,.55,.4,1) forwards;}',
      '@keyframes ti-fly-l{0%{opacity:0;transform:translate(10px,10px) scale(.75) rotate(-6deg);}10%{opacity:1;transform:translate(0,0) scale(.85) rotate(-8deg);}70%{opacity:1;transform:translate(-90px,-62vh) scale(1) rotate(-16deg);}100%{opacity:0;transform:translate(-130px,-98vh) scale(1.1) rotate(-10deg);}}',
      '@keyframes ti-fly-r{0%{opacity:0;transform:translate(-10px,10px) scale(.75) rotate(6deg);}10%{opacity:1;transform:translate(0,0) scale(.85) rotate(8deg);}70%{opacity:1;transform:translate(90px,-62vh) scale(1) rotate(16deg);}100%{opacity:0;transform:translate(130px,-98vh) scale(1.1) rotate(10deg);}}',
      '.ti-hint{margin-top:16px;font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.55;animation:ti-bounce 1.8s ease-in-out infinite;}',
      '@keyframes ti-bounce{0%,100%{transform:translateY(0);}50%{transform:translateY(5px);}}',
      '@media (prefers-reduced-motion: reduce){#thiep-intro,#thiep-intro *{transition-duration:.3s!important;animation:none!important;}}',
      '</style>',
      '<div class="ti-content">',
      '<div class="ti-names"><span>' + tenTren + '</span><span class="ti-amp">&amp;</span><span>' + tenDuoi + '</span></div>',
      '<div class="ti-invite">Trân trọng kính mời</div>',
      '<span id="thiep-intro-khach">Quý Khách</span>',
      '<div class="ti-message">' + LOI_MOI_INTRO + '</div>',
      '</div>',
      '<div class="ti-stage">',
      '<div class="ti-doves">' + doveSvg.replace('ti-dove"', 'ti-dove ti-dove-l"') + doveSvg.replace('ti-dove"', 'ti-dove ti-dove-r"') + '</div>',
      '<div class="ti-envelope">',
      '<div class="ti-env-body">',
      '<svg class="ti-env-back" viewBox="0 0 800 500" preserveAspectRatio="none" aria-hidden="true">',
      '<rect width="800" height="500" fill="#DAD8C0"/>',
      '<polygon points="0,0 400,300 0,500" fill="#DDDBC3"/>',
      '<polygon points="800,0 400,300 800,500" fill="#E0DEC6"/>',
      '<polygon points="0,500 400,265 800,500" fill="#D6D4BC"/>',
      '<polyline points="0,500 400,265 800,500" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.4" vector-effect="non-scaling-stroke"/>',
      '<polyline points="0,0 400,300 800,0" fill="none" stroke="#6E6946" stroke-opacity=".22" stroke-width="1" vector-effect="non-scaling-stroke"/>',
      '</svg>',
      '<div class="ti-env-grain"></div>',
      '</div>',
      '<div class="ti-flap-shadow"></div>',
      '<div class="ti-env-flap">',
      '<div class="ti-env-flap-face ti-front"><img class="ti-monogram-img" src="../anh/mono-dt.png" alt="' + monogram + '">' +
        '<svg class="ti-flap-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
        '<polyline points="0,0 50,100 100,0" vector-effect="non-scaling-stroke"/></svg></div>',
      '<div class="ti-env-flap-face ti-back"></div>',
      '</div>',
      '</div>',
      '</div>',
      '<div class="ti-hint">Chạm để mở thiệp</div>',
      '<script>(function(){',
      '  var root = document.getElementById("thiep-intro");',
      '  if (!root) return;',
      '  var TI_AUTOPLAY = ' + tuPhatNhac + ';',
      '  var opened = false;',
      '  var PHIM_CUON = { " ": 1, ArrowUp: 1, ArrowDown: 1, PageUp: 1, PageDown: 1, Home: 1, End: 1 };',
      '  function chan(e){ if (e.cancelable) e.preventDefault(); }',
      '  function chanPhim(e){ if (PHIM_CUON[e.key] && e.target !== root) e.preventDefault(); }',
      '  function giuDinh(){ if (window.scrollY) window.scrollTo(0, 0); }',
      '  document.addEventListener("touchmove", chan, { passive: false });',
      '  document.addEventListener("wheel", chan, { passive: false });',
      '  document.addEventListener("keydown", chanPhim);',
      '  window.addEventListener("scroll", giuDinh, { passive: true });',
      // position:fixed bam theo layout viewport (= be rong trang 420px); khi trinh duyet
      // KHONG thu nho trang cho vua man hinh, phan nhin thay hep hon -> intro lech/bi cat.
      // Ep intro dung bang vung nhin thay that (visualViewport) de luon can giua.
      '  var vv = window.visualViewport;',
      '  function vuaManHinh(){',
      '    if (!vv) return;',
      '    root.style.right = "auto";',
      '    root.style.left = Math.round(vv.offsetLeft) + "px";',
      '    root.style.width = Math.round(vv.width) + "px";',
      '  }',
      '  vuaManHinh();',
      '  if (vv) vv.addEventListener("resize", vuaManHinh);',
      '  function moKhoa(){',
      '    if (vv) vv.removeEventListener("resize", vuaManHinh);',
      '    document.removeEventListener("touchmove", chan, { passive: false });',
      '    document.removeEventListener("wheel", chan, { passive: false });',
      '    document.removeEventListener("keydown", chanPhim);',
      '    window.removeEventListener("scroll", giuDinh, { passive: true });',
      '  }',
      '  function mo(){',
      '    if (opened) return;',
      '    opened = true;',
      '    root.classList.add("ti-opening");',
      '    var doves = root.querySelectorAll(".ti-dove");',
      '    for (var i = 0; i < doves.length; i++) doves[i].classList.add("ti-flying");',
      '    if (TI_AUTOPLAY) { try { window.__thiepBatNhac && window.__thiepBatNhac(); } catch (e) {} }',
      '    setTimeout(function () {',
      '      root.classList.add("ti-closing");',
      '      setTimeout(function () {',
      '        moKhoa();',
      '        window.scrollTo(0, 0);',
      '        if (root && root.parentNode) root.parentNode.removeChild(root);',
      '      }, 950);',
      '    }, 820);',
      '  }',
      '  root.addEventListener("touchstart", mo, { passive: true });',
      '  root.addEventListener("click", mo);',
      '  root.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); mo(); } });',
      '})();</' + 'script>',
      '</div>',
    ].join('\n');
  }
  function doiAnh(s, id, url, log) {
    var re = new RegExp('(#' + id + '\\s*>\\s*\\.ladi-image\\s*>\\s*\\.ladi-image-background\\{[^}]*background-image:\\s*url\\()([^)]*)(\\))');
    if (!re.test(s)) { if (log) log.push('  !! khong thay css anh ' + id); return s; }
    return s.replace(re, function (m, a, cu, c) { return a + '"' + url + '"' + c; });
  }

  function suKienTheo(du, ma) {
    for (var i = 0; i < du.suKien.length; i++) if (du.suKien[i].ma === ma) return du.suKien[i];
    return null;
  }

  // ----- sinh 1 ban tu du-lieu.json -----
  // goc: chuoi HTML cua thiep-khong-prewedding.html
  // ma: 'nha_trai' | 'nha_gai'
  // opts (tuy chon):
  //   { xemTruoc: true }  -> ban dung cho khung xem truoc trong admin:
  //                          go nhac + go script form cua LadiPage (BUG-05, BUG-21)
  function sinh(goc, du, ma, opts) {
    opts = opts || {};
    var log = [];
    var b = du.ban[ma];
    var s = goc;

    // 0. kiem tra du lieu bat buoc truoc khi sinh (BUG-11)
    (du.suKien || []).forEach(function (sk) {
      kiemNgay(sk.ngayDuong, sk.ten || sk.ma);
      kiemGio(sk.gio, sk.ten || sk.ma);
    });

    // 1. bo 2 muc thu vien anh
    var i8 = s.indexOf('<div id="SECTION8"');
    var i10 = s.indexOf('<div id="SECTION10"');
    if (i8 > 0 && i10 > i8) { s = s.slice(0, i8) + s.slice(i10); log.push('bo SECTION8 (Album) + SECTION9 (bang anh truot)'); }
    else log.push('!! khong cat duoc SECTION8/9');

    // 2. bo nut gui qua mung + popup so tai khoan
    var r = catTheDiv(s, '<div data-action="true" id="BUTTON3"');
    s = r.s; log.push(r.ok ? 'bo nut GUI QUA MUNG CUOI' : '!! khong thay BUTTON3');
    r = catTheDiv(s, '<div id="POPUP2"');
    s = r.s; log.push(r.ok ? 'bo popup so tai khoan' : '!! khong thay POPUP2');

    // 3. doi anh + diem cat
    // Muc Dem lui: IMAGE60 nam ngay tren ten DUOI (HEADLINE64), IMAGE61 ngay duoi ten TREN (HEADLINE48).
    // Ban co dau truoc dao thu tu ten -> dao luon 2 anh de anh co dau van nam canh ten co dau.
    var anhBan = {};
    Object.keys(DOI_ANH).forEach(function (id) { anhBan[id] = DOI_ANH[id]; });
    if (b.thuTuTen === 'co_dau_truoc') { anhBan.IMAGE60 = DOI_ANH.IMAGE61; anhBan.IMAGE61 = DOI_ANH.IMAGE60; }
    Object.keys(anhBan).forEach(function (id) {
      var khoa = anhBan[id][0];
      var url = (du.anh[khoa] || {}).url;
      if (url) s = doiAnh(s, id, url, log);
    });
    log.push('doi ' + Object.keys(DOI_ANH).length + ' khung anh sang anh pre-wedding');

    // 3b. hoan icon moc chuong trinh theo du lieu.ban.chuongTrinh (toi da 4 o)
    var ct = b.chuongTrinh || [];
    O_ICON.forEach(function (idAnh, idx) {
      var moc = ct[idx];
      var iconKey = moc ? moc.icon : null;
      if (iconKey && ICON[iconKey] && iconKey !== ICON_GOC[idAnh]) {
        s = doiAnh(s, idAnh, ICON[iconKey], log);
      }
    });

    // 4. noi dung dung chung
    var c = du.chung;
    var coDauTruoc = b.thuTuTen === 'co_dau_truoc';
    var tenTren = coDauTruoc ? c.coDau.ten : c.chuRe.ten;
    var tenDuoi = coDauTruoc ? c.chuRe.ten : c.coDau.ten;
    // HEADLINE4 (bia phong bi) chi rong 158px, tracking chu rong -> chi dung TEN GOI (tu cuoi)
    var tenGoi = function (ten) { var p = boThe(ten).split(/\s+/); return p[p.length - 1] || ''; };
    s = datText(s, 'HEADLINE4', tenGoi(tenTren).toUpperCase() + '<br><br>' + tenGoi(tenDuoi).toUpperCase(), log);
    s = datText(s, 'HEADLINE6', boThe(tenTren), log);
    s = datText(s, 'HEADLINE7', boThe(tenDuoi), log);
    s = datText(s, 'HEADLINE48', boThe(tenTren).toUpperCase(), log);
    s = datText(s, 'HEADLINE51', boThe(coDauTruoc ? c.coDau.thuBac : c.chuRe.thuBac), log);
    s = datText(s, 'HEADLINE64', boThe(tenDuoi).toUpperCase(), log);
    s = datText(s, 'HEADLINE65', boThe(coDauTruoc ? c.chuRe.thuBac : c.coDau.thuBac), log);

    // 4b. man intro "phong thu" (BUG-29): chu long ten CO DINH "ĐT" (chu re truoc,
    // co dau sau) o CA 2 ban — khong doi theo thu tu tren/duoi nhu HEADLINE4/48/64,
    // theo yeu cau rieng cho khoi nay. Van lay chu cai dau tu du-lieu.json (khong
    // hard-code chuoi) de tu dong dung neu sau nay đổi tên that.
    var monogramIntro = (tenGoi(c.chuRe.ten).charAt(0) || '?') + (tenGoi(c.coDau.ten).charAt(0) || '?');
    var introHtml = khoiIntro({
      tenTren: tenTren, tenDuoi: tenDuoi, monogram: monogramIntro,
      tuPhatNhac: (du.nhac || {}).tuPhat !== false,
    });

    var nhaTruoc = coDauTruoc ? 'NHÀ GÁI' : 'NHÀ TRAI';
    var nhaSau = coDauTruoc ? 'NHÀ TRAI' : 'NHÀ GÁI';
    var nhaTruocD = coDauTruoc ? c.nhaGai : c.nhaTrai;
    var nhaSauD = coDauTruoc ? c.nhaTrai : c.nhaGai;
    s = datText(s, 'HEADLINE27', nhaTruoc + '<br>Ông: ' + boThe(nhaTruocD.ong) + '<br>Bà: ' + boThe(nhaTruocD.ba), log);
    s = datText(s, 'HEADLINE28', nhaSau + '<br>Ông: ' + boThe(nhaSauD.ong) + '<br>Bà: ' + boThe(nhaSauD.ba), log);

    // nhan giao dien dung chung
    s = datText(s, 'HEADLINE25', (du.nhan || {}).lichTrinhTieuDe || 'Timeline', log);
    s = datText(s, 'HEADLINE26', (du.nhan || {}).chuongTrinhTieuDe || 'CHƯƠNG TRÌNH TIỆC CƯỚI', log);
    s = datText(s, 'HEADLINE52', (du.nhan || {}).maiMai || 'Forever', log);

    // 5. loi moi + su kien chinh
    var skChinh = suKienTheo(du, b.suKienChinhMa);
    var ddChinh = du.diaDiem[skChinh.diaDiemMa];
    s = datText(s, 'HEADLINE5', ngayGon(skChinh.ngayDuong), log);
    s = datText(s, 'HEADLINE55', ngayThangChuXepDoc(skChinh.ngayDuong), log);
    s = datText(s, 'HEADLINE13', b.loiMoi, log);
    s = datText(s, 'HEADLINE16', boThe(ddChinh.ten), log);
    s = datText(s, 'HEADLINE17', ddChinh.diaChi, log);
    s = datText(s, 'HEADLINE20', amLich(skChinh.ngayDuong).chuoi, log);
    s = datText(s, 'HEADLINE21', thuTrongTuan(skChinh.ngayDuong), log);
    s = datText(s, 'HEADLINE22', ngayGon(skChinh.ngayDuong), log);
    s = datText(s, 'HEADLINE23', skChinh.gio, log);

    // 6. chuong trinh (4 moc)
    // moc nao chua co ngay/gio that (van la "--:--") thi chi an o gio di, giu nguyen
    // icon + ten moc (BUG: truoc kia an ca khoi lam mat luon ten moc). Khung GROUP18-21
    // cao 52px co dinh (LadiPage absolute) -> an o gio xong phai keo o ten len can giua
    // khung, khong thi chu bi tut xuong dung nguyen cho cu, lech khoi tam voi icon ben
    // canh. Dung minh 1 mo minh cung to hon chut (18px thay vi 14px goc) cho do trong
    // trai vi chi con 1 dong chu dung mot minh trong khung. Nhung khung chi rong 198px
    // co dinh -> ten dai (vd "CHUNG VUI KHAI TIỆC") o 18px se trang 2 dong. Dat font-size
    // 18px LAM MAC DINH (khong !important) roi de script runtime tu do scrollWidth va
    // thu nho dan ve toi thieu 14px cho vua 1 dong (giong kieu tu-co-chu BUG-13 cua
    // "Quy Khach"), sau do tinh lai top de van can giua trong khung 52px.
    var idNhan = ['HEADLINE32', 'HEADLINE34', 'HEADLINE36', 'HEADLINE38'];
    var idGio = ['HEADLINE31', 'HEADLINE33', 'HEADLINE35', 'HEADLINE37'];
    var CO_CHU_TEN_DON = 18;
    var TOP_CAN_GIUA = Math.round(((52 - CO_CHU_TEN_DON * 1.6) / 2) * 10) / 10;
    var gioAn = [];
    var tenCanGiua = [];
    var idNhanCanGiua = [];
    ct.forEach(function (moc, idx) {
      if (idx > 3) return;
      var gio = moc.suKienMa ? suKienTheo(du, moc.suKienMa).gio : (moc.gioRieng || '--:--');
      s = datText(s, idGio[idx], boThe(gio), log);
      s = datText(s, idNhan[idx], boThe(moc.nhan), log);
      if (gio === '--:--') {
        gioAn.push(idGio[idx]);
        idNhanCanGiua.push(idNhan[idx]);
        tenCanGiua.push('#' + idNhan[idx] + '{top: ' + TOP_CAN_GIUA + 'px;}');
        tenCanGiua.push('#' + idNhan[idx] + ' > .ladi-headline{font-size: ' + CO_CHU_TEN_DON + 'px; line-height: 1.6;}');
      }
    });
    if (gioAn.length) log.push('an o gio (chua co ngay/gio that), can giua ten moc: ' + gioAn.join(', '));

    // 7. dresscode
    s = datText(s, 'HEADLINE29', (du.nhan || {}).trangPhucTieuDe || 'Dresscode', log);
    // BUG-22: bo qua mau chua dat ten, neu khong se thua dau "·" o cuoi
    // (vd vua bam "+ Them mau" xong chua kip go ten).
    var mauCoTen = [];
    if (b.dresscode && b.dresscode.bat) {
      mauCoTen = (b.dresscode.mau || []).filter(function (m) { return m && boThe(m.ten); });
    }
    if (mauCoTen.length) {
      var doanMau = mauCoTen.map(function (m) {
        return chamMau(m.hex) + escHtml(boThe(m.ten));
      }).join(' · ');
      s = datHtml(s, 'HEADLINE30', doanMau, log);
      if (b.dresscode.mau.length !== mauCoTen.length) {
        log.push('  !! bo qua ' + (b.dresscode.mau.length - mauCoTen.length) + ' mau dresscode chua dat ten');
      }
    } else {
      s = datText(s, 'HEADLINE30', 'TRANG PHỤC LỊCH SỰ, PHÙ HỢP', log);
    }

    // 8. link ban do
    var MAP_CU = /https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=[^"']*/g;
    // BUG-19: dung ham thay the -> "$&" / "$1" trong URL nguoi dung dan vao khong bi hieu nham
    s = thayChuoi(s, MAP_CU, String(ddChinh.map || '').replace(/["'<>]/g, ''));
    log.push('link chi duong -> ' + ddChinh.ten);

    // 9. dem nguoc (ca DOM lan JSON runtime)
    var skDem = suKienTheo(du, b.demNguocSuKienMa);
    if (!skDem) throw new Error('Không tìm thấy sự kiện đếm ngược "' + b.demNguocSuKienMa + '" cho bản ' + ma);
    kiemNgay(skDem.ngayDuong, skDem.ten);
    var pIso = skDem.ngayDuong.split('-').map(Number);
    var pGio = (skDem.gio || '00:00').split(':').map(Number);
    var ketThuc = Date.UTC(pIso[0], pIso[1] - 1, pIso[2], pGio[0] - 7, pGio[1] || 0, 0);
    s = s.replace(/data-endtime="\d+"/g, 'data-endtime="' + ketThuc + '"')
         .replace(/data-date-end="\d+"/g, 'data-date-end="' + ketThuc + '"')
         .replace(/"bT":\s*\d{13}/g, '"bT":' + ketThuc);
    log.push('dat moc dem nguoc: ' + skDem.ten + ' (' + skDem.ngayDuong + ' ' + skDem.gio + ')');

    // 9b. dan URL Google Apps Script cho RSVP (rong neu chua noi -> chi chan gui, khong gui di dau)
    // Cung URL nay dung de: (a) gui RSVP, (b) khach mo link co ?k= tu do lai ten qua Sheet
    // o che do nen (muc 12 ben duoi) -> phai luu vao 1 bien global de ca 2 doan script
    // doc lap (2 IIFE khac nhau) deu dung toi duoc.
    var rsvpUrl = (du.rsvp && du.rsvp.googleScriptUrl) || '';
    var rsvpUrlSach = rsvpUrl.replace(/["'<>]/g, '');
    s = thayChuoi(s, '__RSVP_GOOGLE_SCRIPT_URL__', rsvpUrlSach);
    s = thayChuoi(s, '<body class="">', '<body class="">' + introHtml +
      '<script>window.THIEP_BAN=' + JSON.stringify(ma) + ';window.THIEP_RSVP_URL=' + JSON.stringify(rsvpUrlSach) + ';</script>');
    log.push('chen man intro phong thu');

    // 10. tieu de + mo ta
    var tenBan = ma === 'nha_trai' ? 'Nhà trai' : 'Nhà gái';
    var tieuDe = coDauTruoc
      ? 'Thiệp cưới ' + boThe(c.coDau.ten) + ' &#38; ' + boThe(c.chuRe.ten)
      : 'Thiệp cưới ' + boThe(c.chuRe.ten) + ' &#38; ' + boThe(c.coDau.ten);
    s = thayChuoi(s, /<title>[^<]*<\/title>/, '<title>' + tieuDe + '</title>');

    // BUG-26: khuon KHONG he co san <meta name="description"> -> lenh replace cu la lenh rong.
    // Phai CHEN the moi. Nhan tien them Open Graph de link dan vao Zalo/Messenger co anh + mo ta.
    var moTa = 'Trân trọng kính mời — ' + tenBan.toLowerCase() + ' — ' +
      thuTrongTuan(skChinh.ngayDuong).toLowerCase() + ' ' + ngayGon(skChinh.ngayDuong) +
      ' lúc ' + boThe(skChinh.gio) + ' tại ' + boThe(ddChinh.ten) + '.';
    var gocWeb = String((du.web && du.web.gocThiep) || 'https://anhnmthe176111.github.io/thiep-cuoi/')
      .replace(/["'<>]/g, '').replace(/\/?$/, '/');
    var anhChiaSe = String(((du.anh || {})[DOI_ANH.IMAGE3[0]] || {}).url || '').replace(/["'<>]/g, '');
    // og:image BAT BUOC la URL tuyet doi: Zalo/Messenger khong giai duong dan tuong doi,
    // de nguyen '../anh/...' thi link dan di se mat anh xem truoc.
    if (anhChiaSe && !/^https?:\/\//i.test(anhChiaSe)) {
      anhChiaSe = gocWeb + anhChiaSe.replace(/^(?:\.\.\/|\.\/|\/)+/, '');
    }
    var linkBan = gocWeb + (ma === 'nha_trai' ? 'nha-trai/' : 'nha-gai/');
    var theMeta = [
      '<meta name="description" content="' + escHtml(moTa) + '">',
      '<meta property="og:type" content="website">',
      '<meta property="og:site_name" content="' + tieuDe + '">',
      '<meta property="og:title" content="' + tieuDe + '">',
      '<meta property="og:description" content="' + escHtml(moTa) + '">',
      '<meta property="og:url" content="' + linkBan + '">',
      '<meta property="og:locale" content="vi_VN">',
      '<meta name="twitter:card" content="summary_large_image">',
      '<meta name="twitter:title" content="' + tieuDe + '">',
      '<meta name="twitter:description" content="' + escHtml(moTa) + '">',
    ];
    if (anhChiaSe) {
      theMeta.splice(6, 0, '<meta property="og:image" content="' + anhChiaSe + '">');
      theMeta.push('<meta name="twitter:image" content="' + anhChiaSe + '">');
    }
    // don sach the do chinh sinh.js chen lan truoc (khi sinh lai tu mot file da sinh)
    s = s.replace(/\n?<!-- meta_chia_se -->[\s\S]*?<!-- \/meta_chia_se -->\n?/, '\n');
    s = thayChuoi(s, '</title>',
      '</title>\n<!-- meta_chia_se -->\n' + theMeta.join('\n') + '\n<!-- /meta_chia_se -->');
    log.push('chen ' + theMeta.length + ' the mo ta / Open Graph');

    // 10b. nhac nen (BUG-07): lay tu du.nhac thay vi hard-code trong khuon
    var nhac = du.nhac || {};
    var nhacUrl = String(nhac.url || '').replace(/["'<>\\]/g, '').trim();
    if (nhacUrl) {
      var reMusicList = /const musicList = \[[\s\S]*?\];/;
      if (reMusicList.test(s)) {
        s = thayChuoi(s, reMusicList, 'const musicList = ' + JSON.stringify([nhacUrl]) + ';');
        log.push('nhac nen -> ' + nhacUrl);
      } else log.push('  !! khong thay khoi musicList trong khuon');
    } else {
      log.push('  !! du.nhac.url de trong — giu nhac mac dinh cua khuon');
    }
    if (nhac.tuPhat === false) {
      var reAuto = /^([ \t]*)addAutoPlayEvents\(\);/m;
      if (reAuto.test(s)) {
        s = thayChuoi(s, reAuto, '  /* tuPhat = false: khong tu bat nhac, cho nguoi xem bam nut */');
        log.push('tat tu phat nhac');
      }
      // nut nhac phai hien thi trang thai "dang tat" ngay tu dau
      s = s.replace(/(<button id="music-toggle"[^>]*?)\s*class="playing"/, function (m, dau) { return dau; });
    }
    // 10c. moc de man intro tu bat nhac dung luc cham mo thu (thay vi cho cu chi
    // dau tien tren toan trang — iOS/Safari can gesture that su, "tap" cua intro an toan hon).
    var reCuoiScriptNhac = /^  updateIcon\(\);\r?\n<\/script>/m;
    if (reCuoiScriptNhac.test(s)) {
      s = thayChuoi(s, reCuoiScriptNhac, '  updateIcon();\n  window.__thiepBatNhac = safePlay;\n</script>');
      log.push('gan moc __thiepBatNhac cho man intro');
    } else log.push('  !! khong thay cuoi script nhac de gan moc __thiepBatNhac');

    // 11. css rieng: chuan hoa khung anh da doi + an bot khoi
    var cropRules = Object.keys(anhBan).map(function (id) {
      return '#' + id + ' > .ladi-image > .ladi-image-background{width:100% !important; height:100% !important; top:0 !important; left:0 !important;' +
        'background-size:cover !important; background-position:' + anhBan[id][1] + ' !important;}';
    }).join('\n');
    var css = [
      '', '<style id="style_ban_' + ma + '" type="text/css">',
      cropRules, '',
      AN_KHOI.concat(gioAn).map(function (id) { return '#' + id; }).join(', ') + '{display:none !important;}',
      tenCanGiua.join('\n'), '',
      BIA_CSS,
      '</style>', '',
    ].join('\n');
    s = s.replace(/\n?<style id="style_ban_[\s\S]*?<\/style>\n?/, '');
    s = s.replace('</head>', css + '</head>');

    // 12. hien ten khach vao khung "Quy Khach" luc chay.
    // Ten NAM SAN trong link (?n=<base64url cua ten>) -> hien NGAY LAP TUC, khong cho
    // mang. Sau do, neu link co ?k=<ma khach> VA da noi Google Sheet, doi chieu lai o
    // che do NEN (khong chan giao dien): admin co the da sua ten hoac xoa khach sau khi
    // link da gui di, luc do ten tren Sheet moi la dung. Loi mang / khong noi Sheet /
    // het gio cho -> GIU NGUYEN ten da hien tu link, khong bao loi cho khach thay.
    var khachJs = [
      '<script>(function(){',
      '  var qs = new URLSearchParams(location.search);',
      '  var ma = qs.get("k");',
      '  var nRaw = qs.get("n");',
      '  var SEL = ["#HEADLINE15 > .ladi-headline", "#thiep-intro-khach"];',
      '  function b64UrlDecodeUtf8(s){',
      '    s = s.replace(/-/g, "+").replace(/_/g, "/");',
      '    while (s.length % 4) s += "=";',
      '    return decodeURIComponent(escape(atob(s)));',
      '  }',
      '  function hienTen(ten){',
      '    // BUG-13: ten dai hon khung -> thu nho dan cho vua 1 dong. Ap dung cho ca',
      '    // khung "Quy Khach" (HEADLINE15) lan ten khach o man intro phong thu (BUG-29).',
      '    SEL.forEach(function (sel) {',
      '      var el = document.querySelector(sel);',
      '      if (!el) return;',
      '      el.textContent = ten;',
      '      el.style.fontSize = "";',
      '      el.style.whiteSpace = "";',
      '      el.style.lineHeight = "";',
      '      try {',
      '        el.style.whiteSpace = "nowrap";',
      '        var co = parseFloat(getComputedStyle(el).fontSize) || 28;',
      '        while (el.scrollWidth > el.clientWidth && co > 13) { co -= 1; el.style.fontSize = co + "px"; }',
      '        if (el.scrollWidth > el.clientWidth) { el.style.whiteSpace = "normal"; el.style.lineHeight = "1.2"; }',
      '      } catch (e) {}',
      '    });',
      '  }',
      '  var elGoc = document.querySelector(SEL[0]);',
      '  var tenMacDinh = (elGoc && elGoc.textContent) || "Quý Khách"; // chu san trong khuon',
      '  var tenTuLink = "";',
      '  if (nRaw) { try { tenTuLink = b64UrlDecodeUtf8(nRaw); } catch (e) {} }',
      '  if (tenTuLink) hienTen(tenTuLink);',
      '  if (!ma || !window.THIEP_RSVP_URL) return; // khong co gi de doi chieu them',
      '  var dieuKhien = (typeof AbortController !== "undefined") ? new AbortController() : null;',
      '  var hetGio = setTimeout(function () { if (dieuKhien) dieuKhien.abort(); }, 8000);',
      '  fetch(window.THIEP_RSVP_URL + "?action=ten&k=" + encodeURIComponent(ma), {',
      '    signal: dieuKhien ? dieuKhien.signal : undefined,',
      '  })',
      '    .then(function (r) { return r.ok ? r.json() : null; })',
      '    .then(function (kq) {',
      '      clearTimeout(hetGio);',
      '      if (!kq) return; // loi may chu -> giu nguyen ten tu link',
      '      if (!kq.ok) {',
      '        // Sheet tra loi RO RANG la khong co ma nay (khach da bi xoa) -> ve lai "Quy Khach".',
      '        // (Loi mang thi khong vao day -> van giu ten tu link.)',
      '        console.warn("[thiep] Khong tim thay khach co ma \\"" + ma + "\\" tren Sheet.");',
      '        if (tenTuLink) hienTen(tenMacDinh);',
      '        return;',
      '      }',
      '      if (kq.ban && window.THIEP_BAN && kq.ban !== window.THIEP_BAN) {',
      '        console.warn("[thiep] Khach \\"" + kq.hienThi + "\\" thuoc ban " + kq.ban + " nhung dang mo ban " + window.THIEP_BAN + ".");',
      '      }',
      '      if (kq.hienThi && kq.hienThi !== tenTuLink) hienTen(kq.hienThi); // ten tren Sheet moi hon -> cap nhat lai',
      '    })',
      '    .catch(function (e) { clearTimeout(hetGio); console.warn("[thiep] Khong doi chieu duoc ten khach:", e); });',
      '})();</script>',
    ].join('\n');

    // 12b. moc chuong trinh dung 1 minh (khong gio): thu nho dan chu tu 18px neu ten
    // dai qua khung 198px (vd "CHUNG VUI KHAI TIỆC"), roi can lai giua khung 52px theo
    // co chu that su sau khi thu nho — cung logic BUG-13 o tren, ap cho tung o mot.
    // KHONG dung scrollWidth/clientWidth: 2 gia tri nay la so nguyen da lam tron, nen
    // phan tram tran duoi 0.5px (vd "CHUNG VUI KHAI TIỆC" o 18px tran ~0.06px) bi lam
    // tron mat, vong lap tuong khong tran nen khong thu nho (tester bat duoc bug nay).
    // Dung Range.getBoundingClientRect() de do be rong chu that (subpixel), so voi be
    // rong khung that (wrap.clientWidth) tru them 1px du phong sai so hinting/font.
    var canGiuaJs = '';
    if (idNhanCanGiua.length) {
      canGiuaJs = [
        '<script>(function(){',
        '  var pham = document.createRange();',
        '  function rongChu(el) { pham.selectNodeContents(el); return pham.getBoundingClientRect().width; }',
        '  [' + idNhanCanGiua.map(function (id) { return JSON.stringify(id); }).join(',') + '].forEach(function(id){',
        '    var wrap = document.getElementById(id);',
        '    var el = wrap && wrap.querySelector(".ladi-headline");',
        '    if(!el) return;',
        '    try {',
        '      el.style.whiteSpace = "nowrap";',
        '      var co = ' + CO_CHU_TEN_DON + ';',
        '      var rongKhung = wrap.clientWidth - 1;',
        '      while (rongChu(el) > rongKhung && co > 13) { co -= 1; el.style.fontSize = co + "px"; }',
        '      wrap.style.top = ((52 - co * 1.6) / 2) + "px";',
        '    } catch (e) {}',
        '  });',
        '})();</script>',
      ].join('\n');
      log.push('tu-co-chu ten moc dung 1 minh: ' + idNhanCanGiua.join(', '));
    }
    s = thayChuoi(s, '</body>', khachJs + canGiuaJs + '</body>');

    // 13. ban XEM TRUOC trong admin: go nhac + go script form cua LadiPage (BUG-05, BUG-21).
    // Chi ap dung cho preview — file dang len link that KHONG bi dong toi.
    if (opts.xemTruoc) {
      // BUG-29: man intro che kin man hinh + khoa cuon -> vo dung trong khung preview
      // cua admin (khong the cham de mo). Bo han, giu nguyen thiep chinh phia sau.
      r = catTheDiv(s, '<div id="thiep-intro"');
      s = r.s; log.push(r.ok ? 'go man intro (ban xem truoc)' : '  !! khong thay #thiep-intro de go');
      s = s.replace(/<button id="music-toggle"[\s\S]*?<\/button>/, '');
      s = s.replace(/<script>\s*const musicList[\s\S]*?<\/script>/, '');
      // Go the <script> tinh...
      s = s.replace(/<script[^>]*ladipage\.formdata\.min\.js[^>]*>\s*<\/script>/g, '');
      // ...nhung THU THAT SU ngan no chay la co nay: runtime ladipagev3.min.js doc
      // `runtime.formdata` roi TU NAP ladipage.formdata.min.js. Go the script khong du.
      s = s.replace(/(runtime\.formdata\s*=\s*)true/g, function (m, dau) { return dau + 'false'; });
      // chan not truong hop runtime tu chen the script vao <head>
      var chanFormdata = [
        '<script>(function(){',
        '  try {',
        '    var them = document.head.appendChild.bind(document.head);',
        '    document.head.appendChild = function(n){',
        '      if (n && n.tagName === "SCRIPT" && /ladipage\\.formdata/.test(n.src || "")) return n;',
        '      return them(n);',
        '    };',
        '  } catch(e) {}',
        '})();</script>',
      ].join('\n');
      s = thayChuoi(s, '</head>', chanFormdata + '</head>');
      var chanNhac = [
        '<script>window.__XEM_TRUOC__=1;(function(){',
        '  try {',
        '    var P = Audio.prototype.play;',
        '    Audio.prototype.play = function(){ return Promise.reject(new Error("xem truoc: da tat nhac")); };',
        '    if (window.HTMLMediaElement) HTMLMediaElement.prototype.play = Audio.prototype.play;',
        '  } catch(e) {}',
        '})();</script>',
      ].join('\n');
      s = thayChuoi(s, '</head>', chanNhac + '</head>');
      log.push('ban xem truoc: da go nhac + script form LadiPage');
    }

    return { html: s, log: log };
  }

  return { sinh: sinh, kiemNgay: kiemNgay, kiemGio: kiemGio, boThe: boThe, amLich: amLich, thuTrongTuan: thuTrongTuan, ngayGon: ngayGon, ngaySlash2so: ngaySlash2so, canChiNam: canChiNam, ICON: ICON, DOI_ANH: DOI_ANH };
});
