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
    IMAGE3:  ['A_codau', '50% 50%'],
    IMAGE4:  ['D_nhan',  '48% 44%'],
    IMAGE20: ['B_tay',   '52% 42%'],
    IMAGE42: ['C_bong',  '40% 33%'],
    IMAGE60: ['A_codau', '50% 40%'],
    IMAGE61: ['C_bong',  '38% 26%'],
    IMAGE77: ['D_nhan',  '48% 44%'],
  };
  var AN_KHOI = ['GROUP2', 'IMAGE6'];

  var ICON = {
    nhan:     'https://w.ladicdn.com/691804d3a89f3900120ca482/nhan-20260828070333-qcocp.png',
    may_anh:  'https://w.ladicdn.com/691804d3a89f3900120ca482/may-anh-20260828070333-ujfdt.png',
    khai_tiec:'https://w.ladicdn.com/691804d3a89f3900120ca482/khai-tiec-20260828070333-iuufx.png',
    hoa_cuoi: 'https://w.ladicdn.com/691804d3a89f3900120ca482/hoa-cuoi-20260828070333-r95ma.png',
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
  //   { khach: [...] }    -> nhung thang danh sach khach vao HTML (khong can fetch khach.json)
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
    Object.keys(DOI_ANH).forEach(function (id) {
      var khoa = DOI_ANH[id][0];
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

    var nhaTruoc = coDauTruoc ? 'NHÀ GÁI' : 'NHÀ TRAI';
    var nhaSau = coDauTruoc ? 'NHÀ TRAI' : 'NHÀ GÁI';
    var nhaTruocD = coDauTruoc ? c.nhaGai : c.nhaTrai;
    var nhaSauD = coDauTruoc ? c.nhaTrai : c.nhaGai;
    s = datText(s, 'HEADLINE27', nhaTruoc + '<br>Ông: ' + boThe(nhaTruocD.ong) + '<br>Bà: ' + boThe(nhaTruocD.ba), log);
    s = datText(s, 'HEADLINE28', nhaSau + '<br>Ông: ' + boThe(nhaSauD.ong) + '<br>Bà: ' + boThe(nhaSauD.ba), log);

    // nhan giao dien dung chung
    s = datText(s, 'HEADLINE26', (du.nhan || {}).chuongTrinhTieuDe || 'CHƯƠNG TRÌNH', log);

    // 5. loi moi + su kien chinh
    var skChinh = suKienTheo(du, b.suKienChinhMa);
    var ddChinh = du.diaDiem[skChinh.diaDiemMa];
    s = datText(s, 'HEADLINE5', ngayGon(skChinh.ngayDuong), log);
    s = datText(s, 'HEADLINE55', ngaySlash2so(skChinh.ngayDuong), log);
    s = datText(s, 'HEADLINE13', b.loiMoi, log);
    s = datText(s, 'HEADLINE16', boThe(ddChinh.ten), log);
    s = datText(s, 'HEADLINE17', ddChinh.diaChi, log);
    s = datText(s, 'HEADLINE20', amLich(skChinh.ngayDuong).chuoi, log);
    s = datText(s, 'HEADLINE21', thuTrongTuan(skChinh.ngayDuong), log);
    s = datText(s, 'HEADLINE22', ngayGon(skChinh.ngayDuong), log);
    s = datText(s, 'HEADLINE23', skChinh.gio, log);

    // 6. chuong trinh (4 moc)
    var idNhan = ['HEADLINE32', 'HEADLINE34', 'HEADLINE36', 'HEADLINE38'];
    var idGio = ['HEADLINE31', 'HEADLINE33', 'HEADLINE35', 'HEADLINE37'];
    ct.forEach(function (moc, idx) {
      if (idx > 3) return;
      var gio = moc.suKienMa ? suKienTheo(du, moc.suKienMa).gio : (moc.gioRieng || '--:--');
      s = datText(s, idGio[idx], boThe(gio), log);
      s = datText(s, idNhan[idx], boThe(moc.nhan), log);
    });

    // 7. dresscode
    // BUG-22: bo qua mau chua dat ten, neu khong se thua dau "·" o cuoi
    // (vd vua bam "+ Them mau" xong chua kip go ten).
    var tenMau = [];
    if (b.dresscode && b.dresscode.bat) {
      tenMau = (b.dresscode.mau || [])
        .map(function (m) { return boThe(m && m.ten); })
        .filter(function (t) { return t; });
    }
    if (tenMau.length) {
      s = datText(s, 'HEADLINE30', tenMau.join(' · '), log);
      if (b.dresscode.mau.length !== tenMau.length) {
        log.push('  !! bo qua ' + (b.dresscode.mau.length - tenMau.length) + ' mau dresscode chua dat ten');
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
    var rsvpUrl = (du.rsvp && du.rsvp.googleScriptUrl) || '';
    s = thayChuoi(s, '__RSVP_GOOGLE_SCRIPT_URL__', rsvpUrl.replace(/["'<>]/g, ''));
    s = thayChuoi(s, '<body class="">', '<body class=""><script>window.THIEP_BAN=' + JSON.stringify(ma) + ';</script>');

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
    var anhChiaSe = String(((du.anh || {}).A_codau || {}).url || '').replace(/["'<>]/g, '');
    var linkBan = String((du.web && du.web.gocThiep) || 'https://anhnmthe176111.github.io/thiep-cuoi/')
      .replace(/["'<>]/g, '').replace(/\/?$/, '/') + (ma === 'nha_trai' ? 'nha-trai/' : 'nha-gai/');
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

    // 11. css rieng: chuan hoa khung anh da doi + an bot khoi
    var cropRules = Object.keys(DOI_ANH).map(function (id) {
      return '#' + id + ' > .ladi-image > .ladi-image-background{width:100% !important; height:100% !important; top:0 !important; left:0 !important;' +
        'background-size:cover !important; background-position:' + DOI_ANH[id][1] + ' !important;}';
    }).join('\n');
    var css = [
      '', '<style id="style_ban_' + ma + '" type="text/css">',
      cropRules, '',
      AN_KHOI.map(function (id) { return '#' + id; }).join(', ') + '{display:none !important;}',
      '</style>', '',
    ].join('\n');
    s = s.replace(/\n?<style id="style_ban_[\s\S]*?<\/style>\n?/, '');
    s = s.replace('</head>', css + '</head>');

    // 12. gan ma khach vao khung "Quy Khach" luc chay.
    // Danh sach khach duoc NHUNG THANG vao HTML khi sinh (opts.khach hoac du.khach) —
    // khong phu thuoc duong dan / cache cua khach.json (BUG-06). Neu khong nhung thi
    // van fetch khach.json nhu cu (co cache-busting) de khong lam vo luong cu.
    var dsKhach = opts.khach || du.khach || null;
    var nhungKhach = '';
    if (dsKhach && dsKhach.length) {
      var gon = dsKhach.map(function (k) {
        return { ma: String(k.ma || ''), hienThi: String(k.hienThi || ''), ban: String(k.ban || '') };
      });
      // </script> trong du lieu se lam vo the script -> chen them dau \
      nhungKhach = '<script>window.__KHACH_THIEP__=' +
        JSON.stringify(gon).replace(/<\//g, '<\\/') + ';</script>\n';
      log.push('nhung ' + gon.length + ' khach vao HTML');
    }
    var khachJs = nhungKhach + [
      '<script>(function(){',
      '  var ma = new URLSearchParams(location.search).get("k");',
      '  if(!ma) return;',
      '  function apDung(ds){',
      '    ds = ds || [];',
      '    var kh = null;',
      '    for (var i=0;i<ds.length;i++) if (ds[i] && ds[i].ma === ma) { kh = ds[i]; break; }',
      '    if(!kh){',
      '      console.warn("[thiep] Khong tim thay khach co ma \\"" + ma + "\\" trong danh sach (" + ds.length +',
      '        " khach). Van giu \\"Quy Khach\\". Nhieu kha nang khach nay chua duoc bam Dang len link that.");',
      '      return;',
      '    }',
      '    if (kh.ban && window.THIEP_BAN && kh.ban !== window.THIEP_BAN) {',
      '      console.warn("[thiep] Khach \\"" + kh.hienThi + "\\" thuoc ban " + kh.ban + " nhung dang mo ban " + window.THIEP_BAN + ".");',
      '    }',
      '    var el = document.querySelector("#HEADLINE15 > .ladi-headline");',
      '    if(!el) return;',
      '    el.textContent = kh.hienThi;',
      '    // ten dai hon khung 279px -> thu nho dan cho vua 1 dong (BUG-13)',
      '    try {',
      '      el.style.whiteSpace = "nowrap";',
      '      var co = 28;',
      '      while (el.scrollWidth > el.clientWidth && co > 13) { co -= 1; el.style.fontSize = co + "px"; }',
      '      if (el.scrollWidth > el.clientWidth) { el.style.whiteSpace = "normal"; el.style.lineHeight = "1.2"; }',
      '    } catch (e) {}',
      '  }',
      '  if (window.__KHACH_THIEP__) { apDung(window.__KHACH_THIEP__); return; }',
      '  fetch("../khach.json?v=" + Date.now(), {cache:"no-store"})',
      '    .then(function(r){return r.ok?r.json():[]})',
      '    .then(apDung)',
      '    .catch(function(e){ console.warn("[thiep] Khong tai duoc khach.json:", e); });',
      '})();</script>',
    ].join('\n');
    s = thayChuoi(s, '</body>', khachJs + '</body>');

    // 13. ban XEM TRUOC trong admin: go nhac + go script form cua LadiPage (BUG-05, BUG-21).
    // Chi ap dung cho preview — file dang len link that KHONG bi dong toi.
    if (opts.xemTruoc) {
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
