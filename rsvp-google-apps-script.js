/**
 * BACKEND CHO THIỆP CƯỚI (Google Apps Script)
 * ============================================
 * File này KHÔNG chạy trong dự án. Đây là mã nguồn để dán vào Google Apps Script.
 * Nó làm 2 việc:
 *   1. Nhận phản hồi RSVP từ thiệp -> ghi vào tab "Phản hồi".
 *   2. Lưu danh sách khách mời (thêm/sửa/xoá từ trang admin) -> tab "Khách".
 *      Thiệp cũng gọi tới đây để tra tên khách theo mã (?action=ten&k=...).
 *
 * KHÔNG có mật khẩu/khoá bảo vệ — ai có URL đều gọi được. Chấp nhận được vì đây là
 * thiệp cưới nội bộ, không có dữ liệu nhạy cảm. Nếu sau này cần khoá lại thì thêm
 * kiểm tra "key" ở đầu doGet/doPost.
 *
 * SỬA TAY TRONG SHEET: được phép thêm dòng, sửa tên, đổi cột "Thiệp" (Nhà trai / Nhà gái),
 * thêm cột ghi chú riêng ở bên phải. Dòng mới để trống cột "Mã" và "Tên hiển thị" thì lần
 * tới trang admin tải danh sách, script tự điền. KHÔNG sửa "Mã" của khách đã gửi link.
 *
 * CÁCH DÙNG (làm 1 lần, khoảng 5 phút):
 *
 *  1. Vào https://sheets.new -> tạo một Google Sheet mới, đặt tên "Thiệp cưới - Dữ liệu".
 *  2. Trên thanh menu: Tiện ích mở rộng (Extensions) -> Apps Script.
 *  3. Xoá hết code mẫu đang có, dán TOÀN BỘ nội dung file này vào.
 *  4. Bấm Lưu (biểu tượng đĩa mềm).
 *  5. Bấm "Triển khai" (Deploy) -> "Bản triển khai mới" (New deployment).
 *       - Bấm biểu tượng bánh răng cạnh "Chọn loại" -> chọn "Ứng dụng web" (Web app)
 *       - Thực thi bằng (Execute as)      : Tôi (Me)
 *       - Người có quyền truy cập (Who has access): BẤT KỲ AI (Anyone)   <-- QUAN TRỌNG
 *       - Bấm "Triển khai" (Deploy)
 *  6. Google sẽ hỏi cấp quyền -> Cho phép (Authorize). Nếu hiện cảnh báo
 *     "Google hasn't verified this app": bấm "Nâng cao" (Advanced) -> "Đi tới ... (không an toàn)".
 *     Đây là script của chính bạn nên an toàn.
 *  7. Copy "URL ứng dụng web" (dạng https://script.google.com/macros/s/..../exec)
 *  8. Mở trang admin của thiệp -> cụm "Cài đặt" -> dán URL đó vào ô
 *     "URL Google Apps Script" -> bấm "Kiểm tra kết nối".
 *
 * LƯU Ý: mỗi lần sửa code này phải "Triển khai" lại (Deploy -> Manage deployments ->
 * biểu tượng bút chì -> Version: New version -> Deploy) thì thay đổi mới có hiệu lực.
 */

var TEN_TRANG_PHAN_HOI = 'Phản hồi';
var TEN_TRANG_KHACH = 'Khách';

var COT_PHAN_HOI = [
  { khoa: 'thoiGianVN', nhan: 'Thời gian' },
  { khoa: 'ban', nhan: 'Thiệp' },
  { khoa: 'maKhach', nhan: 'Mã khách' },
  { khoa: 'name', nhan: 'Tên khách' },
  { khoa: 'form_item8', nhan: 'Có tham dự?' },
  { khoa: 'form_item9', nhan: 'Đi cùng ai' },
  { khoa: 'form_item10', nhan: 'Khách của ai' },
  { khoa: 'message', nhan: 'Lời chúc' },
];

// Thứ tự cột trong tab "Khách". "ma" LUÔN là cột A (tra theo cột 1).
var COT_KHACH = [
  { khoa: 'ma', nhan: 'Mã' },
  { khoa: 'danhXung', nhan: 'Danh xưng' },
  { khoa: 'ten', nhan: 'Tên' },
  { khoa: 'hienThi', nhan: 'Tên hiển thị' },
  { khoa: 'ban', nhan: 'Thiệp' },
  { khoa: 'daGui', nhan: 'Đã gửi' },
  { khoa: 'taoLuc', nhan: 'Tạo lúc' },
  { khoa: 'daPhanHoi', nhan: 'Đã phản hồi' },
  { khoa: 'tinhTrangDen', nhan: 'Có tham dự?' },
  { khoa: 'loiChuc', nhan: 'Lời chúc' },
];
var SO_COT = COT_KHACH.length;
var VI_TRI = {};
COT_KHACH.forEach(function (c, i) { VI_TRI[c.khoa] = i; });

// Moi thao tac doc/ghi deu chay trong DUNG 1 khoa, lay o diem vao (doGet/doPost).
// Cac ham ben trong KHONG tu xin khoa lan nua (tranh khoa long nhau -> treo roi loi).
function voiKhoa_(fn) {
  var khoa = LockService.getScriptLock();
  khoa.waitLock(20000);
  try { return fn(); } finally { khoa.releaseLock(); }
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p.action === 'ten' && p.k) {
      // thiep goi moi lan khach mo link -> chi DOC, khong can khoa
      return ketQua_(traKhachTheoMa_(String(p.k)));
    }
    if (p.action === 'ds') {
      return ketQua_(voiKhoa_(function () {
        chuanHoaBang_(layTrangKhach_());
        return { ok: true, khach: docKhach_() };
      }));
    }
    return ketQua_({ ok: true, thongBao: 'Endpoint đang hoạt động.' });
  } catch (loi) {
    console.error(loi);
    return ketQua_({ ok: false, loi: String(loi) });
  }
}

function doPost(e) {
  try {
    var du = {};
    if (e && e.postData && e.postData.contents) {
      du = JSON.parse(e.postData.contents);
    }
    return ketQua_(voiKhoa_(function () {
      if (du.action === 'luu') return { ok: true, khach: luuKhach_(du.khach || []) };
      if (du.action === 'xoa') { xoaKhach_(String(du.ma || '')); return { ok: true }; }
      // Khong co "action" -> phan hoi RSVP tu form thiep (giu tuong thich nguoc)
      ghiPhanHoi_(du);
      return { ok: true };
    }));
  } catch (loi) {
    // Van tra ve 200 de trang thiep khong bao loi cho khach; ghi lai de minh tu xem
    console.error(loi);
    return ketQua_({ ok: false, loi: String(loi) });
  }
}

// ---------- Tien ich ----------
// Sheet hien chu de doc ("Nha trai"/"Nha gai"), admin + thiep dung ma ky thuat.
function maBan_(v) {
  var s = String(v == null ? '' : v).toLowerCase();
  if (/gai|gái/.test(s)) return 'nha_gai';
  if (/trai/.test(s)) return 'nha_trai';
  return '';
}
function nhanBan_(ma) {
  return ma === 'nha_gai' ? 'Nhà gái' : ma === 'nha_trai' ? 'Nhà trai' : '';
}
function laDung_(v) {
  return v === true || String(v).toUpperCase() === 'TRUE';
}
function gioVN_(d) {
  return Utilities.formatDate(d || new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm');
}
// Ma LUON bat dau bang chu cai -> Google Sheet khong bao gio tu doi thanh so
// (vd "012345" -> 12345, "12e456" -> 1.2E+460). Cot A cung duoc dat dinh dang van ban.
function taoMaKhach_(daCo) {
  var CHU = 'abcdefghijkmnpqrstuvwxyz';
  var s;
  do {
    s = CHU.charAt(Math.floor(Math.random() * CHU.length)) + Math.random().toString(36).slice(2, 7);
  } while (s.length < 6 || daCo[s]);
  return s;
}

// ---------- Phan hoi RSVP ----------
function ghiPhanHoi_(du) {
  var trang = layTrangPhanHoi_();

  // Doi ISO -> gio Viet Nam cho de doc
  var thoiGian = du.thoiGian ? new Date(du.thoiGian) : new Date();
  du.thoiGianVN = Utilities.formatDate(thoiGian, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss');
  du.ban = nhanBan_(du.ban) || du.ban || '';

  trang.appendRow(COT_PHAN_HOI.map(function (c) { return du[c.khoa] || ''; }));

  // Neu phan hoi gan voi 1 khach cu the -> cap nhat luon trang thai tren tab Khach
  if (du.maKhach) {
    capNhatDong_(String(du.maKhach), {
      daPhanHoi: true,
      tinhTrangDen: du.form_item8 || '',
      loiChuc: du.message || '',
    });
  }
}

function layTrangPhanHoi_() {
  var bang = SpreadsheetApp.getActiveSpreadsheet();
  var trang = bang.getSheetByName(TEN_TRANG_PHAN_HOI);
  if (!trang) trang = bang.insertSheet(TEN_TRANG_PHAN_HOI);
  if (trang.getLastRow() === 0) {
    trang.appendRow(COT_PHAN_HOI.map(function (c) { return c.nhan; }));
    var tieuDe = trang.getRange(1, 1, 1, COT_PHAN_HOI.length);
    tieuDe.setFontWeight('bold').setBackground('#8E7C69').setFontColor('#ffffff');
    trang.setFrozenRows(1);
    trang.setColumnWidth(1, 150); // Thoi gian
    trang.setColumnWidth(4, 160); // Ten khach
    trang.setColumnWidth(8, 400); // Loi chuc
  }
  return trang;
}

// ---------- Danh sach khach ----------
function layTrangKhach_() {
  var bang = SpreadsheetApp.getActiveSpreadsheet();
  var trang = bang.getSheetByName(TEN_TRANG_KHACH);
  if (!trang) trang = bang.insertSheet(TEN_TRANG_KHACH);
  if (trang.getLastRow() === 0) {
    trang.appendRow(COT_KHACH.map(function (c) { return c.nhan; }));
    var tieuDe = trang.getRange(1, 1, 1, SO_COT);
    tieuDe.setFontWeight('bold').setBackground('#8E7C69').setFontColor('#ffffff');
    trang.setFrozenRows(1);
    trang.setColumnWidth(3, 160); // Ten
    trang.setColumnWidth(4, 180); // Ten hien thi
    // o chon san cho cot "Thiep" de go tay khong bi sai chinh ta
    var chon = SpreadsheetApp.newDataValidation().requireValueInList(['Nhà trai', 'Nhà gái'], true).build();
    trang.getRange(2, VI_TRI.ban + 1, 999, 1).setDataValidation(chon);
  }
  // cot Ma luon la VAN BAN (dat lai moi lan cho ca Sheet tao tu ban script cu)
  trang.getRange(1, 1, trang.getMaxRows(), 1).setNumberFormat('@');
  return trang;
}

function docGia_(trang) {
  var soDong = trang.getLastRow() - 1;
  if (soDong <= 0) return [];
  return trang.getRange(2, 1, soDong, SO_COT).getValues();
}

// Dien cho day du nhung dong nguoi dung go tay: thieu Ma -> tao ma, thieu Ten hien thi
// -> ghep "Danh xung + Ten", cot Thiep go kieu gi cung chuan ve "Nha trai"/"Nha gai".
// Ghi lai DUNG CHO CU (setValues cung vung) -> khong xe dich dong, cot ghi chu ben phai giu nguyen.
function chuanHoaBang_(trang) {
  var gia = docGia_(trang);
  if (!gia.length) return;
  var daCo = {};
  gia.forEach(function (h) { var m = String(h[VI_TRI.ma] || '').trim(); if (m) daCo[m] = true; });
  var doi = false;
  gia.forEach(function (h) {
    var ten = String(h[VI_TRI.ten] || '').trim();
    var hienThi = String(h[VI_TRI.hienThi] || '').trim();
    var ma = String(h[VI_TRI.ma] || '').trim();
    if (!ma && !ten && !hienThi) return; // dong trong han -> bo qua
    if (!ma) { ma = taoMaKhach_(daCo); daCo[ma] = true; h[VI_TRI.ma] = ma; doi = true; }
    if (!hienThi) {
      h[VI_TRI.hienThi] = (String(h[VI_TRI.danhXung] || '').trim() + ' ' + ten).trim();
      doi = true;
    }
    var nhan = nhanBan_(maBan_(h[VI_TRI.ban]));
    if (nhan && nhan !== h[VI_TRI.ban]) { h[VI_TRI.ban] = nhan; doi = true; }
    if (!h[VI_TRI.taoLuc]) { h[VI_TRI.taoLuc] = gioVN_(); doi = true; }
  });
  if (doi) trang.getRange(2, 1, gia.length, SO_COT).setValues(gia);
}

function hangThanhKhach_(h) {
  var o = {};
  COT_KHACH.forEach(function (c, i) { o[c.khoa] = h[i]; });
  o.ma = String(o.ma || '').trim();
  o.ban = maBan_(o.ban);
  o.daGui = laDung_(o.daGui);
  o.daPhanHoi = laDung_(o.daPhanHoi);
  if (o.taoLuc instanceof Date) o.taoLuc = gioVN_(o.taoLuc);
  ['danhXung', 'ten', 'hienThi', 'tinhTrangDen', 'loiChuc'].forEach(function (k) { o[k] = String(o[k] == null ? '' : o[k]); });
  return o;
}

function docKhach_() {
  return docGia_(layTrangKhach_()).map(hangThanhKhach_).filter(function (o) { return o.ma; });
}

// so dong (tinh tu 1, gom ca dong tieu de) cua khach co ma nay, -1 neu khong co
function timDong_(trang, ma) {
  var gia = docGia_(trang);
  for (var i = 0; i < gia.length; i++) {
    if (String(gia[i][VI_TRI.ma] || '').trim() === ma) return i + 2;
  }
  return -1;
}

function traKhachTheoMa_(ma) {
  var ds = docKhach_();
  for (var i = 0; i < ds.length; i++) {
    if (ds[i].ma === ma) return { ok: true, hienThi: ds[i].hienThi, ban: ds[i].ban };
  }
  return { ok: false };
}

// them/sua theo "ma". Sua = ghi de DUNG 1 dong cua khach do; them = noi them 1 dong.
// Khong bao gio ghi lai ca tab -> dong go tay + cot ghi chu cua nguoi dung khong bi dung toi.
function luuKhach_(dsGui) {
  var trang = layTrangKhach_();
  chuanHoaBang_(trang);
  var daCo = {};
  docGia_(trang).forEach(function (h) { var m = String(h[VI_TRI.ma] || '').trim(); if (m) daCo[m] = true; });

  dsGui.forEach(function (k) {
    var ma = String(k.ma || '').trim();
    var dong = ma ? timDong_(trang, ma) : -1;
    if (dong > 0) {
      var o = trang.getRange(dong, 1, 1, SO_COT);
      var h = o.getValues()[0];
      ['danhXung', 'ten', 'hienThi'].forEach(function (f) { if (k[f] != null) h[VI_TRI[f]] = String(k[f]); });
      if (k.ban != null) h[VI_TRI.ban] = nhanBan_(maBan_(k.ban)) || h[VI_TRI.ban];
      if (k.daGui != null) h[VI_TRI.daGui] = !!k.daGui;
      o.setValues([h]);
      return;
    }
    // ma client tu tao (de chep link ngay luc bam) duoc giu nguyen neu chua ai dung;
    // ma rong hoac bi trung -> tao ma moi.
    if (!ma || daCo[ma] || /^[0-9]/.test(ma)) ma = taoMaKhach_(daCo);
    daCo[ma] = true;
    var moi = {
      ma: ma,
      danhXung: String(k.danhXung || ''),
      ten: String(k.ten || ''),
      hienThi: String(k.hienThi || ((k.danhXung || '') + ' ' + (k.ten || '')).trim()),
      ban: nhanBan_(maBan_(k.ban)),
      daGui: !!k.daGui,
      taoLuc: gioVN_(),
      daPhanHoi: false,
      tinhTrangDen: '',
      loiChuc: '',
    };
    trang.appendRow(COT_KHACH.map(function (c) { return moi[c.khoa]; }));
  });
  return docKhach_();
}

function xoaKhach_(ma) {
  if (!ma) return;
  var trang = layTrangKhach_();
  var dong = timDong_(trang, ma);
  if (dong > 0) trang.deleteRow(dong); // xoa CA dong -> cot ghi chu ben phai di theo, khong lech
}

function capNhatDong_(ma, patch) {
  var trang = layTrangKhach_();
  var dong = timDong_(trang, ma);
  if (dong < 0) return; // khach da bi xoa hoac ma sai -> bo qua
  var o = trang.getRange(dong, 1, 1, SO_COT);
  var h = o.getValues()[0];
  Object.keys(patch).forEach(function (k) { h[VI_TRI[k]] = patch[k]; });
  o.setValues([h]);
}

function ketQua_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
