// Admin thiep cuoi — thuan JS, khong build tool.
// Doc/ghi du-lieu.json + khach.json + 2 file thiep ngay trong repo dang host qua GitHub Contents API.
(function () {
  'use strict';

  // ---------- cong vao bang prompt username/password ----------
  // Chi la lop chan co ban (file JS tinh, xem View Source la doc duoc mat khau) —
  // du de tranh nguoi la tinh co vao nham link admin, KHONG phai bao mat that su.
  (function congVao() {
    if (sessionStorage.getItem('thiep_admin_da_vao') === '1') return;
    var TAI_KHOAN = ['tuananh', 'tham', 'duc'];
    var MAT_KHAU = 'abc123';
    for (var lan = 0; lan < 3; lan++) {
      var tk = (window.prompt('Tên đăng nhập:') || '').trim().toLowerCase();
      var mk = window.prompt('Mật khẩu:') || '';
      if (TAI_KHOAN.indexOf(tk) >= 0 && mk === MAT_KHAU) {
        sessionStorage.setItem('thiep_admin_da_vao', '1');
        return;
      }
      window.alert('Sai tên đăng nhập hoặc mật khẩu.');
    }
    document.body.innerHTML = '<div style="padding:60px 24px;text-align:center;font:16px -apple-system,Arial,sans-serif;color:#8E7C69">Không có quyền truy cập trang này.</div>';
    throw new Error('Chua dang nhap');
  })();

  var GH_MAC_DINH = { owner: 'AnhNMTHE176111', repo: 'thiep-cuoi', branch: 'main' };
  // BUG-20: link thiep luon tro toi dia chi THAT tren GitHub Pages, khong suy ra tu location.href
  // (chay local thi '../nha-trai/' se 404 va lo chep nham link localhost cho khach).
  var GOC_THIEP_MAC_DINH = 'https://anhnmthe176111.github.io/thiep-cuoi/';
  var KHOA_NHAP = 'thiep_nhap_v1';
  var DA_SUA = false;
  var DANG_TAI_BAN_DAU = true;
  var duLieu = null;
  var khach = [];
  var gocHtml = '';
  var banXem = 'nha_trai';
  var cumHienTai = 'tong-quan';
  var lanDangCuoi = localStorage.getItem('thiep_lan_dang_cuoi') || '';

  function gocThiep() {
    var v = (localStorage.getItem('goc_thiep') || GOC_THIEP_MAC_DINH).trim();
    if (!/\/$/.test(v)) v += '/';
    return v;
  }
  function linkThiep(ma, maKhach) {
    var thuMuc = ma === 'nha_trai' ? 'nha-trai' : 'nha-gai';
    return gocThiep() + thuMuc + '/' + (maKhach ? '?k=' + encodeURIComponent(maKhach) : '');
  }

  // ---------- tien ich chung ----------
  function layPath(obj, path) {
    return path.split('.').reduce(function (o, k) { return (o == null) ? undefined : o[k]; }, obj);
  }
  function datPath(obj, path, val) {
    var ph = path.split('.');
    var cuoi = ph.pop();
    var o = ph.reduce(function (o, k) { if (o[k] == null) o[k] = {}; return o[k]; }, obj);
    o[cuoi] = val;
  }
  function el(tag, attrs, con) {
    var e = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      if (attrs[k] == null) return; // bo qua thuoc tinh khong dat (vd disabled: null)
      if (k === 'class') e.className = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    });
    (con || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  // ---------- BUG-08: luu nhap vao localStorage sau moi thay doi ----------
  var luuNhapTimer = null;
  function luuNhap() {
    clearTimeout(luuNhapTimer);
    luuNhapTimer = setTimeout(function () {
      try {
        localStorage.setItem(KHOA_NHAP, JSON.stringify({
          luc: new Date().toISOString(), duLieu: duLieu, khach: khach,
        }));
      } catch (e) { console.warn('Khong luu duoc ban nhap:', e); }
    }, 400);
  }
  function xoaNhap() {
    clearTimeout(luuNhapTimer);
    try { localStorage.removeItem(KHOA_NHAP); } catch (e) {}
  }
  function docNhap() {
    try {
      var j = JSON.parse(localStorage.getItem(KHOA_NHAP) || 'null');
      if (j && j.duLieu) return j;
    } catch (e) {}
    return null;
  }

  function baoThayDoi() {
    DA_SUA = true;
    if (DANG_TAI_BAN_DAU) return;
    luuNhap();
    capNhatThanhTrangThai();
    veXemTruoc();
  }
  function thongBao(msg, loai) {
    var hop = document.getElementById('hopThongBao');
    var t = el('div', { class: 'thong-bao ' + (loai || '') }, [msg]);
    hop.appendChild(t);
    setTimeout(function () { t.remove(); }, loai === 'loi' ? 6000 : 3200);
  }
  function capNhatThanhTrangThai() {
    var thanh = document.getElementById('thanhTrangThai');
    var cham = document.getElementById('chamTrangThai');
    var chu = document.getElementById('chuTrangThai');
    if (DA_SUA) {
      thanh.classList.remove('sach'); cham.classList.remove('sach');
      chu.textContent = 'Có thay đổi chưa đăng (đã lưu nháp trong trình duyệt)';
    } else {
      thanh.classList.add('sach'); cham.classList.add('sach');
      chu.textContent = 'Chưa có thay đổi trong phiên này';
    }
    var o = document.getElementById('lanLuuCuoi');
    if (o && !o.textContent && lanDangCuoi) o.textContent = 'Lần đăng gần nhất: ' + lanDangCuoi;
  }

  // ---------- chuan hoa ten (dung cho khach moi) ----------
  // BUG-25: phai viet hoa CHU CAI dau tien cua tu, khong phai KY TU dau tien.
  // Voi `"Tuấn"` thi ky tu dau la dau nhay -> cach cu lam chu T bi ha thanh `"tuấn"`.
  // Cung benh voi ten trong ngoac don, ten co gach noi, ten viet hoa co y.
  var RE_TU = (function () {
    try { return new RegExp('^([^\\p{L}]*)(\\p{L})([\\s\\S]*)$', 'u'); } // trinh duyet moi
    catch (e) { return /^([^A-Za-zÀ-ỹ]*)([A-Za-zÀ-ỹ])([\s\S]*)$/; }     // du phong
  })();
  function vietTitleCase(str) {
    str = (str || '').normalize('NFC').trim().replace(/\s+/g, ' ');
    if (!str) return '';
    // Chi ha phan con lai xuong chu thuong khi NGUOI DUNG GO TOAN CHU HOA
    // (thuong la dan tu Excel). Con lai thi ton trong cach ho da go:
    // giu duoc "A.B", "McDonald", "Trần-Anh", ten trong ngoac/nhay.
    var toanHoa = str === str.toLocaleUpperCase('vi') && str !== str.toLocaleLowerCase('vi');
    return str.split(' ').map(function (w) {
      if (!w) return w;
      var m = RE_TU.exec(w);
      if (!m) return w; // tu khong co chu cai nao (vd "&", "-") -> giu nguyen
      return m[1] + m[2].toLocaleUpperCase('vi') + (toanHoa ? m[3].toLocaleLowerCase('vi') : m[3]);
    }).join(' ');
  }
  function chuanHoaTenKhach(danhXung, ten) {
    var dx = vietTitleCase(danhXung);
    var t = vietTitleCase(ten);
    return (dx ? dx + ' ' : '') + t;
  }
  function taoMaKhach() {
    var s = '';
    do { s = Math.random().toString(36).slice(2, 8); } while (khach.some(function (k) { return k.ma === s; }));
    return s;
  }

  // ---------- GitHub Contents API ----------
  function ghCauHinh() {
    return {
      owner: localStorage.getItem('gh_owner') || GH_MAC_DINH.owner,
      repo: localStorage.getItem('gh_repo') || GH_MAC_DINH.repo,
      branch: localStorage.getItem('gh_branch') || GH_MAC_DINH.branch,
      token: localStorage.getItem('gh_token') || '',
    };
  }
  function b64EncodeUtf8(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }
  function b64DecodeUtf8(b64) {
    return decodeURIComponent(escape(atob(b64.replace(/\n/g, ''))));
  }
  function ghGetSha(path) {
    var c = ghCauHinh();
    var url = 'https://api.github.com/repos/' + c.owner + '/' + c.repo + '/contents/' + path + '?ref=' + c.branch;
    return fetch(url, { headers: { Authorization: 'token ' + c.token, Accept: 'application/vnd.github+json' } })
      .then(function (r) { if (r.status === 404) return null; if (!r.ok) throw new Error('GET ' + path + ': HTTP ' + r.status); return r.json(); })
      .then(function (j) { return j ? j.sha : null; });
  }
  // BUG-02: base64 cho du lieu NHI PHAN (anh). KHONG duoc dung unescape(encodeURIComponent())
  // vi ham do chi dung cho chuoi UTF-8, se lam hong byte cua file anh.
  function b64EncodeBytes(arrayBuffer) {
    var bytes = new Uint8Array(arrayBuffer);
    var nhi = '';
    var KHOI = 0x8000; // chia nho de khong tran stack khi goi apply
    for (var i = 0; i < bytes.length; i += KHOI) {
      nhi += String.fromCharCode.apply(null, bytes.subarray(i, i + KHOI));
    }
    return btoa(nhi);
  }
  function docFileThanhBase64(file) {
    return new Promise(function (ok, loi) {
      var fr = new FileReader();
      fr.onload = function () { try { ok(b64EncodeBytes(fr.result)); } catch (e) { loi(e); } };
      fr.onerror = function () { loi(new Error('Không đọc được file ' + file.name)); };
      fr.readAsArrayBuffer(file);
    });
  }
  // noiDung: chuoi (van ban) hoac { base64: '...' } cho file nhi phan
  function ghPutFile(path, noiDung, message) {
    var c = ghCauHinh();
    return ghGetSha(path).then(function (sha) {
      var url = 'https://api.github.com/repos/' + c.owner + '/' + c.repo + '/contents/' + path;
      var noiDung64 = (noiDung && typeof noiDung === 'object' && noiDung.base64)
        ? noiDung.base64 : b64EncodeUtf8(String(noiDung));
      var body = { message: message, content: noiDung64, branch: c.branch };
      if (sha) body.sha = sha;
      return fetch(url, {
        method: 'PUT',
        headers: { Authorization: 'token ' + c.token, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(function (r) {
        if (!r.ok) return r.json().then(function (j) { throw new Error('PUT ' + path + ': ' + (j.message || r.status)); });
        return r.json();
      });
    });
  }

  // ---------- sinh preview / file cuoi ----------
  function sinhBan(ma, opts) {
    return SinhThiep.sinh(gocHtml, duLieu, ma, opts);
  }

  // BUG-01: thiep la khô cung 420px -> scale xuong vua be ngang khung dien thoai.
  var KHO_THIEP = 420;
  function capNhatScaleXem() {
    var khung = document.getElementById('khungDT');
    var iframe = document.getElementById('khungXem');
    if (!khung || !iframe) return;
    var boc = khung.querySelector('.boc-scale');
    var w = boc.clientWidth, h = boc.clientHeight;
    if (!w || !h) return;
    var ty = Math.min(1, w / KHO_THIEP);
    // iframe cao dung bang phan khung con lai SAU KHI scale -> khong cat, khong thua
    iframe.style.height = Math.round(h / ty) + 'px';
    iframe.style.transform = 'scale(' + ty + ')';
  }

  var veXemTruocDebounce = null;
  function veXemTruoc() {
    clearTimeout(veXemTruocDebounce);
    // BUG-18: 250ms qua ngan — gan nhu moi phim go deu dung lai ca tai lieu.
    veXemTruocDebounce = setTimeout(veXemTruocNgay, 650);
  }
  function veXemTruocNgay() {
    var iframe = document.getElementById('khungXem');
    if (!iframe) return;
    // BUG-18: nho vi tri cuon cu roi khoi phuc sau khi tai xong
    var cuonCu = 0;
    try { cuonCu = (iframe.contentWindow && iframe.contentWindow.scrollY) || 0; } catch (e) {}
    var kq;
    try {
      // BUG-05 + BUG-21: ban xem truoc khong co nhac, khong co script form cua LadiPage
      kq = sinhBan(banXem, { xemTruoc: true, khach: khach });
    } catch (e) {
      console.error('loi ve xem truoc', e);
      thongBao('Không dựng được xem trước: ' + e.message, 'loi');
      return;
    }
    iframe.onload = function () {
      capNhatScaleXem();
      if (!cuonCu) return;
      try {
        var w = iframe.contentWindow;
        // doi runtime LadiPage dung xong chieu cao roi moi cuon lai
        var thu = 0;
        var hen = setInterval(function () {
          thu++;
          try { w.scrollTo(0, cuonCu); } catch (e) {}
          if (thu > 6 || (w.scrollY && Math.abs(w.scrollY - cuonCu) < 4)) clearInterval(hen);
        }, 120);
      } catch (e) {}
    };
    iframe.srcdoc = kq.html;
  }

  // ---------- dinh nghia cac cum ----------
  var CAC_CUM = [
    { nhom: '', id: 'tong-quan', ten: 'Tổng quan' },
    { nhom: 'Thông tin chung', id: 'co-dau-chu-re', ten: 'Cô dâu · Chú rể' },
    { nhom: 'Thông tin chung', id: 'nha-trai-chung', ten: 'Nhà trai' },
    { nhom: 'Thông tin chung', id: 'nha-gai-chung', ten: 'Nhà gái' },
    { nhom: 'Thông tin chung', id: 'dia-diem', ten: 'Địa điểm' },
    { nhom: 'Thông tin chung', id: 'lich-trinh', ten: 'Lịch trình' },
    { nhom: 'Thiệp nhà trai', id: 'trai-loi-moi', ten: 'Lời mời' },
    { nhom: 'Thiệp nhà trai', id: 'trai-chuong-trinh', ten: 'Chương trình' },
    { nhom: 'Thiệp nhà trai', id: 'trai-dresscode', ten: 'Dresscode' },
    { nhom: 'Thiệp nhà gái', id: 'gai-loi-moi', ten: 'Lời mời' },
    { nhom: 'Thiệp nhà gái', id: 'gai-chuong-trinh', ten: 'Chương trình' },
    { nhom: 'Thiệp nhà gái', id: 'gai-dresscode', ten: 'Dresscode' },
    { nhom: '', id: 'anh-nhac', ten: 'Ảnh & nhạc' },
    { nhom: '', id: 'khach-moi', ten: 'Khách mời' },
    { nhom: '', id: 'cai-dat', ten: 'Cài đặt' },
  ];

  function veNav() {
    var nav = document.getElementById('cotNav');
    nav.innerHTML = '';
    var nhomTruoc = null;
    CAC_CUM.forEach(function (c) {
      if (c.nhom && c.nhom !== nhomTruoc) {
        nav.appendChild(el('div', { class: 'nhom' }, [c.nhom]));
        nhomTruoc = c.nhom;
      }
      var btn = el('button', {
        type: 'button',
        class: c.id === cumHienTai ? 'active' : '',
        onclick: function () { chonCum(c.id); },
      }, [c.ten]);
      btn.dataset.id = c.id;
      nav.appendChild(btn);
    });
  }
  function chonCum(id) {
    cumHienTai = id;
    document.querySelectorAll('#cotNav button').forEach(function (b) { b.classList.toggle('active', b.dataset.id === id); });
    var c = CAC_CUM.filter(function (x) { return x.id === id; })[0];
    document.getElementById('tieuDeCum').textContent = c ? c.ten : '';
    veCum(id);
  }

  // ---------- ham dung chung: field text/textarea buoc vao duLieu ----------
  function chuanHex(v) {
    v = String(v == null ? '' : v).trim();
    if (!v) return '';
    if (v.charAt(0) !== '#') v = '#' + v;
    if (/^#[0-9a-fA-F]{3}$/.test(v)) {
      v = '#' + v.charAt(1) + v.charAt(1) + v.charAt(2) + v.charAt(2) + v.charAt(3) + v.charAt(3);
    }
    return /^#[0-9a-fA-F]{6}$/.test(v) ? v.toUpperCase() : '';
  }

  function truong(cfg) {
    var wrap = el('div', { class: 'field' });
    wrap.appendChild(el('label', {}, [cfg.nhan]));
    var input;
    var oLoi = el('p', { class: 'loi an' });

    // BUG-03: o mau = swatch vuong 44px + o text nhap hex, dong bo 2 chieu
    if (cfg.kieu === 'mau') {
      var hop = el('div', { class: 'o-mau' });
      var oMau = el('input', { type: 'color' });
      var oHex = el('input', { type: 'text', placeholder: '#F5EDE1', maxlength: '7' });
      var hexBanDau = chuanHex(layPath(duLieu, cfg.path)) || '#FFFFFF';
      oMau.value = hexBanDau; oHex.value = hexBanDau;
      var ghi = function (v) {
        datPath(duLieu, cfg.path, v);
        if (cfg.khiSua) cfg.khiSua();
        baoThayDoi();
      };
      oMau.addEventListener('input', function () {
        oHex.value = oMau.value.toUpperCase();
        oLoi.classList.add('an');
        ghi(oMau.value.toUpperCase());
      });
      oHex.addEventListener('input', function () {
        var h = chuanHex(oHex.value);
        if (!h) { oLoi.textContent = 'Mã màu phải dạng #RRGGBB, ví dụ #F5EDE1.'; oLoi.classList.remove('an'); return; }
        oLoi.classList.add('an');
        oMau.value = h;
        ghi(h);
      });
      if (cfg.veLaiCum) oMau.addEventListener('change', function () { veCum(cumHienTai); });
      hop.appendChild(oMau); hop.appendChild(oHex);
      wrap.appendChild(hop);
      wrap.appendChild(oLoi);
      if (cfg.goiY) wrap.appendChild(el('p', { class: 'goi-y' }, [cfg.goiY]));
      wrap.oInput = oHex;
      return wrap;
    }

    if (cfg.kieu === 'textarea') input = el('textarea', {});
    else if (cfg.kieu === 'time') input = el('input', { type: 'time' });
    else if (cfg.kieu === 'date') input = el('input', { type: 'date' });
    else if (cfg.kieu === 'select') {
      input = el('select', {});
      (cfg.tuyChon || []).forEach(function (o) { input.appendChild(el('option', { value: o.gia }, [o.nhan])); });
    } else input = el('input', { type: 'text' });
    var giaTri = layPath(duLieu, cfg.path);
    input.value = giaTri == null ? '' : giaTri;

    // BUG-11: truong bat buoc (ngay/gio/...) de trong thi BAO LOI va KHONG ghi vao duLieu,
    // neu khong thiep se sinh ra "undefined . undefined ." va "NaN".
    function kiemTraGiaTri() {
      var v = input.value;
      if (cfg.batBuoc && !String(v).trim()) return 'Không được để trống — thiệp sẽ hỏng nếu thiếu.';
      if (cfg.kieu === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'Ngày không hợp lệ (cần dạng ngày/tháng/năm đầy đủ).';
      if (cfg.kieu === 'time' && cfg.batBuoc && !/^\d{2}:\d{2}$/.test(v)) return 'Giờ không hợp lệ (cần dạng HH:mm).';
      return '';
    }
    input.addEventListener('input', function () {
      var loi = kiemTraGiaTri();
      if (loi) {
        oLoi.textContent = '⛔ ' + loi;
        oLoi.classList.remove('an');
        return; // giu nguyen gia tri cu trong duLieu
      }
      oLoi.classList.add('an');
      datPath(duLieu, cfg.path, input.value);
      if (cfg.khiSua) cfg.khiSua();
      baoThayDoi();
    });
    if (cfg.veLaiCum) {
      // Mot so truong (gio su kien/mau mau/select gan su kien) lam doi giao dien cua
      // chinh cum dang mo (an chip "mau", doi loai o Gio...). Ve lai cum sau khi gia
      // tri da "chot" (change) de phan anh dung, nhung khong ve lai tren tung phim go
      // (input) vi se lam mat focus dang go chu.
      input.addEventListener('change', function () { veCum(cumHienTai); });
    }
    wrap.appendChild(input);
    wrap.appendChild(oLoi);
    if (cfg.goiY) wrap.appendChild(el('p', { class: 'goi-y' }, [cfg.goiY]));
    if (cfg.mau) wrap.appendChild(el('p', { class: 'canh-bao' }, ['⚠️ Giá trị MẪU — cần xác nhận lại trước khi gửi khách.']));
    // BUG-16: canh bao do dai ngay trong truong, khong con la ma chet
    if (cfg.doDai) {
      wrap.appendChild(dungCanhBaoDoDai(input, cfg.doDai.rong, cfg.doDai.co, cfg.doDai.font, cfg.doDai.moTa));
    }
    wrap.oInput = input;
    return wrap;
  }

  // BUG-16: do be ngang chu bang canvas roi canh bao khi vuot khung tuyet doi cua thiep.
  function dungCanhBaoDoDai(input, boxW, fontPx, fontFamily, moTa) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var canhBao = el('p', { class: 'canh-bao an' });
    function kiemTra() {
      ctx.font = fontPx + 'px ' + (fontFamily || 'Arial');
      var w = ctx.measureText(input.value || '').width;
      if (w > boxW) {
        canhBao.textContent = '⚠️ Chữ rộng khoảng ' + Math.round(w) + 'px, khung' +
          (moTa ? ' ' + moTa : '') + ' chỉ vừa ' + boxW + 'px — sẽ tràn/xuống 2 dòng trên thiệp.';
        canhBao.classList.remove('an');
      } else canhBao.classList.add('an');
    }
    input.addEventListener('input', kiemTra);
    setTimeout(kiemTra, 0);
    return canhBao;
  }

  // ---------- cac cum ----------
  function veCum(id) {
    var host = document.getElementById('cotGiua');
    host.innerHTML = '';
    var cum = el('div', { class: 'cum' });
    host.appendChild(cum);

    if (id === 'tong-quan') return veTongQuan(cum);
    if (id === 'co-dau-chu-re') return veCoDauChuRe(cum);
    if (id === 'nha-trai-chung') return veNhaChung(cum, 'chung.nhaTrai', 'Nhà trai');
    if (id === 'nha-gai-chung') return veNhaChung(cum, 'chung.nhaGai', 'Nhà gái');
    if (id === 'dia-diem') return veDiaDiem(cum);
    if (id === 'lich-trinh') return veLichTrinh(cum);
    if (id === 'trai-loi-moi') return veLoiMoi(cum, 'nha_trai');
    if (id === 'gai-loi-moi') return veLoiMoi(cum, 'nha_gai');
    if (id === 'trai-chuong-trinh') return veChuongTrinh(cum, 'nha_trai');
    if (id === 'gai-chuong-trinh') return veChuongTrinh(cum, 'nha_gai');
    if (id === 'trai-dresscode') return veDresscode(cum, 'nha_trai');
    if (id === 'gai-dresscode') return veDresscode(cum, 'nha_gai');
    if (id === 'anh-nhac') return veAnhNhac(cum);
    if (id === 'khach-moi') return veKhachMoi(cum);
    if (id === 'cai-dat') return veCaiDat(cum);
  }

  function veTongQuan(cum) {
    var thieuMau = [];
    duLieu.suKien.forEach(function (sk) { if (sk._mau) thieuMau.push(sk.ten + ' (' + sk.ngayDuong + ')'); });
    ['nha_trai', 'nha_gai'].forEach(function (ma) {
      (duLieu.ban[ma].dresscode.mau || []).forEach(function (m) { if (m._mau) thieuMau.push('Màu "' + m.ten + '" — bản ' + ma); });
    });
    if (thieuMau.length) {
      var canhBao = el('div', { class: 'khung' }, [
        el('h3', {}, ['⚠️ Còn ' + thieuMau.length + ' giá trị MẪU cần xác nhận']),
      ]);
      var ul = el('ul', { style: 'margin:4px 0 0;padding-left:18px;font-size:13px;color:var(--vang)' });
      thieuMau.forEach(function (t) { ul.appendChild(el('li', {}, [t])); });
      canhBao.appendChild(ul);
      cum.appendChild(canhBao);
    }
    var khung = el('div', { class: 'khung' });
    khung.appendChild(el('h3', {}, ['Link thiệp']));
    ['nha_trai', 'nha_gai'].forEach(function (ma) {
      var url = linkThiep(ma);
      var hang = el('div', { style: 'display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f0ebe3' }, [
        el('div', {}, [el('b', {}, [ma === 'nha_trai' ? 'Nhà trai' : 'Nhà gái']), el('div', { class: 'muc-nho' }, [url])]),
      ]);
      var nutChep = el('button', { class: 'nut nho', type: 'button', onclick: function () { navigator.clipboard.writeText(url); thongBao('Đã chép link'); } }, ['Chép link']);
      hang.appendChild(nutChep);
      khung.appendChild(hang);
    });
    cum.appendChild(khung);

    var chuaDang = khach.filter(function (k) { return !k.daDang; }).length;
    var khung2 = el('div', { class: 'khung' }, [
      el('h3', {}, ['Số khách đã tạo link riêng']),
      el('p', {}, [String(khach.length) + ' khách' + (chuaDang ? ' — trong đó ' + chuaDang + ' khách CHƯA đăng lên link thật' : '')]),
    ]);
    if (chuaDang) {
      khung2.appendChild(el('p', { class: 'canh-bao' }, ['⚠️ Link của khách chưa đăng sẽ chỉ hiện "Quý Khách". Bấm "Đăng lên link thật" trước khi gửi.']));
    }
    cum.appendChild(khung2);
  }

  function veCoDauChuRe(cum) {
    cum.appendChild(el('div', { class: 'khung' }, [
      el('h3', {}, ['Cô dâu']),
      truong({ nhan: 'Tên hiển thị', path: 'chung.coDau.ten' }),
      truong({ nhan: 'Thứ bậc (vd: Trưởng nữ, Út nữ)', path: 'chung.coDau.thuBac' }),
    ]));
    cum.appendChild(el('div', { class: 'khung' }, [
      el('h3', {}, ['Chú rể']),
      truong({ nhan: 'Tên hiển thị', path: 'chung.chuRe.ten' }),
      truong({ nhan: 'Thứ bậc (vd: Thứ nam, Út nam)', path: 'chung.chuRe.thuBac' }),
    ]));
    // BUG-17: da bo o "Monogram" — sinh.js khong dung no o bat cu dau,
    // sua chi lam nguoi dung tuong da doi duoc thiep.
  }

  function veNhaChung(cum, tienTo, ten) {
    // BUG-17: da bo o "Địa chỉ" — thiep chi in ten Ông/Bà (HEADLINE27/28),
    // khong co cho nao in dia chi nha. Dia chi to chuc nam o cum "Địa điểm".
    cum.appendChild(el('div', { class: 'khung' }, [
      el('h3', {}, [ten]),
      truong({ nhan: 'Tên ông', path: tienTo + '.ong' }),
      truong({ nhan: 'Tên bà', path: tienTo + '.ba' }),
      el('p', { class: 'muc-nho' }, ['Địa chỉ nơi tổ chức nằm ở cụm “Địa điểm”. Thiệp chỉ in tên Ông/Bà của hai nhà.']),
    ]));
  }

  // dem xem 1 dia diem / su kien dang duoc dung o dau -> chan xoa nham
  function noiDungDiaDiem(maDD) {
    return duLieu.suKien.filter(function (s) { return s.diaDiemMa === maDD; }).map(function (s) { return s.ten; });
  }
  function noiDungSuKien(maSK) {
    var noi = [];
    ['nha_trai', 'nha_gai'].forEach(function (ma) {
      var b = duLieu.ban[ma];
      var tenBan = ma === 'nha_trai' ? 'nhà trai' : 'nhà gái';
      if (b.suKienChinhMa === maSK) noi.push('sự kiện chính bản ' + tenBan);
      if (b.demNguocSuKienMa === maSK) noi.push('mốc đếm ngược bản ' + tenBan);
      (b.chuongTrinh || []).forEach(function (m, i) { if (m.suKienMa === maSK) noi.push('mốc ' + (i + 1) + ' chương trình bản ' + tenBan); });
    });
    return noi;
  }
  function maMoi(tienTo, daCo) {
    var i = 1, m;
    do { m = tienTo + '_' + i; i++; } while (daCo.indexOf(m) >= 0);
    return m;
  }

  function veDiaDiem(cum) {
    Object.keys(duLieu.diaDiem).forEach(function (ma) {
      var dd = duLieu.diaDiem[ma];
      var khung = el('div', { class: 'khung' });
      khung.appendChild(el('h3', {}, [dd.ten || ma]));
      khung.appendChild(truong({
        nhan: 'Tên hiển thị', path: 'diaDiem.' + ma + '.ten', batBuoc: true,
        // BUG-16: HEADLINE16 chi vua 1 dong ~323px o co chu 18px
        doDai: { rong: 323, co: 18, font: 'Arial', moTa: 'tên địa điểm trên thiệp' },
        goiY: 'Chỉ vừa 1 dòng. Dài hơn sẽ xuống 2 dòng và đè lên dòng địa chỉ ngay dưới.',
      }));
      khung.appendChild(truong({ nhan: 'Địa chỉ (dùng <br> để ngắt dòng nếu cần)', path: 'diaDiem.' + ma + '.diaChi', kieu: 'textarea', goiY: 'Địa chỉ nên chia 2 dòng bằng <br>.' }));
      khung.appendChild(truong({ nhan: 'Link Google Maps', path: 'diaDiem.' + ma + '.map', goiY: 'Dạng: https://www.google.com/maps/search/?api=1&query=...' }));
      var dung = noiDungDiaDiem(ma);
      var hangNut = el('div', { class: 'hang-nut' });
      hangNut.appendChild(el('button', { class: 'nut nho nguy', type: 'button', onclick: function () {
        if (dung.length) { thongBao('Không xoá được: địa điểm này đang dùng cho ' + dung.join(', '), 'loi'); return; }
        if (Object.keys(duLieu.diaDiem).length <= 1) { thongBao('Phải còn ít nhất 1 địa điểm.', 'loi'); return; }
        if (!confirm('Xoá địa điểm "' + (dd.ten || ma) + '"?')) return;
        delete duLieu.diaDiem[ma];
        baoThayDoi(); veCum('dia-diem');
      } }, ['Xoá địa điểm']));
      if (dung.length) hangNut.appendChild(el('span', { class: 'muc-nho' }, ['Đang dùng cho: ' + dung.join(', ')]));
      khung.appendChild(hangNut);
      cum.appendChild(khung);
    });
    // BUG-14: them dia diem moi
    cum.appendChild(el('button', { class: 'nut', type: 'button', onclick: function () {
      var ma = maMoi('dia_diem', Object.keys(duLieu.diaDiem));
      duLieu.diaDiem[ma] = { ten: 'ĐỊA ĐIỂM MỚI', diaChi: '', map: '' };
      baoThayDoi(); veCum('dia-diem');
    } }, ['+ Thêm địa điểm']));
  }

  function veLichTrinh(cum) {
    duLieu.suKien.forEach(function (sk, idx) {
      var khung = el('div', { class: 'khung' });
      var h3 = el('h3', {});
      h3.appendChild(document.createTextNode(sk.ten || '(chưa đặt tên)'));
      if (sk._mau) h3.appendChild(el('span', { class: 'chip-mau' }, ['MẪU — cần xác nhận']));
      khung.appendChild(h3);
      khung.appendChild(truong({ nhan: 'Tên sự kiện', path: 'suKien.' + idx + '.ten', batBuoc: true }));
      var hang = el('div', { class: 'hang2' });
      hang.appendChild(truong({ nhan: 'Ngày dương', path: 'suKien.' + idx + '.ngayDuong', kieu: 'date', batBuoc: true,
        goiY: 'Bắt buộc — để trống thiệp sẽ hiện "undefined" và "NaN".' }));
      hang.appendChild(truong({
        nhan: 'Giờ', path: 'suKien.' + idx + '.gio', kieu: 'time', batBuoc: true,
        khiSua: function () { duLieu.suKien[idx]._mau = false; },
        veLaiCum: true,
      }));
      khung.appendChild(hang);
      khung.appendChild(truong({
        nhan: 'Địa điểm', path: 'suKien.' + idx + '.diaDiemMa', kieu: 'select',
        tuyChon: Object.keys(duLieu.diaDiem).map(function (m) { return { gia: m, nhan: duLieu.diaDiem[m].ten }; }),
      }));
      var dung = noiDungSuKien(sk.ma);
      var hangNut = el('div', { class: 'hang-nut' });
      hangNut.appendChild(el('button', { class: 'nut nho nguy', type: 'button', onclick: function () {
        if (dung.length) { thongBao('Không xoá được: sự kiện này đang được dùng làm ' + dung.join(', '), 'loi'); return; }
        if (duLieu.suKien.length <= 1) { thongBao('Phải còn ít nhất 1 sự kiện.', 'loi'); return; }
        if (!confirm('Xoá sự kiện "' + sk.ten + '"?')) return;
        duLieu.suKien.splice(idx, 1);
        baoThayDoi(); veCum('lich-trinh');
      } }, ['Xoá sự kiện']));
      if (dung.length) hangNut.appendChild(el('span', { class: 'muc-nho' }, ['Đang dùng làm: ' + dung.join(', ')]));
      khung.appendChild(hangNut);
      cum.appendChild(khung);
    });
    // BUG-14: them su kien moi
    cum.appendChild(el('button', { class: 'nut', type: 'button', onclick: function () {
      var ma = maMoi('su_kien', duLieu.suKien.map(function (s) { return s.ma; }));
      var homNay = new Date();
      var iso = homNay.getFullYear() + '-' + String(homNay.getMonth() + 1).padStart(2, '0') + '-' + String(homNay.getDate()).padStart(2, '0');
      duLieu.suKien.push({ ma: ma, ten: 'SỰ KIỆN MỚI', ngayDuong: iso, gio: '18:00', _mau: true, diaDiemMa: Object.keys(duLieu.diaDiem)[0] });
      baoThayDoi(); veCum('lich-trinh');
    } }, ['+ Thêm sự kiện']));
  }

  function veLoiMoi(cum, ma) {
    var b = duLieu.ban[ma];
    var tenBan = ma === 'nha_trai' ? 'nhà trai' : 'nhà gái';
    cum.appendChild(el('div', { class: 'khung' }, [
      el('h3', {}, ['Câu mời chính']),
      truong({ nhan: 'Câu mời (dùng <br> để xuống dòng)', path: 'ban.' + ma + '.loiMoi', kieu: 'textarea', batBuoc: true,
        goiY: 'Bắt buộc — để trống thì thiệp bản ' + tenBan + ' sẽ thiếu hẳn câu mời.' }),
      // BUG-17: truoc day chi sua duoc bang cach mo tay du-lieu.json
      truong({ nhan: 'Ai đứng trước trong cặp tên', path: 'ban.' + ma + '.thuTuTen', kieu: 'select', veLaiCum: true,
        tuyChon: [{ gia: 'chu_re_truoc', nhan: 'Chú rể đứng trước' }, { gia: 'co_dau_truoc', nhan: 'Cô dâu đứng trước' }],
        goiY: 'Quyết định thứ tự tên trên bìa, thứ tự khối "NHÀ TRAI / NHÀ GÁI" và tiêu đề trang. Thường bản nhà trai để chú rể trước, bản nhà gái để cô dâu trước.' }),
    ]));
    var suKienOptions = duLieu.suKien.map(function (s) { return { gia: s.ma, nhan: s.ten + ' (' + s.ngayDuong + ' ' + s.gio + ')' }; });
    cum.appendChild(el('div', { class: 'khung' }, [
      el('h3', {}, ['Sự kiện chính hiển thị trên bìa & lời mời']),
      truong({ nhan: 'Sự kiện chính (ngày lớn, địa điểm, giờ)', path: 'ban.' + ma + '.suKienChinhMa', kieu: 'select', tuyChon: suKienOptions }),
      truong({ nhan: 'Mốc đếm ngược', path: 'ban.' + ma + '.demNguocSuKienMa', kieu: 'select', tuyChon: suKienOptions,
        goiY: 'Nên trùng với sự kiện chính để đồng hồ đếm ngược khớp với ngày lớn hiển thị trên thiệp bản ' + tenBan + '.' }),
    ]));
  }

  var ICON_TUY_CHON = [
    { gia: 'nhan', nhan: 'Nhẫn cưới' },
    { gia: 'may_anh', nhan: 'Máy ảnh' },
    { gia: 'khai_tiec', nhan: 'Khai tiệc' },
    { gia: 'hoa_cuoi', nhan: 'Hoa cưới' },
  ];
  function veChuongTrinh(cum, ma) {
    var b = duLieu.ban[ma];
    var suKienOptions = [{ gia: '', nhan: '— Không gắn sự kiện (tự nhập giờ) —' }].concat(
      duLieu.suKien.map(function (s) { return { gia: s.ma, nhan: s.ten }; })
    );
    b.chuongTrinh.forEach(function (moc, idx) {
      var khung = el('div', { class: 'khung' });
      khung.appendChild(el('h3', {}, ['Mốc ' + (idx + 1)]));
      var hang = el('div', { class: 'hang3' });
      var chonSK = truong({
        nhan: 'Gắn theo sự kiện', path: 'ban.' + ma + '.chuongTrinh.' + idx + '.suKienMa', kieu: 'select', tuyChon: suKienOptions,
        veLaiCum: true,
      });
      hang.appendChild(chonSK);
      var oGio;
      if (moc.suKienMa) {
        oGio = el('div', { class: 'field' }, [el('label', {}, ['Giờ (theo sự kiện)']), el('input', { type: 'text', disabled: 'true', value: (duLieu.suKien.filter(function(s){return s.ma===moc.suKienMa})[0]||{}).gio || '' })]);
      } else {
        oGio = truong({ nhan: 'Giờ riêng', path: 'ban.' + ma + '.chuongTrinh.' + idx + '.gioRieng' });
      }
      hang.appendChild(oGio);
      hang.appendChild(truong({ nhan: 'Icon', path: 'ban.' + ma + '.chuongTrinh.' + idx + '.icon', kieu: 'select', tuyChon: ICON_TUY_CHON }));
      khung.appendChild(hang);
      // BUG-16: canh bao that khi nhan dai hon o 198px
      var oNhan = truong({
        nhan: 'Nhãn hiển thị', path: 'ban.' + ma + '.chuongTrinh.' + idx + '.nhan',
        doDai: { rong: 198, co: 12, font: 'Arial', moTa: 'ô mốc chương trình' },
        goiY: 'Ô chỉ rộng 198px (~12 ký tự hoa). Dài hơn thì chữ xuống 2 dòng và lệch với icon.',
      });
      khung.appendChild(oNhan);
      cum.appendChild(khung);
    });
    cum.appendChild(el('p', { class: 'muc-nho' }, ['Thiệp chỉ in tối đa 4 mốc — đúng bằng 4 ô có sẵn trong khuôn.']));
  }

  function veDresscode(cum, ma) {
    var b = duLieu.ban[ma];
    var khung = el('div', { class: 'khung' });
    var tieuDe = el('h3', {}, ['Dresscode']);
    var congTac = el('label', { class: 'cong-tac' }, [
      (function () { var i = document.createElement('input'); i.type = 'checkbox'; i.checked = !!b.dresscode.bat;
        i.addEventListener('change', function () { b.dresscode.bat = i.checked; baoThayDoi(); veCum(cumHienTai); });
        return i; })(),
      el('span', { class: 'bi' }),
      el('span', {}, ['Hiện mục này']),
    ]);
    tieuDe.appendChild(congTac);
    khung.appendChild(tieuDe);
    cum.appendChild(khung);
    if (!b.dresscode.bat) return;
    if (!Array.isArray(b.dresscode.mau)) b.dresscode.mau = [];
    if (!b.dresscode.mau.length) {
      cum.appendChild(el('p', { class: 'muc-nho' }, ['Chưa có màu nào. Bấm "+ Thêm màu" để bắt đầu.']));
    }
    b.dresscode.mau.forEach(function (m, idx) {
      var hang = el('div', { class: 'khung' });
      var h3 = el('h3', {});
      h3.appendChild(document.createTextNode('Màu ' + (idx + 1)));
      if (m._mau) h3.appendChild(el('span', { class: 'chip-mau' }, ['MẪU']));
      hang.appendChild(h3);
      var h2 = el('div', { class: 'hang2' });
      // BUG-22: mau chua dat ten bi bo qua khi sinh thiep -> nhac nguoi dung dien vao
      h2.appendChild(truong({ nhan: 'Tên màu', path: 'ban.' + ma + '.dresscode.mau.' + idx + '.ten', batBuoc: true,
        goiY: (String(m.ten || '').trim() ? '' : 'Chưa đặt tên — màu này sẽ KHÔNG hiện trên thiệp.') }));
      h2.appendChild(truong({ nhan: 'Mã màu', path: 'ban.' + ma + '.dresscode.mau.' + idx + '.hex', kieu: 'mau',
        khiSua: function () { m._mau = false; }, veLaiCum: true }));
      hang.appendChild(h2);
      if (m._mau) hang.appendChild(el('p', { class: 'canh-bao' }, ['⚠️ Mã màu MẪU — nên đối chiếu với thiệp giấy/thiết kế thật trước khi gửi khách.']));
      // BUG-14: xoa / doi thu tu tung dong mau
      var hangNut = el('div', { class: 'hang-nut' });
      hangNut.appendChild(el('button', { class: 'nut nho', type: 'button', disabled: idx === 0 ? 'true' : null, onclick: function () {
        if (idx === 0) return;
        var t = b.dresscode.mau[idx - 1]; b.dresscode.mau[idx - 1] = b.dresscode.mau[idx]; b.dresscode.mau[idx] = t;
        baoThayDoi(); veCum(cumHienTai);
      } }, ['↑ Lên']));
      hangNut.appendChild(el('button', { class: 'nut nho', type: 'button', disabled: idx === b.dresscode.mau.length - 1 ? 'true' : null, onclick: function () {
        if (idx >= b.dresscode.mau.length - 1) return;
        var t = b.dresscode.mau[idx + 1]; b.dresscode.mau[idx + 1] = b.dresscode.mau[idx]; b.dresscode.mau[idx] = t;
        baoThayDoi(); veCum(cumHienTai);
      } }, ['↓ Xuống']));
      hangNut.appendChild(el('button', { class: 'nut nho nguy', type: 'button', onclick: function () {
        if (!confirm('Xoá màu "' + (m.ten || '') + '"?')) return;
        b.dresscode.mau.splice(idx, 1);
        baoThayDoi(); veCum(cumHienTai);
      } }, ['Xoá']));
      hang.appendChild(hangNut);
      cum.appendChild(hang);
    });
    // BUG-14: truoc day bat cong tac len la ngo cut, khong co cach nao them mau
    cum.appendChild(el('button', { class: 'nut', type: 'button', onclick: function () {
      b.dresscode.mau.push({ ten: '', hex: '#FFFFFF' });
      baoThayDoi(); veCum(cumHienTai);
    } }, ['+ Thêm màu']));
    cum.appendChild(el('p', { class: 'muc-nho', style: 'margin-top:8px' }, ['Thiệp in tên các màu, nối bằng dấu “·”. Không có màu nào thì thiệp hiện “TRANG PHỤC LỊCH SỰ, PHÙ HỢP”.']));
  }

  // BUG-02: tai anh tu may len thang GitHub repo (thu muc anh/), khong xoa anh cu.
  var DUOI_ANH = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
  var GIOI_HAN_ANH = 5 * 1024 * 1024; // 5MB — lon hon nua se lam repo phinh rat nhanh
  // BUG-23: kiem tra CUC BO (loai file, kich thuoc) TRUOC, kiem token SAU.
  // Truoc day chon nham .txt khi chua co token thi bao "Chua noi GitHub token",
  // nhap token xong chon lai moi biet la sai loai file -> phai sua 2 lan cho 1 lan chon nham.
  function loiFileAnh(file) {
    if (!file) return 'Chưa chọn file nào.';
    if (!/^image\//.test(file.type)) {
      return 'File "' + file.name + '" không phải ảnh (chỉ nhận JPG, PNG, WebP, GIF).';
    }
    if (file.size > GIOI_HAN_ANH) {
      return 'Ảnh "' + file.name + '" nặng ' + (file.size / 1048576).toFixed(1) +
        'MB, vượt mức 5MB. Hãy nén/thu nhỏ ảnh trước.';
    }
    return '';
  }
  function taiAnhLen(khoa, file) {
    var loiFile = loiFileAnh(file);
    if (loiFile) return Promise.reject(new Error(loiFile));
    var c = ghCauHinh();
    if (!c.token) {
      return Promise.reject(new Error('Chưa nối GitHub token — vào cụm "Cài đặt" nhập token trước rồi mới tải ảnh lên được.'));
    }
    var duoi = DUOI_ANH[file.type] || (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    var ten = String(khoa).toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now() + '.' + duoi;
    var duongDan = 'anh/' + ten;
    return docFileThanhBase64(file)
      .then(function (b64) { return ghPutFile(duongDan, { base64: b64 }, 'Tai anh ' + ten + ' tu admin'); })
      .then(function () { return gocThiep() + duongDan; });
  }

  function veAnhNhac(cum) {
    cum.appendChild(el('div', { class: 'khung' }, [
      el('h3', {}, ['Ảnh pre-wedding (dùng chung 2 bản)']),
      el('p', { class: 'muc-nho' }, ['Chọn ảnh từ máy — ảnh sẽ được tải thẳng lên kho ảnh của thiệp (thư mục anh/). Ảnh cũ không bị xoá nên có thể quay lại bất cứ lúc nào. Cần nối GitHub token ở cụm "Cài đặt" trước. Ảnh nên xoay dọc/ngang đúng như ghi chú.']),
    ]));
    Object.keys(duLieu.anh).forEach(function (khoa) {
      var a = duLieu.anh[khoa];
      var khung = el('div', { class: 'khung' });
      khung.appendChild(el('h3', {}, [a.ghiChu || khoa]));
      var hang = el('div', { style: 'display:flex;gap:12px;align-items:flex-start' });
      var anhXem = el('img', { src: a.url, alt: '', style: 'width:80px;height:80px;object-fit:cover;border-radius:8px;border:1px solid var(--vien);background:#f0ebe3' });
      var oNhap = el('div', { style: 'flex:1;min-width:0' });

      var oLinkField = truong({ nhan: 'Link ảnh (tuỳ chọn — nếu đã có sẵn URL)', path: 'anh.' + khoa + '.url',
        khiSua: function () { anhXem.src = duLieu.anh[khoa].url; } });

      var hopTai = el('div', { class: 'o-tai-len' });
      var oFile = el('input', { type: 'file', accept: 'image/*' });
      var trangThai = el('span', { class: 'trang-thai-tai' });
      oFile.addEventListener('change', function () {
        var file = oFile.files && oFile.files[0];
        if (!file) return;
        // BUG-23: chan file sai ngay tai day -> khong tao blob: xem truoc cho file khong phai anh
        var loiFile = loiFileAnh(file);
        if (loiFile) {
          trangThai.textContent = '';
          oFile.value = '';
          thongBao(loiFile, 'loi');
          return;
        }
        // xem truoc cuc bo ngay lap tuc (chua can doi tai len xong)
        var tamUrl = '';
        try { tamUrl = URL.createObjectURL(file); anhXem.src = tamUrl; } catch (e) {}
        trangThai.textContent = 'Đang tải lên… (' + (file.size / 1024).toFixed(0) + ' KB)';
        oFile.disabled = true;
        taiAnhLen(khoa, file).then(function (url) {
          duLieu.anh[khoa].url = url;
          var oInput = oLinkField.oInput;
          if (oInput) oInput.value = url;
          anhXem.src = url;
          trangThai.textContent = '✔ Đã tải lên. Ảnh sẽ hiện trên link thật sau khi bấm "Đăng".';
          thongBao('Đã tải ảnh lên kho: ' + url.split('/').pop(), 'ok');
          baoThayDoi();
        }).catch(function (e) {
          trangThai.textContent = '';
          anhXem.src = duLieu.anh[khoa].url || '';
          thongBao('Tải ảnh thất bại: ' + e.message, 'loi');
        }).finally(function () {
          oFile.disabled = false; oFile.value = '';
          if (tamUrl) setTimeout(function () { try { URL.revokeObjectURL(tamUrl); } catch (e) {} }, 30000);
        });
      });
      hopTai.appendChild(el('label', { style: 'font-size:12.5px;font-weight:600;color:var(--nau)' }, ['Chọn ảnh từ máy:']));
      hopTai.appendChild(oFile);
      hopTai.appendChild(trangThai);

      oNhap.appendChild(hopTai);
      oNhap.appendChild(oLinkField);
      hang.appendChild(anhXem); hang.appendChild(oNhap);
      khung.appendChild(hang);
      cum.appendChild(khung);
    });
    cum.appendChild(el('div', { class: 'khung' }, [
      el('h3', {}, ['Nhạc nền']),
      truong({ nhan: 'Link file nhạc (mp3)', path: 'nhac.url',
        goiY: 'Để trống sẽ giữ bản nhạc mặc định của khuôn thiệp.' }),
      (function () {
        var wrap = el('div', { class: 'field' });
        var lbl = el('label', { class: 'cong-tac' }, [
          (function () { var i = document.createElement('input'); i.type = 'checkbox'; i.checked = !!duLieu.nhac.tuPhat;
            i.addEventListener('change', function () { duLieu.nhac.tuPhat = i.checked; baoThayDoi(); }); return i; })(),
          el('span', { class: 'bi' }), el('span', {}, ['Tự phát khi mở thiệp']),
        ]);
        wrap.appendChild(lbl);
        wrap.appendChild(el('p', { class: 'goi-y' }, ['Tắt thì nhạc chỉ chạy khi khách tự bấm nút loa. Khung xem trước bên phải luôn tắt nhạc.']));
        return wrap;
      })(),
    ]));
  }

  // ---------- khach moi ----------
  // BUG-06: khach moi them chi nam trong RAM tab admin. Link ?k=... chi hoat dong
  // SAU KHI bam "Dang len link that" (luc do khach.json + 2 file thiep moi duoc ghi len repo).
  // Vi vay moi khach co co `daDang`; nut Chep/link canh bao ro neu chua dang.
  var KHUNG_TEN_KHACH = 279; // be ngang khung #HEADLINE15 tren thiep
  var CO_TEN_KHACH = 28;

  function khachChuaDang() {
    return khach.filter(function (k) { return !k.daDang; });
  }
  function canhBaoChuaDang(k) {
    return confirm(
      'Khách "' + k.hienThi + '" CHƯA được đăng lên link thật.\n\n' +
      'Nếu gửi link ngay bây giờ, khách mở ra sẽ chỉ thấy "Quý Khách" chứ không thấy tên mình.\n\n' +
      'Bấm OK để vẫn lấy link (nhớ bấm "Đăng lên link thật" trước khi gửi), hoặc Cancel để quay lại.'
    );
  }
  function dangNhanhKhach() {
    var c = ghCauHinh();
    if (!c.token) { thongBao('Chưa có GitHub token — vào Cài đặt để nối trước.', 'loi'); chonCum('cai-dat'); return; }
    dang();
  }

  function veKhachMoi(cum) {
    var chuaDang = khachChuaDang();
    if (chuaDang.length) {
      var hopCB = el('div', { class: 'khung' });
      hopCB.appendChild(el('h3', {}, ['⚠️ ' + chuaDang.length + ' khách chưa đăng lên link thật']));
      hopCB.appendChild(el('p', { class: 'muc-nho' }, ['Link cá nhân hoá chỉ hiện đúng tên sau khi danh sách khách được đăng. Trước đó khách mở link sẽ thấy "Quý Khách".']));
      hopCB.appendChild(el('button', { class: 'nut chinh', type: 'button', style: 'margin-top:8px', onclick: dangNhanhKhach }, ['Đăng ngay để link chạy']));
      cum.appendChild(hopCB);
    }

    var toolbar = el('div', { class: 'khach-toolbar' });
    var dxInput = el('input', { type: 'text', placeholder: 'Danh xưng (vd: em, anh, chú)', style: 'width:180px;max-width:100%' });
    var tenInput = el('input', { type: 'text', placeholder: 'Tên khách', style: 'width:200px;max-width:100%' });
    var banSelect = el('select', {}, [el('option', { value: 'nha_trai' }, ['Nhà trai']), el('option', { value: 'nha_gai' }, ['Nhà gái'])]);
    var nutThem = el('button', { class: 'nut', type: 'button', onclick: function () {
      if (!tenInput.value.trim()) { thongBao('Nhập tên khách trước đã', 'loi'); return; }
      var hienThi = chuanHoaTenKhach(dxInput.value, tenInput.value);
      var trung = khach.filter(function (k) { return (k.hienThi || '').toLowerCase() === hienThi.toLowerCase(); });
      if (trung.length && !confirm('Đã có khách tên "' + hienThi + '" trong danh sách. Vẫn thêm một người nữa?')) return;
      khach.push({ ma: taoMaKhach(), danhXung: dxInput.value.trim(), ten: tenInput.value.trim(), hienThi: hienThi, ban: banSelect.value, daGui: false, daDang: false });
      dxInput.value = ''; tenInput.value = '';
      baoThayDoi(); veCum('khach-moi');
    } }, ['+ Thêm khách']);
    toolbar.appendChild(dxInput); toolbar.appendChild(tenInput); toolbar.appendChild(banSelect); toolbar.appendChild(nutThem);
    cum.appendChild(toolbar);
    // BUG-13: bao ngay khi ten dang go da qua khung 279px cua thiep
    cum.appendChild(dungCanhBaoDoDai(tenInput, KHUNG_TEN_KHACH, CO_TEN_KHACH, 'Arial', 'tên khách trên thiệp'));

    var dropImport = el('div', { class: 'drop-import' });
    dropImport.appendChild(el('div', {}, ['Dán danh sách từ Excel (2 cột: Danh xưng ⇥ Tên, mỗi dòng 1 khách)']));
    var taImport = el('textarea', { placeholder: 'em\tTuấn Anh\nanh\tMinh Quân\nchú\tHoàng' });
    dropImport.appendChild(taImport);
    var banImport = el('select', {}, [el('option', { value: 'nha_trai' }, ['Thêm vào: Nhà trai']), el('option', { value: 'nha_gai' }, ['Thêm vào: Nhà gái'])]);
    var oBoQua = el('p', { class: 'canh-bao-do an' });
    var nutImport = el('button', { class: 'nut nho', type: 'button', style: 'margin-top:8px', onclick: function () {
      var dong = taImport.value.split('\n').map(function (d) { return d.trim(); });
      var them = 0, boQua = [];
      dong.forEach(function (d, i) {
        if (!d) return;
        var cot = d.split('\t');
        if (cot.length < 2) cot = d.split(/\s{2,}|,/);
        if (cot.length < 2) { boQua.push('dòng ' + (i + 1) + ': "' + d + '"'); return; }
        var dx = cot[0].trim(), ten = cot.slice(1).join(' ').trim();
        if (!ten) { boQua.push('dòng ' + (i + 1) + ': "' + d + '"'); return; }
        khach.push({ ma: taoMaKhach(), danhXung: dx, ten: ten, hienThi: chuanHoaTenKhach(dx, ten), ban: banImport.value, daGui: false, daDang: false });
        them++;
      });
      taImport.value = '';
      // Diem nho #2: truoc day dong thieu cot bi bo qua HOAN TOAN im lang
      window.__BO_QUA_IMPORT__ = boQua;
      thongBao('Đã thêm ' + them + ' khách' + (boQua.length ? ' — bỏ qua ' + boQua.length + ' dòng thiếu cột Tên' : ''), boQua.length ? 'loi' : '');
      baoThayDoi(); veCum('khach-moi');
    } }, ['Nhập danh sách']);
    dropImport.appendChild(banImport);
    dropImport.appendChild(nutImport);
    dropImport.appendChild(oBoQua);
    if (window.__BO_QUA_IMPORT__ && window.__BO_QUA_IMPORT__.length) {
      oBoQua.textContent = 'Bỏ qua vì thiếu cột thứ 2 (Tên): ' + window.__BO_QUA_IMPORT__.join(' · ');
      oBoQua.classList.remove('an');
      window.__BO_QUA_IMPORT__ = null;
    }
    cum.appendChild(dropImport);

    var bang = el('table', { class: 'ds' });
    var thead = el('thead', {}, [el('tr', {}, [
      el('th', {}, ['Hiển thị']), el('th', {}, ['Bản']), el('th', {}, ['Trạng thái']), el('th', {}, ['Đã gửi']), el('th', {}, ['Link']), el('th', {}, ['']),
    ])]);
    bang.appendChild(thead);
    var tbody = el('tbody', {});
    var ctxDo = document.createElement('canvas').getContext('2d');
    khach.forEach(function (k, idx) {
      var url = linkThiep(k.ban, k.ma);
      var tr = el('tr', {});
      var oTen = el('td', {});
      var oHienThi = el('input', { type: 'text', value: k.hienThi, style: 'width:100%;border:0;background:none;font:inherit' });
      var cb = el('p', { class: 'canh-bao an', style: 'margin:2px 0 0' });
      function doTen() {
        ctxDo.font = CO_TEN_KHACH + 'px Arial';
        var w = ctxDo.measureText(oHienThi.value || '').width;
        if (w > KHUNG_TEN_KHACH) {
          cb.textContent = '⚠️ Dài ~' + Math.round(w) + 'px / khung ' + KHUNG_TEN_KHACH + 'px — thiệp sẽ tự thu nhỏ chữ cho vừa.';
          cb.classList.remove('an');
        } else cb.classList.add('an');
      }
      oHienThi.addEventListener('input', function () { k.hienThi = oHienThi.value; k.daDang = false; doTen(); baoThayDoi(); });
      doTen();
      oTen.appendChild(oHienThi); oTen.appendChild(cb);
      tr.appendChild(oTen);
      tr.appendChild(el('td', {}, [el('span', { class: 'the ' + (k.ban === 'nha_trai' ? 'trai' : 'gai') }, [k.ban === 'nha_trai' ? 'Nhà trai' : 'Nhà gái'])]));
      tr.appendChild(el('td', {}, [
        k.daDang
          ? el('span', { style: 'color:var(--xanh);font-size:12px;white-space:nowrap' }, ['✔ Đã đăng'])
          : el('span', { style: 'color:var(--vang);font-size:12px;white-space:nowrap' }, ['● Chưa đăng']),
      ]));
      var oDaGui = document.createElement('input'); oDaGui.type = 'checkbox'; oDaGui.checked = !!k.daGui;
      oDaGui.addEventListener('change', function () { k.daGui = oDaGui.checked; baoThayDoi(); });
      tr.appendChild(el('td', {}, [oDaGui]));
      tr.appendChild(el('td', {}, [el('a', {
        href: url, target: '_blank', class: 'link-nho',
        onclick: function (ev) { if (!k.daDang && !canhBaoChuaDang(k)) ev.preventDefault(); },
      }, [url.length > 40 ? '...' + url.slice(-34) : url])]));
      var nutXoa = el('button', { class: 'nut nho nguy', type: 'button', onclick: function () {
        if (!confirm('Xoá khách "' + k.hienThi + '"?')) return;
        khach.splice(idx, 1); baoThayDoi(); veCum('khach-moi');
      } }, ['Xoá']);
      var nutChep = el('button', { class: 'nut nho', type: 'button', style: 'margin-right:4px', onclick: function () {
        if (!k.daDang && !canhBaoChuaDang(k)) return;
        navigator.clipboard.writeText(url);
        thongBao(k.daDang ? 'Đã chép link' : 'Đã chép link — NHỚ bấm "Đăng lên link thật" trước khi gửi!', k.daDang ? '' : 'loi');
      } }, ['Chép']);
      tr.appendChild(el('td', {}, [nutChep, nutXoa]));
      tbody.appendChild(tr);
    });
    bang.appendChild(tbody);
    if (!khach.length) cum.appendChild(el('p', { class: 'muc-nho' }, ['Chưa có khách nào. Thêm từng người hoặc dán danh sách ở trên.']));
    else cum.appendChild(bang);

    if (khach.length) {
      var nutXuat = el('button', { class: 'nut nho', type: 'button', style: 'margin-top:10px', onclick: function () {
        // BUG-15: nhan doi dau " + them BOM de Excel tren Windows doc dung tieng Viet
        var q = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
        var dong = [['Danh xung', 'Ten', 'Hien thi', 'Ban', 'Ma', 'Link', 'Da gui', 'Da dang'].map(q).join(',')];
        khach.forEach(function (k) {
          dong.push([
            k.danhXung || '', k.ten || '', k.hienThi || '',
            k.ban === 'nha_trai' ? 'Nha trai' : 'Nha gai', k.ma,
            linkThiep(k.ban, k.ma), k.daGui ? 'x' : '', k.daDang ? 'x' : '',
          ].map(q).join(','));
        });
        var blob = new Blob(['﻿' + dong.join('\r\n')], { type: 'text/csv;charset=utf-8' });
        var href = URL.createObjectURL(blob);
        var a = document.createElement('a'); a.href = href; a.download = 'danh-sach-khach.csv'; a.click();
        setTimeout(function () { URL.revokeObjectURL(href); }, 2000);
      } }, ['Xuất CSV']);
      cum.appendChild(nutXuat);
    }
  }

  // ---------- cai dat ----------
  var MA_APPS_SCRIPT = [
    'function doPost(e) {',
    '  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();',
    '  var d = JSON.parse(e.postData.contents);',
    '  sheet.appendRow([',
    '    new Date(), d.ban || "", d.name || "", d.message || "",',
    '    d.form_item8 || "", d.form_item9 || "", d.form_item10 || ""',
    '  ]);',
    '  return ContentService.createTextOutput("ok");',
    '}',
  ].join('\n');

  function veCaiDat(cum) {
    cum.appendChild(el('div', { class: 'khung' }, [
      el('h3', {}, ['RSVP — nhận phản hồi về Google Sheet']),
      el('p', { class: 'muc-nho' }, ['1. Tạo 1 Google Sheet mới. 2. Vào Tiện ích mở rộng → Apps Script. 3. Xoá code mẫu, dán đoạn dưới đây vào. 4. Bấm Triển khai → Ứng dụng web, quyền truy cập chọn "Bất kỳ ai". 5. Dán URL nhận được vào ô bên dưới.']),
      (function () {
        var ta = el('textarea', { class: 'code', readonly: 'true' });
        ta.value = MA_APPS_SCRIPT;
        return ta;
      })(),
      el('button', { class: 'nut nho', type: 'button', style: 'margin-top:8px', onclick: function () { navigator.clipboard.writeText(MA_APPS_SCRIPT); thongBao('Đã chép mã Apps Script'); } }, ['Chép mã']),
      truong({ nhan: 'URL Apps Script Web App (để trống = chỉ hiện lời cảm ơn, chưa lưu phản hồi)', path: 'rsvp.googleScriptUrl' }),
    ]));

    cum.appendChild(el('div', { class: 'khung' }, [
      el('h3', {}, ['Kết nối GitHub để đăng']),
      el('p', { class: 'muc-nho' }, ['Tạo Personal Access Token (fine-grained) tại github.com → Settings → Developer settings, chỉ cấp quyền Contents: Read & write cho đúng 1 repo "' + GH_MAC_DINH.repo + '". Token chỉ lưu trong trình duyệt này, không gửi đi đâu khác ngoài api.github.com.']),
      (function () {
        var wrap = el('div', { class: 'field nhap-token' });
        var input = el('input', { type: 'password', placeholder: 'ghp_... hoặc github_pat_...' });
        input.value = localStorage.getItem('gh_token') || '';
        input.addEventListener('input', function () { localStorage.setItem('gh_token', input.value); });
        var nutHien = el('button', { class: 'nut nho', type: 'button', onclick: function () { input.type = input.type === 'password' ? 'text' : 'password'; } }, ['Hiện/Ẩn']);
        wrap.appendChild(input); wrap.appendChild(nutHien);
        return wrap;
      })(),
    ]));

    // BUG-20: link thiep khong suy ra tu location.href nua
    cum.appendChild(el('div', { class: 'khung' }, [
      el('h3', {}, ['Địa chỉ gốc của thiệp']),
      el('p', { class: 'muc-nho' }, ['Mọi link ở cụm Tổng quan và link riêng của khách đều dựng từ địa chỉ này. Để mặc định là được — chỉ đổi khi chuyển sang tên miền khác. Nhờ vậy dù mở admin ở máy local thì link chép ra vẫn là link thật, không bao giờ lỡ gửi nhầm localhost.']),
      (function () {
        var wrap = el('div', { class: 'field' });
        var input = el('input', { type: 'text', placeholder: GOC_THIEP_MAC_DINH });
        input.value = gocThiep();
        input.addEventListener('input', function () {
          localStorage.setItem('goc_thiep', input.value.trim() || GOC_THIEP_MAC_DINH);
        });
        wrap.appendChild(input);
        wrap.appendChild(el('button', { class: 'nut nho', type: 'button', style: 'margin-top:8px', onclick: function () {
          localStorage.removeItem('goc_thiep'); input.value = gocThiep(); thongBao('Đã trả về địa chỉ mặc định');
        } }, ['Trả về mặc định']));
        return wrap;
      })(),
    ]));

    cum.appendChild(el('div', { class: 'khung' }, [
      el('h3', {}, ['Bản nháp trong trình duyệt']),
      el('p', { class: 'muc-nho' }, ['Mọi thay đổi được tự lưu nháp vào trình duyệt này, nên lỡ F5 hay sập máy vẫn khôi phục được. Nháp bị xoá sau khi đăng thành công.']),
      el('button', { class: 'nut nho nguy', type: 'button', onclick: function () {
        if (!confirm('Xoá bản nháp đang lưu trong trình duyệt? Dữ liệu đang sửa trên màn hình vẫn giữ nguyên cho tới khi tải lại trang.')) return;
        xoaNhap(); thongBao('Đã xoá bản nháp');
      } }, ['Xoá bản nháp']),
    ]));
  }

  // ---------- dang (publish) ----------
  function demGiaTriMau() {
    var ds = [];
    (duLieu.suKien || []).forEach(function (sk) { if (sk._mau) ds.push('Sự kiện "' + sk.ten + '" (' + sk.ngayDuong + ' ' + sk.gio + ')'); });
    ['nha_trai', 'nha_gai'].forEach(function (ma) {
      ((duLieu.ban[ma].dresscode || {}).mau || []).forEach(function (m) {
        if (m._mau) ds.push('Màu dresscode "' + m.ten + '" — bản ' + (ma === 'nha_trai' ? 'nhà trai' : 'nhà gái'));
      });
    });
    return ds;
  }

  function dang() {
    var c = ghCauHinh();
    if (!c.token) { thongBao('Chưa có GitHub token — vào Cài đặt để nối trước.', 'loi'); chonCum('cai-dat'); return; }

    // BUG-11: sinh thu TRUOC khi hoi, de loi du lieu (ngay trong...) chan dung tai day
    var traiHtml, gaiHtml;
    try {
      traiHtml = sinhBan('nha_trai', { khach: khach }).html;
      gaiHtml = sinhBan('nha_gai', { khach: khach }).html;
    } catch (e) {
      thongBao('Lỗi dữ liệu — CHƯA đăng gì cả: ' + e.message, 'loi');
      return;
    }

    // BUG-09: hoi lai truoc khi ghi de link that
    var mau = demGiaTriMau();
    var chuaDang = khach.filter(function (k) { return !k.daDang; }).length;
    var hoi = [
      'ĐĂNG LÊN LINK THẬT?',
      '',
      'Sẽ GHI ĐÈ trực tiếp lên link khách đang xem:',
      '  · ' + gocThiep() + 'nha-trai/',
      '  · ' + gocThiep() + 'nha-gai/',
      '  · danh sách khách (' + khach.length + ' khách' + (chuaDang ? ', ' + chuaDang + ' khách mới' : '') + ')',
      '  · dữ liệu gốc du-lieu.json',
      '',
      lanDangCuoi ? 'Lần đăng gần nhất: ' + lanDangCuoi : 'Chưa từng đăng từ máy/trình duyệt này.',
    ];
    if (mau.length) {
      hoi.push('');
      hoi.push('⚠️ CÒN ' + mau.length + ' GIÁ TRỊ MẪU CHƯA XÁC NHẬN:');
      mau.slice(0, 8).forEach(function (t) { hoi.push('  · ' + t); });
      if (mau.length > 8) hoi.push('  · … và ' + (mau.length - 8) + ' giá trị nữa');
      hoi.push('Vẫn đăng thì khách sẽ thấy các giá trị mẫu này.');
    }
    hoi.push('');
    hoi.push('Bấm OK để đăng.');
    if (!confirm(hoi.join('\n'))) { thongBao('Đã huỷ — chưa đăng gì cả.'); return; }

    var nut = document.getElementById('nutDang');
    nut.disabled = true; nut.textContent = 'Đang đăng...';
    var luc = new Date().toLocaleString('vi-VN');
    Promise.all([
      ghPutFile('du-lieu.json', JSON.stringify(duLieu, null, 2), 'Cap nhat du lieu tu admin - ' + luc),
      ghPutFile('khach.json', JSON.stringify(khach, null, 2), 'Cap nhat danh sach khach tu admin - ' + luc),
      ghPutFile('nha-trai/index.html', traiHtml, 'Sinh lai thiep nha trai tu admin - ' + luc),
      ghPutFile('nha-gai/index.html', gaiHtml, 'Sinh lai thiep nha gai tu admin - ' + luc),
    ]).then(function () {
      DA_SUA = false;
      // BUG-06: sau khi dang thanh cong, moi khach moi thuc su co tren link that
      khach.forEach(function (k) { k.daDang = true; });
      lanDangCuoi = luc;
      try { localStorage.setItem('thiep_lan_dang_cuoi', luc); } catch (e) {}
      xoaNhap(); // BUG-08: dang xong thi khong con nhap "chua dang" nua
      capNhatThanhTrangThai();
      document.getElementById('lanLuuCuoi').textContent = 'Đăng lúc ' + luc + ' — GitHub Pages cần 30-60s để cập nhật';
      thongBao('Đã đăng thành công!', 'ok');
      if (cumHienTai === 'khach-moi' || cumHienTai === 'tong-quan') veCum(cumHienTai);
    }).catch(function (e) {
      thongBao('Đăng thất bại: ' + e.message, 'loi');
    }).finally(function () {
      nut.disabled = false; nut.textContent = 'Đăng lên link thật';
    });
  }

  // ---------- khoi dong ----------
  function taiDuLieu() {
    return Promise.all([
      fetch('../du-lieu.json').then(function (r) { return r.json(); }),
      fetch('../khach.json').then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
      fetch('../thiep-khong-prewedding.html').then(function (r) { return r.text(); }),
    ]).then(function (kq) {
      duLieu = kq[0]; khach = kq[1] || []; gocHtml = kq[2];
      // khach tai tu server => chac chan da co tren link that
      khach.forEach(function (k) { if (k.daDang === undefined) k.daDang = true; });

      // BUG-08: co ban nhap chua dang thi hoi khoi phuc
      var nhap = docNhap();
      if (nhap) {
        var luc = new Date(nhap.luc);
        var chu = isNaN(luc.getTime()) ? '(không rõ lúc nào)' : luc.toLocaleString('vi-VN');
        var co = confirm(
          'Có một bản nháp CHƯA ĐĂNG được lưu lúc ' + chu + '.\n\n' +
          'Bấm OK để khôi phục bản nháp đó (tiếp tục sửa dở).\n' +
          'Bấm Cancel để bỏ nháp và dùng bản đang chạy trên link thật.'
        );
        if (co) {
          duLieu = nhap.duLieu;
          if (Array.isArray(nhap.khach)) khach = nhap.khach;
          DA_SUA = true;
          setTimeout(function () { thongBao('Đã khôi phục bản nháp lúc ' + chu + ' — nhớ bấm "Đăng lên link thật".', 'ok'); }, 300);
        } else {
          xoaNhap();
        }
      }
    });
  }

  function ganChonBan() {
    document.getElementById('chonTrai').addEventListener('click', function () {
      banXem = 'nha_trai';
      document.getElementById('chonTrai').classList.add('active');
      document.getElementById('chonGai').classList.remove('active');
      veXemTruocNgay();
    });
    document.getElementById('chonGai').addEventListener('click', function () {
      banXem = 'nha_gai';
      document.getElementById('chonGai').classList.add('active');
      document.getElementById('chonTrai').classList.remove('active');
      veXemTruocNgay();
    });
    document.getElementById('nutXemLink').addEventListener('click', function () {
      window.open(linkThiep(banXem), '_blank');
    });
    document.getElementById('nutDang').addEventListener('click', function () { dang(); });
    window.addEventListener('beforeunload', function (e) { if (DA_SUA) { e.preventDefault(); e.returnValue = ''; } });
    // BUG-01: doi be ngang cua so -> tinh lai ti le thu nho cua khung xem truoc
    var henScale = null;
    window.addEventListener('resize', function () {
      clearTimeout(henScale);
      henScale = setTimeout(capNhatScaleXem, 120);
    });
  }

  taiDuLieu().then(function () {
    DANG_TAI_BAN_DAU = false;
    veNav();
    ganChonBan();
    chonCum('tong-quan');
    capNhatScaleXem();
    veXemTruocNgay();
    capNhatThanhTrangThai();
  }).catch(function (e) {
    document.getElementById('cotGiua').innerHTML = '<p style="color:#b5493f">Không tải được dữ liệu: ' + e.message + '</p>';
  });
})();
