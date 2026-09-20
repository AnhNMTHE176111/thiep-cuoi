// Admin thiep cuoi — thuan JS, khong build tool.
// Doc/ghi du-lieu.json + khach.json + 2 file thiep ngay trong repo dang host qua GitHub Contents API.
(function () {
  'use strict';

  var GH_MAC_DINH = { owner: 'AnhNMTHE176111', repo: 'thiep-cuoi', branch: 'main' };
  var DA_SUA = false;
  var DANG_TAI_BAN_DAU = true;
  var duLieu = null;
  var khach = [];
  var gocHtml = '';
  var banXem = 'nha_trai';
  var cumHienTai = 'tong-quan';
  var hoanTacTimer = null;

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
      if (k === 'class') e.className = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    });
    (con || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function baoThayDoi() {
    DA_SUA = true;
    if (DANG_TAI_BAN_DAU) return;
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
      chu.textContent = 'Có thay đổi chưa đăng';
    } else {
      thanh.classList.add('sach'); cham.classList.add('sach');
      chu.textContent = 'Đã đăng — không có thay đổi mới';
    }
  }

  // ---------- chuan hoa ten (dung cho khach moi) ----------
  function vietTitleCase(str) {
    str = (str || '').normalize('NFC').trim().replace(/\s+/g, ' ');
    if (!str) return '';
    return str.split(' ').map(function (w) {
      if (!w) return w;
      var dau = w.slice(0, 1).toLocaleUpperCase('vi');
      var sau = w.slice(1).toLocaleLowerCase('vi');
      return dau + sau;
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
  function ghPutFile(path, noiDung, message) {
    var c = ghCauHinh();
    return ghGetSha(path).then(function (sha) {
      var url = 'https://api.github.com/repos/' + c.owner + '/' + c.repo + '/contents/' + path;
      var body = { message: message, content: b64EncodeUtf8(noiDung), branch: c.branch };
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
  function sinhBan(ma) {
    return SinhThiep.sinh(gocHtml, duLieu, ma);
  }
  var veXemTruocDebounce = null;
  function veXemTruoc() {
    clearTimeout(veXemTruocDebounce);
    veXemTruocDebounce = setTimeout(function () {
      try {
        var kq = sinhBan(banXem);
        document.getElementById('khungXem').srcdoc = kq.html;
      } catch (e) { console.error('loi ve xem truoc', e); }
    }, 250);
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
  function truong(cfg) {
    var wrap = el('div', { class: 'field' });
    wrap.appendChild(el('label', {}, [cfg.nhan]));
    var input;
    if (cfg.kieu === 'textarea') input = el('textarea', {});
    else if (cfg.kieu === 'mau') input = el('input', { type: 'color' });
    else if (cfg.kieu === 'time') input = el('input', { type: 'time' });
    else if (cfg.kieu === 'date') input = el('input', { type: 'date' });
    else if (cfg.kieu === 'select') {
      input = el('select', {});
      (cfg.tuyChon || []).forEach(function (o) { input.appendChild(el('option', { value: o.gia }, [o.nhan])); });
    } else input = el('input', { type: 'text' });
    var giaTri = layPath(duLieu, cfg.path);
    input.value = giaTri == null ? '' : giaTri;
    input.addEventListener('input', function () {
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
    if (cfg.goiY) wrap.appendChild(el('p', { class: 'goi-y' }, [cfg.goiY]));
    if (cfg.mau) wrap.appendChild(el('p', { class: 'canh-bao' }, ['⚠️ Giá trị MẪU — cần xác nhận lại trước khi gửi khách.']));
    return wrap;
  }

  function dungCanhBaoDoDai(input, boxW, fontPx, fontFamily) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var canhBao = el('p', { class: 'canh-bao an' });
    function kiemTra() {
      ctx.font = fontPx + 'px ' + (fontFamily || 'Arial');
      var w = ctx.measureText(input.value).width;
      if (w > boxW) {
        canhBao.textContent = '⚠️ Chữ dài ' + Math.round(w) + 'px, khung chỉ vừa ' + boxW + 'px — có thể tràn dòng.';
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
      var thuMuc = ma === 'nha_trai' ? 'nha-trai' : 'nha-gai';
      var url = new URL('../' + thuMuc + '/', location.href).href;
      var hang = el('div', { style: 'display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f0ebe3' }, [
        el('div', {}, [el('b', {}, [ma === 'nha_trai' ? 'Nhà trai' : 'Nhà gái']), el('div', { class: 'muc-nho' }, [url])]),
      ]);
      var nutChep = el('button', { class: 'nut nho', type: 'button', onclick: function () { navigator.clipboard.writeText(url); thongBao('Đã chép link'); } }, ['Chép link']);
      hang.appendChild(nutChep);
      khung.appendChild(hang);
    });
    cum.appendChild(khung);

    var khung2 = el('div', { class: 'khung' }, [
      el('h3', {}, ['Số khách đã tạo link riêng']),
      el('p', {}, [String(khach.length) + ' khách']),
    ]);
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
    cum.appendChild(el('div', { class: 'khung' }, [
      el('h3', {}, ['Chung']),
      truong({ nhan: 'Monogram (2 chữ cái đầu)', path: 'chung.monogram' }),
    ]));
  }

  function veNhaChung(cum, tienTo, ten) {
    cum.appendChild(el('div', { class: 'khung' }, [
      el('h3', {}, [ten]),
      truong({ nhan: 'Tên ông', path: tienTo + '.ong' }),
      truong({ nhan: 'Tên bà', path: tienTo + '.ba' }),
      truong({ nhan: 'Địa chỉ', path: tienTo + '.diaChi', kieu: 'textarea' }),
    ]));
  }

  function veDiaDiem(cum) {
    Object.keys(duLieu.diaDiem).forEach(function (ma) {
      var dd = duLieu.diaDiem[ma];
      cum.appendChild(el('div', { class: 'khung' }, [
        el('h3', {}, [dd.ten]),
        truong({ nhan: 'Tên hiển thị', path: 'diaDiem.' + ma + '.ten' }),
        truong({ nhan: 'Địa chỉ (dùng <br> để ngắt dòng nếu cần)', path: 'diaDiem.' + ma + '.diaChi', kieu: 'textarea', goiY: 'Tên địa điểm chỉ vừa 1 dòng ~18 ký tự hoa. Địa chỉ nên chia 2 dòng bằng <br>.' }),
        truong({ nhan: 'Link Google Maps', path: 'diaDiem.' + ma + '.map', goiY: 'Dạng: https://www.google.com/maps/search/?api=1&query=...' }),
      ]));
    });
  }

  function veLichTrinh(cum) {
    duLieu.suKien.forEach(function (sk, idx) {
      var khung = el('div', { class: 'khung' });
      khung.appendChild(el('h3', {}, [sk.ten + (sk._mau ? '<span class="chip-mau">mẫu</span>' : '')].map(function(x){return x;})));
      if (sk._mau) khung.querySelector('h3').innerHTML = sk.ten + ' <span class="chip-mau">MẪU — cần xác nhận</span>';
      khung.appendChild(truong({ nhan: 'Tên sự kiện', path: 'suKien.' + idx + '.ten' }));
      var hang = el('div', { class: 'hang2' });
      hang.appendChild(truong({ nhan: 'Ngày dương', path: 'suKien.' + idx + '.ngayDuong', kieu: 'date' }));
      hang.appendChild(truong({
        nhan: 'Giờ', path: 'suKien.' + idx + '.gio', kieu: 'time',
        khiSua: function () { duLieu.suKien[idx]._mau = false; },
        veLaiCum: true,
      }));
      khung.appendChild(hang);
      var chonDD = truong({
        nhan: 'Địa điểm', path: 'suKien.' + idx + '.diaDiemMa', kieu: 'select',
        tuyChon: Object.keys(duLieu.diaDiem).map(function (m) { return { gia: m, nhan: duLieu.diaDiem[m].ten }; }),
      });
      khung.appendChild(chonDD);
      cum.appendChild(khung);
    });
  }

  function veLoiMoi(cum, ma) {
    var b = duLieu.ban[ma];
    var tenBan = ma === 'nha_trai' ? 'nhà trai' : 'nhà gái';
    cum.appendChild(el('div', { class: 'khung' }, [
      el('h3', {}, ['Câu mời chính']),
      truong({ nhan: 'Câu mời (dùng <br> để xuống dòng)', path: 'ban.' + ma + '.loiMoi', kieu: 'textarea' }),
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
      var oNhan = truong({ nhan: 'Nhãn hiển thị (vừa khung ~198px, ~12 ký tự hoa)', path: 'ban.' + ma + '.chuongTrinh.' + idx + '.nhan' });
      khung.appendChild(oNhan);
      cum.appendChild(khung);
    });
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
    b.dresscode.mau.forEach(function (m, idx) {
      var hang = el('div', { class: 'khung' });
      hang.appendChild(el('h3', {}, ['Màu ' + (idx + 1) + (m._mau ? ' — mẫu' : '')]));
      var h2 = el('div', { class: 'hang2' });
      h2.appendChild(truong({ nhan: 'Tên màu', path: 'ban.' + ma + '.dresscode.mau.' + idx + '.ten' }));
      h2.appendChild(truong({ nhan: 'Mã màu', path: 'ban.' + ma + '.dresscode.mau.' + idx + '.hex', kieu: 'mau',
        khiSua: function () { m._mau = false; }, veLaiCum: true }));
      hang.appendChild(h2);
      if (m._mau) hang.appendChild(el('p', { class: 'canh-bao' }, ['⚠️ Mã màu MẪU — nên đối chiếu với thiệp giấy/thiết kế thật trước khi gửi khách.']));
      cum.appendChild(hang);
    });
  }

  function veAnhNhac(cum) {
    cum.appendChild(el('div', { class: 'khung' }, [
      el('h3', {}, ['Ảnh pre-wedding (dùng chung 2 bản)']),
      el('p', { class: 'muc-nho' }, ['Dán link ảnh đã tải lên CDN (hoặc ảnh trong bộ ảnh cưới). Ảnh nên xoay dọc/ngang đúng như ghi chú.']),
    ]));
    Object.keys(duLieu.anh).forEach(function (khoa) {
      var a = duLieu.anh[khoa];
      var khung = el('div', { class: 'khung' });
      khung.appendChild(el('h3', {}, [a.ghiChu || khoa]));
      var hang = el('div', { style: 'display:flex;gap:12px;align-items:flex-start' });
      var anhXem = el('img', { src: a.url, style: 'width:80px;height:80px;object-fit:cover;border-radius:8px;border:1px solid var(--vien)' });
      var oNhap = el('div', { style: 'flex:1' });
      oNhap.appendChild(truong({ nhan: 'Link ảnh', path: 'anh.' + khoa + '.url', khiSua: function () { anhXem.src = duLieu.anh[khoa].url; } }));
      hang.appendChild(anhXem); hang.appendChild(oNhap);
      khung.appendChild(hang);
      cum.appendChild(khung);
    });
    cum.appendChild(el('div', { class: 'khung' }, [
      el('h3', {}, ['Nhạc nền']),
      truong({ nhan: 'Link file nhạc (mp3)', path: 'nhac.url' }),
      (function () {
        var wrap = el('div', { class: 'field' });
        var lbl = el('label', { class: 'cong-tac' }, [
          (function () { var i = document.createElement('input'); i.type = 'checkbox'; i.checked = !!duLieu.nhac.tuPhat;
            i.addEventListener('change', function () { duLieu.nhac.tuPhat = i.checked; baoThayDoi(); }); return i; })(),
          el('span', { class: 'bi' }), el('span', {}, ['Tự phát khi mở thiệp']),
        ]);
        wrap.appendChild(lbl);
        return wrap;
      })(),
    ]));
  }

  // ---------- khach moi ----------
  function veKhachMoi(cum) {
    var toolbar = el('div', { class: 'khach-toolbar' });
    var dxInput = el('input', { type: 'text', placeholder: 'Danh xưng (vd: em, anh, chú)', style: 'width:180px;max-width:100%' });
    var tenInput = el('input', { type: 'text', placeholder: 'Tên khách', style: 'width:200px;max-width:100%' });
    var banSelect = el('select', {}, [el('option', { value: 'nha_trai' }, ['Nhà trai']), el('option', { value: 'nha_gai' }, ['Nhà gái'])]);
    var nutThem = el('button', { class: 'nut', type: 'button', onclick: function () {
      if (!tenInput.value.trim()) { thongBao('Nhập tên khách trước đã', 'loi'); return; }
      khach.push({ ma: taoMaKhach(), danhXung: dxInput.value.trim(), ten: tenInput.value.trim(), hienThi: chuanHoaTenKhach(dxInput.value, tenInput.value), ban: banSelect.value, daGui: false });
      dxInput.value = ''; tenInput.value = '';
      baoThayDoi(); veCum('khach-moi');
    } }, ['+ Thêm khách']);
    toolbar.appendChild(dxInput); toolbar.appendChild(tenInput); toolbar.appendChild(banSelect); toolbar.appendChild(nutThem);
    cum.appendChild(toolbar);

    var dropImport = el('div', { class: 'drop-import' });
    dropImport.appendChild(el('div', {}, ['Dán danh sách từ Excel (2 cột: Danh xưng ⇥ Tên, mỗi dòng 1 khách)']));
    var taImport = el('textarea', { placeholder: 'em\tTuấn Anh\nanh\tMinh Quân\nchú\tHoàng' });
    dropImport.appendChild(taImport);
    var banImport = el('select', {}, [el('option', { value: 'nha_trai' }, ['Thêm vào: Nhà trai']), el('option', { value: 'nha_gai' }, ['Thêm vào: Nhà gái'])]);
    var nutImport = el('button', { class: 'nut nho', type: 'button', style: 'margin-top:8px', onclick: function () {
      var dong = taImport.value.split('\n').map(function (d) { return d.trim(); }).filter(Boolean);
      var them = 0;
      dong.forEach(function (d) {
        var cot = d.split('\t');
        if (cot.length < 2) cot = d.split(/\s{2,}|,/);
        if (cot.length < 2) return;
        var dx = cot[0].trim(), ten = cot.slice(1).join(' ').trim();
        if (!ten) return;
        khach.push({ ma: taoMaKhach(), danhXung: dx, ten: ten, hienThi: chuanHoaTenKhach(dx, ten), ban: banImport.value, daGui: false });
        them++;
      });
      taImport.value = '';
      thongBao('Đã thêm ' + them + ' khách');
      baoThayDoi(); veCum('khach-moi');
    } }, ['Nhập danh sách']);
    dropImport.appendChild(banImport);
    dropImport.appendChild(nutImport);
    cum.appendChild(dropImport);

    var bang = el('table', { class: 'ds' });
    var thead = el('thead', {}, [el('tr', {}, [
      el('th', {}, ['Hiển thị']), el('th', {}, ['Bản']), el('th', {}, ['Đã gửi']), el('th', {}, ['Link']), el('th', {}, ['']),
    ])]);
    bang.appendChild(thead);
    var tbody = el('tbody', {});
    khach.forEach(function (k, idx) {
      var thuMuc = k.ban === 'nha_trai' ? 'nha-trai' : 'nha-gai';
      var url = new URL('../' + thuMuc + '/?k=' + k.ma, location.href).href;
      var tr = el('tr', {});
      var oHienThi = el('input', { type: 'text', value: k.hienThi, style: 'width:100%;border:0;background:none;font:inherit' });
      oHienThi.addEventListener('input', function () { k.hienThi = oHienThi.value; baoThayDoi(); });
      tr.appendChild(el('td', {}, [oHienThi]));
      tr.appendChild(el('td', {}, [el('span', { class: 'the ' + (k.ban === 'nha_trai' ? 'trai' : 'gai') }, [k.ban === 'nha_trai' ? 'Nhà trai' : 'Nhà gái'])]));
      var oDaGui = document.createElement('input'); oDaGui.type = 'checkbox'; oDaGui.checked = !!k.daGui;
      oDaGui.addEventListener('change', function () { k.daGui = oDaGui.checked; baoThayDoi(); });
      tr.appendChild(el('td', {}, [oDaGui]));
      tr.appendChild(el('td', {}, [el('a', { href: url, target: '_blank', class: 'link-nho' }, [url.length > 40 ? '...' + url.slice(-34) : url])]));
      var nutXoa = el('button', { class: 'nut nho nguy', type: 'button', onclick: function () {
        if (!confirm('Xoá khách "' + k.hienThi + '"?')) return;
        khach.splice(idx, 1); baoThayDoi(); veCum('khach-moi');
      } }, ['Xoá']);
      var nutChep = el('button', { class: 'nut nho', type: 'button', style: 'margin-right:4px', onclick: function () { navigator.clipboard.writeText(url); thongBao('Đã chép link'); } }, ['Chép']);
      tr.appendChild(el('td', {}, [nutChep, nutXoa]));
      tbody.appendChild(tr);
    });
    bang.appendChild(tbody);
    if (!khach.length) cum.appendChild(el('p', { class: 'muc-nho' }, ['Chưa có khách nào. Thêm từng người hoặc dán danh sách ở trên.']));
    else cum.appendChild(bang);

    if (khach.length) {
      var nutXuat = el('button', { class: 'nut nho', type: 'button', style: 'margin-top:10px', onclick: function () {
        var csv = 'Hien thi,Ban,Link,Da gui\n' + khach.map(function (k) {
          var thuMuc = k.ban === 'nha_trai' ? 'nha-trai' : 'nha-gai';
          var url = new URL('../' + thuMuc + '/?k=' + k.ma, location.href).href;
          return '"' + k.hienThi + '","' + k.ban + '","' + url + '","' + (k.daGui ? 'x' : '') + '"';
        }).join('\n');
        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'danh-sach-khach.csv'; a.click();
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
  }

  // ---------- dang (publish) ----------
  function dang() {
    var c = ghCauHinh();
    if (!c.token) { thongBao('Chưa có GitHub token — vào Cài đặt để nối trước.', 'loi'); chonCum('cai-dat'); return; }
    var nut = document.getElementById('nutDang');
    nut.disabled = true; nut.textContent = 'Đang đăng...';
    var traiHtml, gaiHtml;
    try {
      traiHtml = sinhBan('nha_trai').html;
      gaiHtml = sinhBan('nha_gai').html;
    } catch (e) {
      thongBao('Lỗi khi sinh thiệp: ' + e.message, 'loi');
      nut.disabled = false; nut.textContent = 'Đăng lên link thật';
      return;
    }
    var luc = new Date().toLocaleString('vi-VN');
    Promise.all([
      ghPutFile('du-lieu.json', JSON.stringify(duLieu, null, 2), 'Cap nhat du lieu tu admin - ' + luc),
      ghPutFile('khach.json', JSON.stringify(khach, null, 2), 'Cap nhat danh sach khach tu admin - ' + luc),
      ghPutFile('nha-trai/index.html', traiHtml, 'Sinh lai thiep nha trai tu admin - ' + luc),
      ghPutFile('nha-gai/index.html', gaiHtml, 'Sinh lai thiep nha gai tu admin - ' + luc),
    ]).then(function () {
      DA_SUA = false;
      capNhatThanhTrangThai();
      document.getElementById('lanLuuCuoi').textContent = 'Đăng lúc ' + luc + ' — GitHub Pages cần 30-60s để cập nhật';
      thongBao('Đã đăng thành công!', 'ok');
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
    });
  }

  function ganChonBan() {
    document.getElementById('chonTrai').addEventListener('click', function () {
      banXem = 'nha_trai';
      document.getElementById('chonTrai').classList.add('active');
      document.getElementById('chonGai').classList.remove('active');
      veXemTruoc();
    });
    document.getElementById('chonGai').addEventListener('click', function () {
      banXem = 'nha_gai';
      document.getElementById('chonGai').classList.add('active');
      document.getElementById('chonTrai').classList.remove('active');
      veXemTruoc();
    });
    document.getElementById('nutXemLink').addEventListener('click', function () {
      var thuMuc = banXem === 'nha_trai' ? 'nha-trai' : 'nha-gai';
      window.open(new URL('../' + thuMuc + '/', location.href).href, '_blank');
    });
    document.getElementById('nutDang').addEventListener('click', dang);
    window.addEventListener('beforeunload', function (e) { if (DA_SUA) { e.preventDefault(); e.returnValue = ''; } });
  }

  taiDuLieu().then(function () {
    DANG_TAI_BAN_DAU = false;
    veNav();
    ganChonBan();
    chonCum('tong-quan');
    veXemTruoc();
    capNhatThanhTrangThai();
  }).catch(function (e) {
    document.getElementById('cotGiua').innerHTML = '<p style="color:#b5493f">Không tải được dữ liệu: ' + e.message + '</p>';
  });
})();
