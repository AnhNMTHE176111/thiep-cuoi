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

  function amLich(ngayDuongISO) {
    var p = ngayDuongISO.split('-');
    var yy = +p[0], mm = +p[1], dd = +p[2];
    var al = convertSolar2Lunar(dd, mm, yy, 7);
    return {
      ngay: al.day, thang: al.month, nam: al.year,
      chuoi: '( Tức ngày ' + String(al.day).padStart(2, '0') + ' tháng ' + String(al.month).padStart(2, '0') + ' năm ' + canChiNam(al.year) + ' )',
    };
  }
  function thuTrongTuan(ngayDuongISO) {
    var p = ngayDuongISO.split('-').map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    return THU_TRONG_TUAN[d.getUTCDay()];
  }
  function ngayGon(iso) { // 2026-10-29 -> "29 . 10 . 2026"
    var p = iso.split('-');
    return p[2] + ' . ' + p[1] + ' . ' + p[0];
  }
  function ngaySlash2so(iso) { // 2026-10-29 -> "29 / 10 / 26"
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
  function datText(s, id, html, log) {
    var re = new RegExp('(id="' + id + '"[^>]*>\\s*<([a-z0-9]+)[^>]*>)([\\s\\S]*?)(</\\2>)');
    if (!re.test(s)) { if (log) log.push('  !! khong thay ' + id); return s; }
    return s.replace(re, function (m, mo, tag, cu, dong) { return mo + html + dong; });
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
  function sinh(goc, du, ma) {
    var log = [];
    var b = du.ban[ma];
    var s = goc;

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
    var tenGoi = function (ten) { var p = ten.trim().split(/\s+/); return p[p.length - 1]; };
    s = datText(s, 'HEADLINE4', tenGoi(tenTren).toUpperCase() + '<br><br>' + tenGoi(tenDuoi).toUpperCase(), log);
    s = datText(s, 'HEADLINE6', tenTren, log);
    s = datText(s, 'HEADLINE7', tenDuoi, log);
    s = datText(s, 'HEADLINE48', tenTren.toUpperCase(), log);
    s = datText(s, 'HEADLINE51', (coDauTruoc ? c.coDau.thuBac : c.chuRe.thuBac), log);
    s = datText(s, 'HEADLINE64', tenDuoi.toUpperCase(), log);
    s = datText(s, 'HEADLINE65', (coDauTruoc ? c.chuRe.thuBac : c.coDau.thuBac), log);

    var nhaTruoc = coDauTruoc ? 'NHÀ GÁI' : 'NHÀ TRAI';
    var nhaSau = coDauTruoc ? 'NHÀ TRAI' : 'NHÀ GÁI';
    var nhaTruocD = coDauTruoc ? c.nhaGai : c.nhaTrai;
    var nhaSauD = coDauTruoc ? c.nhaTrai : c.nhaGai;
    s = datText(s, 'HEADLINE27', nhaTruoc + '<br>Ông: ' + nhaTruocD.ong + '<br>Bà: ' + nhaTruocD.ba, log);
    s = datText(s, 'HEADLINE28', nhaSau + '<br>Ông: ' + nhaSauD.ong + '<br>Bà: ' + nhaSauD.ba, log);

    // nhan giao dien dung chung
    s = datText(s, 'HEADLINE26', (du.nhan || {}).chuongTrinhTieuDe || 'CHƯƠNG TRÌNH', log);

    // 5. loi moi + su kien chinh
    var skChinh = suKienTheo(du, b.suKienChinhMa);
    var ddChinh = du.diaDiem[skChinh.diaDiemMa];
    s = datText(s, 'HEADLINE5', ngayGon(skChinh.ngayDuong), log);
    s = datText(s, 'HEADLINE55', ngaySlash2so(skChinh.ngayDuong), log);
    s = datText(s, 'HEADLINE13', b.loiMoi, log);
    s = datText(s, 'HEADLINE16', ddChinh.ten, log);
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
      s = datText(s, idGio[idx], gio, log);
      s = datText(s, idNhan[idx], moc.nhan, log);
    });

    // 7. dresscode
    if (b.dresscode && b.dresscode.bat && b.dresscode.mau.length) {
      s = datText(s, 'HEADLINE30', b.dresscode.mau.map(function (m) { return m.ten; }).join(' · '), log);
    } else {
      s = datText(s, 'HEADLINE30', 'TRANG PHỤC LỊCH SỰ, PHÙ HỢP', log);
    }

    // 8. link ban do
    var MAP_CU = /https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=[^"']*/g;
    s = s.replace(MAP_CU, ddChinh.map);
    log.push('link chi duong -> ' + ddChinh.ten);

    // 9. dem nguoc (ca DOM lan JSON runtime)
    var skDem = suKienTheo(du, b.demNguocSuKienMa);
    var pIso = skDem.ngayDuong.split('-').map(Number);
    var pGio = (skDem.gio || '00:00').split(':').map(Number);
    var ketThuc = Date.UTC(pIso[0], pIso[1] - 1, pIso[2], pGio[0] - 7, pGio[1] || 0, 0);
    s = s.replace(/data-endtime="\d+"/g, 'data-endtime="' + ketThuc + '"')
         .replace(/data-date-end="\d+"/g, 'data-date-end="' + ketThuc + '"')
         .replace(/"bT":\s*\d{13}/g, '"bT":' + ketThuc);
    log.push('dat moc dem nguoc: ' + skDem.ten + ' (' + skDem.ngayDuong + ' ' + skDem.gio + ')');

    // 9b. dan URL Google Apps Script cho RSVP (rong neu chua noi -> chi chan gui, khong gui di dau)
    var rsvpUrl = (du.rsvp && du.rsvp.googleScriptUrl) || '';
    s = s.replace('__RSVP_GOOGLE_SCRIPT_URL__', rsvpUrl.replace(/"/g, ''));
    s = s.replace('<body class="">', '<body class=""><script>window.THIEP_BAN=' + JSON.stringify(ma) + ';</script>');

    // 10. tieu de + mo ta
    var tenBan = ma === 'nha_trai' ? 'Nhà trai' : 'Nhà gái';
    var tieuDe = coDauTruoc
      ? 'Thiệp cưới ' + c.coDau.ten + ' &#38; ' + c.chuRe.ten
      : 'Thiệp cưới ' + c.chuRe.ten + ' &#38; ' + c.coDau.ten;
    s = s.replace(/<title>[^<]*<\/title>/, '<title>' + tieuDe + '</title>');
    s = s.replace(/(<meta name="description" content=")[^"]*(")/, '$1Thiệp cưới — bản ' + tenBan.toLowerCase() + ' — ' + ngayGon(skChinh.ngayDuong) + '$2');

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

    // 12. gan ma khach vao khung "Quy Khach" luc chay (khong bake san ten khach vao HTML tinh)
    var khachJs = [
      '<script>(function(){',
      '  var ma = new URLSearchParams(location.search).get("k");',
      '  if(!ma) return;',
      '  fetch("../khach.json").then(function(r){return r.ok?r.json():[]}).then(function(ds){',
      '    var kh = (ds||[]).find(function(x){return x.ma===ma});',
      '    if(!kh) return;',
      '    var el = document.querySelector("#HEADLINE15 > .ladi-headline");',
      '    if(el) el.textContent = kh.hienThi;',
      '  }).catch(function(){});',
      '})();</script>',
    ].join('\n');
    s = s.replace('</body>', khachJs + '</body>');

    return { html: s, log: log };
  }

  return { sinh: sinh, amLich: amLich, thuTrongTuan: thuTrongTuan, ngayGon: ngayGon, ngaySlash2so: ngaySlash2so, canChiNam: canChiNam, ICON: ICON, DOI_ANH: DOI_ANH };
});
