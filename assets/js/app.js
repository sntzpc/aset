// --- MASTER DATA --- //
const SHEET_ID = '1lRFH01IHzA_dz_rzpUMQ0z4ZyE7Ek0eoUuYs84oHkwI';
const GOOGLE_API_KEY = 'AIzaSyBf3LLK72GTjY-m4Wzh8vd0BBIujgyH5t0';

// Helper konversi dari array-of-array ke array-of-object
function parseSheetRows(values) {
  if (!values || values.length === 0) return [];
  const headers = values[0];
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] || '';
    });
    return obj;
  });
}

const DASHBOARD_SHEET_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Daftar%20Aset?key=${GOOGLE_API_KEY}`;
const DAFTAR_ASET_SHEET_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Daftar%20Aset?key=${GOOGLE_API_KEY}`;
const MASTER_SHEET_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Master%20Barang?key=${GOOGLE_API_KEY}`;
const AUTH_API_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Auth?key=${GOOGLE_API_KEY}`;

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxOsD8nwHHpk7j-W65NDDDmFyZEDXi_QBBBnByeO6gAQRdBGUxvRAR7zL_Ii5oUut110Q/exec';
const PINJAM_SHEET_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz8i7CXrMj8zpBf7X6wn_24TBhEsvgQWY6-PcyrF1p3Q6muQ4TPgcr6wYwpXxo0erXB/exec';
const PASS_SHEET_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzvqkYuGGsEKPyWGnCwyOUpi7yaYJEm8xV7M6kZfaxkMeWSGt2VAtJyBuUKoLPT120/exec';

const TELEGRAM_BOT_TOKEN = '7520083448:AAHbf4QgZurXd8gbI2OnM0PxD8jK_zAXJ08';
const TELEGRAM_CHAT_ID = '968137878';


let loginModalBS;

function showLoginModal() {
  if (!loginModalBS) {
    const el = document.getElementById('loginModal');
    if (el) loginModalBS = new bootstrap.Modal(el, { backdrop: 'static', keyboard: false });
  }
  if (loginModalBS) loginModalBS.show();
}

function hideLoginModal() {
  if (!loginModalBS) {
    const el = document.getElementById('loginModal');
    if (el) loginModalBS = new bootstrap.Modal(el, { backdrop: 'static', keyboard: false });
  }
  if (loginModalBS) loginModalBS.hide();
}

const LS = window.localStorage;

// Helpers
function uuid() {
  return Date.now() + '-' + Math.random().toString(16).slice(2);
}

function getData(key) {
  return JSON.parse(LS.getItem(key) || '[]');
}

function setData(key, data) {
  LS.setItem(key, JSON.stringify(data));
}


function renderPaging(current, maxPage, setPageFuncName) {
  if (maxPage <= 1) return '';
  let html = '<nav><ul class="pagination pagination-sm mb-0">';

  // Prev
  html += `<li class="page-item ${current === 1 ? 'disabled' : ''}">
    <button class="page-link" onclick="${setPageFuncName}(${current-1})" ${current===1?'disabled':''}>&laquo; Prev</button>
  </li>`;

  // Numbering with ellipsis
  let pages = [];
  if (maxPage <= 7) {
    for (let i=1; i<=maxPage; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 4) pages.push('...');
    for (let i = Math.max(2, current-1); i <= Math.min(maxPage-1, current+1); i++) {
      pages.push(i);
    }
    if (current < maxPage-3) pages.push('...');
    pages.push(maxPage);
  }

  pages.forEach(p => {
    if (p === '...') {
      html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    } else {
      html += `<li class="page-item ${p === current ? 'active' : ''}">
        <button class="page-link" onclick="${setPageFuncName}(${p})">${p}</button>
      </li>`;
    }
  });

  // Next
  html += `<li class="page-item ${current === maxPage ? 'disabled' : ''}">
    <button class="page-link" onclick="${setPageFuncName}(${current+1})" ${current===maxPage?'disabled':''}>Next &raquo;</button>
  </li>`;

  html += '</ul></nav>';
  return html;
}

let bangunanCurrentPage = 1;

// Fungsi pencarian
function filterBangunanData(data, keyword) {
  if (!keyword) return data;
  keyword = keyword.toLowerCase();
  return data.filter(row =>
    Object.values(row).some(val => (val || '').toString().toLowerCase().includes(keyword))
  );
}

function refreshBangunan() {
  const bangunan = getData('bangunan');
  const list = document.getElementById('listBangunan');
  const select = document.getElementById('bangunanRuang');
  const showCount = parseInt(document.getElementById('bangunanShowCount')?.value || 10);
  const searchKeyword = document.getElementById('bangunanSearchAll')?.value || '';
  list.innerHTML = '';
  select.innerHTML = '<option value="">Pilih Bangunan</option>';

  // Search
  let dataTampil = filterBangunanData(bangunan, searchKeyword);

  // Paging
  const totalRows = dataTampil.length;
  const maxPage = Math.ceil(totalRows / showCount);
  if (bangunanCurrentPage > maxPage) bangunanCurrentPage = 1;
  const startIdx = (bangunanCurrentPage - 1) * showCount;
  const rowsPage = dataTampil.slice(startIdx, startIdx + showCount);

  rowsPage.forEach(b => {
    list.innerHTML += `<li class="list-group-item d-flex justify-content-between align-items-center">
      ${b.nama}
      <button class="btn btn-sm btn-danger" onclick="deleteBangunan('${b.id}')">Hapus</button>
    </li>`;
    select.innerHTML += `<option value="${b.id}">${b.nama}</option>`;
  });

  // Paging control
  document.getElementById('bangunanPaging').innerHTML =
  renderPaging(ruanganCurrentPage, maxPage, 'setBangunanPage');
}

window.setBangunanPage = function(page) {
  bangunanCurrentPage = page;
  refreshBangunan();
}

document.getElementById('bangunanShowCount').onchange = function () {
  bangunanCurrentPage = 1;
  refreshBangunan();
};
document.getElementById('bangunanSearchAll').oninput = function () {
  bangunanCurrentPage = 1;
  refreshBangunan();
};


let ruanganCurrentPage = 1;

function filterRuanganData(data, keyword) {
  if (!keyword) return data;
  keyword = keyword.toLowerCase();
  return data.filter(row =>
    Object.values(row).some(val => (val || '').toString().toLowerCase().includes(keyword))
  );
}

function refreshRuangan() {
  const ruangan = getData('ruangan');
  const bangunan = getData('bangunan');
  const list = document.getElementById('listRuangan');
  const showCount = parseInt(document.getElementById('ruanganShowCount')?.value || 10);
  const searchKeyword = document.getElementById('ruanganSearchAll')?.value || '';
  list.innerHTML = '';

  // Search
  let dataTampil = filterRuanganData(ruangan, searchKeyword);

  // Paging
  const totalRows = dataTampil.length;
  const maxPage = Math.ceil(totalRows / showCount);
  if (ruanganCurrentPage > maxPage) ruanganCurrentPage = 1;
  const startIdx = (ruanganCurrentPage - 1) * showCount;
  const rowsPage = dataTampil.slice(startIdx, startIdx + showCount);

  rowsPage.forEach(r => {
    const namaBangunan = bangunan.find(b => b.id === r.bangunanId)?.nama || '-';
    list.innerHTML += `<li class="list-group-item d-flex justify-content-between align-items-center">
      <span>${namaBangunan} - ${r.nama}</span>
      <button class="btn btn-sm btn-danger" onclick="deleteRuangan('${r.id}')">Hapus</button>
    </li>`;
  });

  // Paging control
  document.getElementById('ruanganPaging').innerHTML =
  renderPaging(ruanganCurrentPage, maxPage, 'setRuanganPage');
}

window.setRuanganPage = function(page) {
  ruanganCurrentPage = page;
  refreshRuangan();
}

document.getElementById('ruanganShowCount').onchange = function () {
  ruanganCurrentPage = 1;
  refreshRuangan();
};
document.getElementById('ruanganSearchAll').oninput = function () {
  ruanganCurrentPage = 1;
  refreshRuangan();
};


let barangCurrentPage = 1;

function filterBarangData(data, keyword) {
  if (!keyword) return data;
  keyword = keyword.toLowerCase();
  return data.filter(row =>
    Object.values(row).some(val => (val || '').toString().toLowerCase().includes(keyword))
  );
}

function refreshBarang() {
  const barang = getData('barang');
  const list = document.getElementById('listBarang');
  const showCount = parseInt(document.getElementById('barangShowCount')?.value || 10);
  const searchKeyword = document.getElementById('barangSearchAll')?.value || '';
  list.innerHTML = '';

  // Search
  let dataTampil = filterBarangData(barang, searchKeyword);

  // Paging
  const totalRows = dataTampil.length;
  const maxPage = Math.ceil(totalRows / showCount);
  if (barangCurrentPage > maxPage) barangCurrentPage = 1;
  const startIdx = (barangCurrentPage - 1) * showCount;
  const rowsPage = dataTampil.slice(startIdx, startIdx + showCount);

  rowsPage.forEach(b => {
    list.innerHTML += `<li class="list-group-item d-flex justify-content-between align-items-center">
      <span>
        <b>${b.nama}</b> 
        ${b.kategori ? `(${b.kategori})` : ''} 
        ${b.spesifikasi ? `- ${b.spesifikasi}` : ''}
      </span>
      <button class="btn btn-sm btn-danger" onclick="deleteBarang('${b.id}')">Hapus</button>
    </li>`;
  });

  // Paging control
  document.getElementById('barangPaging').innerHTML =
  renderPaging(barangCurrentPage, maxPage, 'setBarangPage');
}

window.setBarangPage = function(page) {
  barangCurrentPage = page;
  refreshBarang();
}

document.getElementById('barangShowCount').onchange = function () {
  barangCurrentPage = 1;
  refreshBarang();
};
document.getElementById('barangSearchAll').oninput = function () {
  barangCurrentPage = 1;
  refreshBarang();
};


// CRUD Bangunan
document.getElementById('formBangunan').onsubmit = function (e) {
  e.preventDefault();
  const nama = document.getElementById('namaBangunan').value.trim();
  if (!nama) return;
  const bangunan = getData('bangunan');
  bangunan.push({
    id: uuid(),
    nama
  });
  setData('bangunan', bangunan);
  document.getElementById('formBangunan').reset();
  refreshBangunan();
  refreshRuangan();
   // LOG AKTIVITAS
  logAudit('Tambah Bangunan', `Bangunan: ${nama}`);
};

// CRUD Ruangan
document.getElementById('formRuangan').onsubmit = function (e) {
  e.preventDefault();
  const bangunanId = document.getElementById('bangunanRuang').value;
  const nama = document.getElementById('namaRuangan').value.trim();
  if (!nama || !bangunanId) return;
  const ruangan = getData('ruangan');
  ruangan.push({
    id: uuid(),
    bangunanId,
    nama
  });
  setData('ruangan', ruangan);
  document.getElementById('formRuangan').reset();
  refreshRuangan();
   // LOG AKTIVITAS
  logAudit('Tambah Ruangan', `Ruangan: ${nama}`);
};

// CRUD Barang
document.getElementById('formBarang').onsubmit = function (e) {
  e.preventDefault();
  const nama = document.getElementById('namaBarang').value.trim();
  const kategori = document.getElementById('kategoriBarang').value.trim();
  const spesifikasi = document.getElementById('spesifikasiBarang').value.trim();
  if (!nama) return;
  const barang = getData('barang');
  barang.push({
    id: uuid(),
    nama,
    kategori,
    spesifikasi
  });
  setData('barang', barang);
  document.getElementById('formBarang').reset();
  refreshBarang();
   // LOG AKTIVITAS
  logAudit('Tambah Barang', `Barang: ${nama} | Kategori: ${kategori} | Spek: ${spesifikasi}`);
};

// --- Hapus Bangunan ---
window.deleteBangunan = function (id) {
  if (!confirm('Yakin hapus bangunan?')) return;
  const b = getData('bangunan').find(x => x.id === id);
  setData('bangunan', getData('bangunan').filter(b => b.id !== id));
  setData('ruangan', getData('ruangan').filter(r => r.bangunanId !== id));
  refreshBangunan();
  refreshRuangan();
  logAudit('Hapus Bangunan', `Bangunan: ${b ? b.nama : id}`);
};

// --- Hapus Ruangan ---
window.deleteRuangan = function (id) {
  if (!confirm('Yakin hapus ruangan?')) return;
  const r = getData('ruangan').find(x => x.id === id);
  setData('ruangan', getData('ruangan').filter(r => r.id !== id));
  refreshRuangan();
  logAudit('Hapus Ruangan', `Ruangan: ${r ? r.nama : id}`);
};

// --- Hapus Barang ---
window.deleteBarang = function (id) {
  if (!confirm('Yakin hapus barang?')) return;
  const b = getData('barang').find(x => x.id === id);
  setData('barang', getData('barang').filter(b => b.id !== id));
  refreshBarang();
  logAudit('Hapus Barang', `Barang: ${b ? b.nama : id}`);
};

// --------- ASETRUANGAN (MAPPING BARANG KE RUANGAN) -------------
let asetCurrentPage = 1;

function filterAsetRuanganData(data, keyword, barang, filterRuangan, filterKondisi) {
  // Filter ruangan dan kondisi
  if (filterRuangan && filterRuangan !== 'all') {
    data = data.filter(a => a.ruanganId === filterRuangan);
  }
  if (filterKondisi) {
    data = data.filter(a => (a.kondisi || '').toLowerCase() === filterKondisi.toLowerCase());
  }
  // Search by barang
  if (keyword) {
    data = data.filter(a => {
      const b = barang.find(x => x.id === a.barangId);
      return b && b.nama && b.nama.toLowerCase().includes(keyword.toLowerCase());
    });
  }
  return data;
}

function refreshAsetRuanganTable() {
  const asetRuangan = getData('asetruangan');
  const ruangan = getData('ruangan');
  const barang = getData('barang');
  const filterId = document.getElementById('filterRuanganAset').value;
  const filterKondisi = document.getElementById('filterKondisiAset') ? document.getElementById('filterKondisiAset').value : '';
  const searchKeyword = document.getElementById('searchAsetRuangan') ? document.getElementById('searchAsetRuangan').value.toLowerCase() : '';
  const tbody = document.querySelector('#tabelAsetRuangan tbody');
  tbody.innerHTML = '';

  let dataTampil = filterAsetRuanganData(asetRuangan, searchKeyword, barang, filterId, filterKondisi);

  // Paging
  const showCount = parseInt(document.getElementById('asetShowCount')?.value || 10);
  const totalRows = dataTampil.length;
  const maxPage = Math.ceil(totalRows / showCount);
  if (asetCurrentPage > maxPage) asetCurrentPage = 1;
  const startIdx = (asetCurrentPage - 1) * showCount;
  const rowsPage = dataTampil.slice(startIdx, startIdx + showCount);

  rowsPage.forEach(a => {
    const r = ruangan.find(x => x.id === a.ruanganId);
    const b = barang.find(x => x.id === a.barangId);
    const kebutuhan = a.kebutuhan || 0;
    const jumlah = a.jumlah || 0;
    const selisih = (kebutuhan ? (jumlah - kebutuhan) : 0);
    tbody.innerHTML += `
      <tr>
        <td>${r ? r.nama : '-'}</td>
        <td>${b ? b.nama : '-'}</td>
        <td>${kebutuhan}</td>
        <td>${jumlah}</td>
        <td>${selisih}</td>
        <td>${a.kondisi}</td>
        <td>${a.catatan || ''}</td>
        <td>
          <button class="btn btn-sm btn-warning" onclick="editAsetRuangan('${a.id}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteAsetRuangan('${a.id}')">Hapus</button>
        </td>
      </tr>
    `;
  });

  // Paging control with ellipsis
document.getElementById('asetPaging').innerHTML = renderPaging(asetCurrentPage, maxPage);
}

window.setAsetPage = function(page) {
  asetCurrentPage = page;
  refreshAsetRuanganTable();
}

// Event handler paging/filter
document.getElementById('asetShowCount').onchange = function () {
  asetCurrentPage = 1;
  refreshAsetRuanganTable();
};
document.getElementById('filterRuanganAset').onchange = function () {
  asetCurrentPage = 1;
  refreshAsetRuanganTable();
};
document.getElementById('filterKondisiAset').onchange = function () {
  asetCurrentPage = 1;
  refreshAsetRuanganTable();
};
document.getElementById('searchAsetRuangan').oninput = function () {
  asetCurrentPage = 1;
  refreshAsetRuanganTable();
};

function refreshRuanganAsetDropdowns() {
  const ruangan = getData('ruangan');
  const ruanganSelects = [document.getElementById('ruanganAset'), document.getElementById('filterRuanganAset')];
  ruanganSelects.forEach(sel => {
    if (!sel) return;
    sel.innerHTML = '<option value="">Pilih Ruangan</option>';
    if (sel.id === 'filterRuanganAset') sel.innerHTML = '<option value="all">Semua Ruangan</option>' + sel.innerHTML;
    ruangan.forEach(r => {
      sel.innerHTML += `<option value="${r.id}">${r.nama}</option>`;
    });
  });
}

function refreshBarangAsetDropdown() {
  const barang = getData('barang');
  const sel = document.getElementById('barangAset');
  sel.innerHTML = '<option value="">Pilih Barang</option>';
  barang.forEach(b => {
    sel.innerHTML += `<option value="${b.id}">${b.nama}</option>`;
  });
}

document.getElementById('formAsetRuangan').onsubmit = function (e) {
  e.preventDefault();
  const ruanganId = document.getElementById('ruanganAset').value;
  const barangId = document.getElementById('barangAset').value;
  const jumlah = parseInt(document.getElementById('jumlahAset').value);
  const kondisi = document.getElementById('kondisiAset').value;
  const catatan = document.getElementById('catatanAset').value.trim();
  const kebutuhan = parseInt(document.getElementById('kebutuhanAset').value) || 0;

  if (!ruanganId || !barangId || !jumlah || !kondisi) return;

  let asetRuangan = getData('asetruangan');
  const existing = asetRuangan.find(a => a.ruanganId === ruanganId && a.barangId === barangId);

  // Ambil nama barang/ruangan
  const barang = getData('barang').find(b => b.id === barangId);
  const ruangan = getData('ruangan').find(r => r.id === ruanganId);

  if (existing) {
    existing.jumlah = jumlah;
    existing.kebutuhan = kebutuhan;
    existing.kondisi = kondisi;
    existing.catatan = catatan;
    setData('asetruangan', asetRuangan);
    // LOG EDIT
    logAudit('Edit Aset', `Barang: ${barang ? barang.nama : barangId}, Ruangan: ${ruangan ? ruangan.nama : ruanganId}, Jumlah: ${jumlah}, Kondisi: ${kondisi}`);
  } else {
    asetRuangan.push({
      id: uuid(),
      ruanganId,
      barangId,
      kebutuhan,
      jumlah,
      kondisi,
      catatan
    });
    setData('asetruangan', asetRuangan);
    // LOG TAMBAH
    logAudit('Tambah Aset', `Barang: ${barang ? barang.nama : barangId}, Ruangan: ${ruangan ? ruangan.nama : ruanganId}, Jumlah: ${jumlah}, Kondisi: ${kondisi}`);
  }

  document.getElementById('formAsetRuangan').reset();
  refreshAsetRuanganTable();
};


window.deleteAsetRuangan = function (id) {
  if (!confirm('Hapus data aset ini?')) return;
  let asetRuangan = getData('asetruangan');
  const aset = asetRuangan.find(a => a.id === id);
  // Ambil nama barang/ruangan
  const barang = getData('barang').find(b => b.id === (aset ? aset.barangId : ''));
  const ruangan = getData('ruangan').find(r => r.id === (aset ? aset.ruanganId : ''));
  asetRuangan = asetRuangan.filter(a => a.id !== id);
  setData('asetruangan', asetRuangan);
  refreshAsetRuanganTable();
  // LOG HAPUS
  logAudit('Hapus Aset', `Barang: ${barang ? barang.nama : (aset ? aset.barangId : id)}, Ruangan: ${ruangan ? ruangan.nama : (aset ? aset.ruanganId : id)}`);
};


// Edit (load data ke form)
window.editAsetRuangan = function (id) {
  const asetRuangan = getData('asetruangan');
  const data = asetRuangan.find(a => a.id === id);
  if (!data) return;
  document.getElementById('ruanganAset').value = data.ruanganId;
  document.getElementById('barangAset').value = data.barangId;
  document.getElementById('kebutuhanAset').value = data.kebutuhan || 0;
  document.getElementById('jumlahAset').value = data.jumlah;
  document.getElementById('kondisiAset').value = data.kondisi;
  document.getElementById('catatanAset').value = data.catatan;
  // Hapus lama
  setData('asetruangan', asetRuangan.filter(a => a.id !== id));
  refreshAsetRuanganTable();
};

document.getElementById('filterRuanganAset').onchange = function () {
  refreshAsetRuanganTable();
};

// Event saat tab "Pencatatan Aset" dibuka
document.querySelector('a[href="#aset"]').addEventListener('shown.bs.tab', function () {
  refreshRuanganAsetDropdowns();
  refreshBarangAsetDropdown();
  refreshAsetRuanganTable();

  const elFilterKondisi = document.getElementById('filterKondisiAset');
if (elFilterKondisi) elFilterKondisi.onchange = refreshAsetRuanganTable;

const elSearchAset = document.getElementById('searchAsetRuangan');
if (elSearchAset) elSearchAset.oninput = refreshAsetRuanganTable;

});
// --------- PELAPORAN ---------

// Rekap total barang semua ruangan
let rekapCurrentPage = 1;

function refreshTabelRekapBarang() {
  const barang = getData('barang');
  const asetRuangan = getData('asetruangan');
  const tbody = document.querySelector('#tabelRekapBarang tbody');
  tbody.innerHTML = '';

  // Baca filter kategori dari select
  const selKategori = document.getElementById('filterKategoriRekap');
  const filterKategori = selKategori ? selKategori.value : '';
  const searchKeyword = document.getElementById('searchRekap')?.value?.toLowerCase() || '';

  // Kumpulkan data tampil
  let dataTampil = barang.map(b => {
    const total = asetRuangan.filter(a => a.barangId === b.id)
      .reduce((sum, a) => sum + (parseInt(a.jumlah) || 0), 0);
    return {
      ...b,
      total
    };
  }).filter(b => b.total > 0);

  // Filter kategori
  if (filterKategori) dataTampil = dataTampil.filter(b => b.kategori === filterKategori);
  // Filter search
  if (searchKeyword) dataTampil = dataTampil.filter(b => b.nama.toLowerCase().includes(searchKeyword));

  // Paging
  const showCount = parseInt(document.getElementById('rekapShowCount')?.value || 10);
  const totalRows = dataTampil.length;
  const maxPage = Math.ceil(totalRows / showCount);
  if (rekapCurrentPage > maxPage) rekapCurrentPage = 1;
  const startIdx = (rekapCurrentPage - 1) * showCount;
  const rowsPage = dataTampil.slice(startIdx, startIdx + showCount);

  // Tampilkan data
  rowsPage.forEach(b => {
    tbody.innerHTML += `
      <tr>
        <td>${b.nama}</td>
        <td>${b.kategori || '-'}</td>
        <td>${b.spesifikasi || '-'}</td>
        <td>${b.total}</td>
      </tr>
    `;
  });

  // Paging control
  document.getElementById('rekapPaging').innerHTML = renderPaging(rekapCurrentPage, maxPage);
}

window.setRekapPage = function(page) {
  if (page < 1) page = 1;
  rekapCurrentPage = page;
  refreshTabelRekapBarang();
}

document.getElementById('rekapShowCount').onchange = function () {
  rekapCurrentPage = 1;
  refreshTabelRekapBarang();
};
document.getElementById('filterKategoriRekap').onchange = function () {
  rekapCurrentPage = 1;
  refreshTabelRekapBarang();
};
document.getElementById('searchRekap').oninput = function () {
  rekapCurrentPage = 1;
  refreshTabelRekapBarang();
};


document.addEventListener('DOMContentLoaded', function () {
  const selKategori = document.getElementById('filterKategoriRekap');
  if (selKategori) {
    selKategori.onchange = function () {
      refreshTabelRekapBarang();
    };
  }
});

function refreshFilterKategoriRekap() {
  const barang = getData('barang');
  const kategoriSet = new Set(barang.map(b => b.kategori).filter(Boolean));
  const selKategori = document.getElementById('filterKategoriRekap');
  if (!selKategori) return;
  const current = selKategori.value || '';
  selKategori.innerHTML = '<option value="">Semua Kategori</option>';
  Array.from(kategoriSet).forEach(kat => {
    selKategori.innerHTML += `<option value="${kat}"${current === kat ? ' selected' : ''}>${kat}</option>`;
  });
  selKategori.value = current;
}


function isiFilterKategoriRekap() {
  const barang = getData('barang');
  const kategoriSet = new Set(barang.map(b => b.kategori).filter(Boolean));
  const sel = document.getElementById('filterKategoriRekap');
  sel.innerHTML = '<option value="">Semua Kategori</option>';
  Array.from(kategoriSet).forEach(kat => {
    sel.innerHTML += `<option value="${kat}">${kat}</option>`;
  });
}
document.getElementById('filterKategoriRekap').onchange = function () {
  refreshTabelRekapBarang();
};

// Filter ruangan untuk laporan
function refreshFilterLaporanRuangan() {
  const ruangan = getData('ruangan');
  const sel = document.getElementById('filterLaporanRuangan');
  sel.innerHTML = '<option value="">Pilih Ruangan</option>';
  ruangan.forEach(r => {
    sel.innerHTML += `<option value="${r.id}">${r.nama}</option>`;
  });
}

// Daftar barang per ruangan
function refreshTabelBarangPerRuangan() {
  const ruanganId = document.getElementById('filterLaporanRuangan').value;
  const asetRuangan = getData('asetruangan');
  const barang = getData('barang');
  const tbody = document.querySelector('#tabelBarangPerRuangan tbody');
  tbody.innerHTML = '';

  if (!ruanganId) return;

  const data = asetRuangan.filter(a => a.ruanganId === ruanganId);
  data.forEach(a => {
    const b = barang.find(x => x.id === a.barangId);
    tbody.innerHTML += `
            <tr>
                <td>${b ? b.nama : '-'}</td>
                <td>${b ? b.kategori : '-'}</td>
                <td>${b ? b.spesifikasi : '-'}</td>
                <td>${a.jumlah}</td>
                <td>${a.kondisi}</td>
                <td>${a.catatan || ''}</td>
            </tr>
        `;
  });
}

// Event untuk tab laporan
document.querySelector('a[href="#laporan"]').addEventListener('shown.bs.tab', function () {
  refreshTabelRekapBarang();
  refreshFilterLaporanRuangan();
  refreshTabelBarangPerRuangan();
  refreshFilterKategoriRekap();

  // PASANG event handler lagi (setiap tab dibuka)
  const selKategori = document.getElementById('filterKategoriRekap');
  if (selKategori) {
    selKategori.onchange = refreshTabelRekapBarang;
  }
});
// Event jika ganti ruangan
document.getElementById('filterLaporanRuangan').onchange = function () {
  refreshTabelBarangPerRuangan();
};

// ------- SINKRONISASI GOOGLE SHEETS -------

// Ganti dengan URL Google Apps Script milik Anda

document.getElementById('btnSyncSheet').onclick = async function () {
  const asetRuangan = getData('asetruangan');
  const barang = getData('barang');
  const ruangan = getData('ruangan');
  const bangunan = getData('bangunan');

  // Format data untuk Google Sheets
  const now = new Date().toISOString();
  const data = asetRuangan.map(a => {
  const b = barang.find(x => x.id === a.barangId) || {};
  const r = ruangan.find(x => x.id === a.ruanganId) || {};
  const bg = bangunan.find(x => x.id === r.bangunanId) || {};
  return {
    kode_barang: a.id,
    nama_barang: b.nama || '-',
    kategori: b.kategori || '-',
    spesifikasi: b.spesifikasi || '-',
    kebutuhan: a.kebutuhan || 0,           // <-- TAMBAHKAN FIELD INI
    jumlah: a.jumlah,
    kondisi: a.kondisi,
    catatan: a.catatan || '',
    nama_ruangan: r.nama || '-',
    nama_bangunan: bg.nama || '-',
    timestamp: now
  }
});

  document.getElementById('syncResult').innerHTML = 'Menyinkronkan...';

  try {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json'
      },
      mode: 'no-cors'
    });
    document.getElementById('syncResult').innerHTML = '<span class="text-success">Data telah dikirim! Silakan cek Google Sheet Anda.</span>';
    // LOG AKTIVITAS
    logAudit('Sinkronisasi', `Sinkronisasi ${data.length} data aset ke Google Sheet`);
  } 
  
  catch (err) {
  document.getElementById('syncResult').innerHTML = `
    <span class="text-danger">
      Koneksi gagal! ${err.message}<br>
      Data tetap aman di browser Anda, silakan ulang sinkronisasi jika internet sudah stabil.
    </span>
  `;
}
};

// EXPORT EXCEL
document.getElementById('btnExportExcel').onclick = function () {
  const wb = XLSX.utils.book_new();
  const ws_data = [
    ['Nama Barang', 'Kategori', 'Spesifikasi', 'Total Jumlah']
  ];
  document.querySelectorAll('#tabelRekapBarang tbody tr').forEach(row => {
    const cols = Array.from(row.children).map(td => td.textContent);
    ws_data.push(cols);
  });
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Aset');
  XLSX.writeFile(wb, 'Rekap_Aset_STC.xlsx');
};

// EXPORT PDF
document.getElementById('btnExportPDF').onclick = function () {
  const {
    jsPDF
  } = window.jspdf;
  const doc = new jsPDF();
  doc.text("Rekap Aset Seriang Training Center", 14, 12);
  doc.autoTable({
    head: [
      ['Nama Barang', 'Kategori', 'Spesifikasi', 'Total Jumlah']
    ],
    body: Array.from(document.querySelectorAll('#tabelRekapBarang tbody tr')).map(row =>
      Array.from(row.children).map(td => td.textContent)
    ),
    startY: 18
  });
  doc.save('Rekap_Aset_STC.pdf');
};

let chartAset;

function renderChartAset() {
  const barang = getData('barang');
  const asetRuangan = getData('asetruangan');
  const labels = [];
  const dataJumlah = [];
  barang.forEach(b => {
    const total = asetRuangan.filter(a => a.barangId === b.id)
      .reduce((sum, a) => sum + (parseInt(a.jumlah) || 0), 0);
    if (total > 0) {
      labels.push(b.nama);
      dataJumlah.push(total);
    }
  });

  if (chartAset) chartAset.destroy();
  const ctx = document.getElementById('chartAset').getContext('2d');
  chartAset = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Jumlah Barang',
        data: dataJumlah
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}


document.getElementById('searchRekap').oninput = function () {
  const keyword = this.value.toLowerCase();
  document.querySelectorAll('#tabelRekapBarang tbody tr').forEach(row => {
    row.style.display = row.children[0].textContent.toLowerCase().includes(keyword) ? '' : 'none';
  });
};

document.getElementById('fileImportExcel').onchange = function (evt) {
  const file = evt.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, {
      type: 'array'
    });

    // Import Bangunan
    const bangunanSheet = workbook.Sheets['Bangunan'];
    let bangunan = [];
    if (bangunanSheet) {
      const bangunanJson = XLSX.utils.sheet_to_json(bangunanSheet, {
        header: 1
      });
      bangunan = bangunanJson.slice(1) // skip header
        .filter(row => row[0])
        .map(row => ({
          id: uuid(),
          nama: row[0]
        }));
      setData('bangunan', bangunan);
    }

    // Import Ruangan
    const ruanganSheet = workbook.Sheets['Ruangan'];
    let ruangan = [];
    if (ruanganSheet) {
      const ruanganJson = XLSX.utils.sheet_to_json(ruanganSheet, {
        header: 1
      });
      ruangan = ruanganJson.slice(1)
        .filter(row => row[0] && row[1])
        .map(row => {
          const parentBangunan = bangunan.find(b => b.nama.trim().toLowerCase() === row[1].trim().toLowerCase());
          return {
            id: uuid(),
            nama: row[0],
            bangunanId: parentBangunan ? parentBangunan.id : ''
          };
        }).filter(r => r.bangunanId);
      setData('ruangan', ruangan);
    }

    // Import Barang
    const barangSheet = workbook.Sheets['Barang'];
    let barang = [];
    if (barangSheet) {
      const barangJson = XLSX.utils.sheet_to_json(barangSheet, {
        header: 1
      });
      barang = barangJson.slice(1)
        .filter(row => row[0])
        .map(row => ({
          id: uuid(),
          nama: row[0],
          kategori: row[1] || '',
          spesifikasi: row[2] || ''
        }));
      setData('barang', barang);
    }

    // Import Aset
    const asetSheet = workbook.Sheets['Aset'];
    let asetruangan = [];
    if (asetSheet) {
      const asetJson = XLSX.utils.sheet_to_json(asetSheet, {
        header: 1
      });
      asetruangan = asetJson.slice(1)
        .filter(row => row[0] && row[1] && row[2])
        .map(row => {
          const b = barang.find(x => x.nama.trim().toLowerCase() === row[0].trim().toLowerCase());
          const r = ruangan.find(x => x.nama.trim().toLowerCase() === row[1].trim().toLowerCase());
          return {
            id: uuid(),
      barangId: b ? b.id : '',
      ruanganId: r ? r.id : '',
      jumlah: parseInt(row[2]) || 0,       // POSISI INDEX 2
      kondisi: row[3] || 'Baik',
      catatan: row[4] || '',
      kebutuhan: parseInt(row[5]) || 0     // POSISI INDEX 5 !!!
    }
        }).filter(a => a.barangId && a.ruanganId && a.jumlah);
      setData('asetruangan', asetruangan);
    }

    // Refresh tampilan
    refreshBangunan();
    refreshRuangan();
    refreshBarang();
    if (typeof refreshRuanganAsetDropdowns === "function") refreshRuanganAsetDropdowns();
    if (typeof refreshBarangAsetDropdown === "function") refreshBarangAsetDropdown();
    if (typeof refreshAsetRuanganTable === "function") refreshAsetRuanganTable();

    document.getElementById('importInfo').innerHTML = '<span class="text-success">Impor data berhasil!</span>';
    setTimeout(() => {
      document.getElementById('importInfo').innerHTML = '';
    }, 5000);
  };
  reader.readAsArrayBuffer(file);
};

document.getElementById('btnResetAll').onclick = function () {
  if (confirm('Semua data master dan aset akan dihapus dari browser ini. Lanjutkan?')) {
    ['bangunan', 'ruangan', 'barang', 'asetruangan'].forEach(k => localStorage.removeItem(k));
    refreshBangunan();
    refreshRuangan();
    refreshBarang();
    if (typeof refreshRuanganAsetDropdowns === "function") refreshRuanganAsetDropdowns();
    if (typeof refreshBarangAsetDropdown === "function") refreshBarangAsetDropdown();
    if (typeof refreshAsetRuanganTable === "function") refreshAsetRuanganTable();
  }
};


let dashboardLevel = 'all'; // all > building > room > aset
let dashboardStack = []; // for back navigation

// Main render function
async function renderDashboard() {
  document.getElementById('dashboardContent').innerHTML = '<div class="text-center my-5"><div class="spinner-border"></div><div>Loading data...</div></div>';
  const response = await fetch(DASHBOARD_SHEET_URL);
const rawData = await response.json();
let data = parseSheetRows(rawData.values || []);


  // Normalisasi data
  data = data.filter(row => row["Nama Barang"]); // pastikan ada barang

  if (dashboardLevel === 'all') {
    // Total semua barang
    let total = 0;
    data.forEach(r => {
      total += parseInt(r["Jumlah"] || 0);
    });
    document.getElementById('dashboardContent').innerHTML = `
            <div class="col-12 col-lg-6">
                <div class="card shadow-lg text-center border-0 p-3 dashboard-card dashboard-card-sntz" style="cursor:pointer;">
                    <div class="card-body">
                        <h2 class="display-4 mb-2 fw-bold">SNTZ</h2>
                        <p class="fs-4 mb-1">Total Seluruh Barang</p>
                        <div class="display-5 text-primary fw-bolder">${total}</div>
                    </div>
                </div>
            </div>
        `;
    // Klik ke bangunan
    document.querySelector('.dashboard-card-sntz').onclick = function () {
      dashboardStack.push({
        level: dashboardLevel
      });
      dashboardLevel = 'building';
      renderDashboard();
    };
  }

  if (dashboardLevel === 'building') {
    // Group by Nama Bangunan
    let buildings = {};
    data.forEach(r => {
      let b = r["Nama Bangunan"] || "-";
      buildings[b] = (buildings[b] || 0) + parseInt(r["Jumlah"] || 0);
    });
    let cards = Object.entries(buildings).map(([nama, jumlah], idx) => `
            <div class="col-12 col-sm-6 col-lg-4">
                <div class="card shadow-lg text-center border-0 p-3 dashboard-card dashboard-card-building" data-building="${nama}" style="cursor:pointer;">
                    <div class="card-body">
                        <h4 class="mb-2 fw-bold">${nama}</h4>
                        <p class="fs-5 mb-1">Jumlah Barang</p>
                        <div class="display-6 text-info fw-bolder">${jumlah}</div>
                    </div>
                </div>
            </div>
        `).join('');
    document.getElementById('dashboardContent').innerHTML = `
            <div class="d-flex justify-content-start mb-3"><button class="btn btn-secondary btn-sm" id="dashboardBack">Kembali</button></div>
            <div class="row g-3">${cards}</div>
        `;
    document.getElementById('dashboardBack').onclick = function () {
      const back = dashboardStack.pop();
      dashboardLevel = back.level;
      renderDashboard();
    };
    document.querySelectorAll('.dashboard-card-building').forEach(el => {
      el.onclick = function () {
        dashboardStack.push({
          level: dashboardLevel,
          building: el.dataset.building
        });
        dashboardLevel = 'room';
        dashboardLevelBuilding = el.dataset.building;
        renderDashboard();
      }
    });
  }

  if (dashboardLevel === 'room') {
    // Ambil building dari stack
    let stackLast = dashboardStack[dashboardStack.length - 1];
    let building = stackLast.building;
    // Group by Nama Ruangan pada building tsb
    let rooms = {};
    data.filter(r => r["Nama Bangunan"] === building).forEach(r => {
      let ru = r["Nama Ruangan"] || "-";
      rooms[ru] = (rooms[ru] || 0) + parseInt(r["Jumlah"] || 0);
    });
    let cards = Object.entries(rooms).map(([nama, jumlah], idx) => `
            <div class="col-12 col-sm-6 col-lg-4">
                <div class="card shadow-lg text-center border-0 p-3 dashboard-card dashboard-card-room" data-room="${nama}" style="cursor:pointer;">
                    <div class="card-body">
                        <h5 class="mb-2 fw-bold">${nama}</h5>
                        <p class="fs-6 mb-1">Jumlah Barang</p>
                        <div class="fs-2 text-success fw-bolder">${jumlah}</div>
                    </div>
                </div>
            </div>
        `).join('');
    document.getElementById('dashboardContent').innerHTML = `
            <div class="d-flex justify-content-start mb-3"><button class="btn btn-secondary btn-sm" id="dashboardBack">Kembali</button></div>
            <div class="row g-3">${cards}</div>
        `;
    document.getElementById('dashboardBack').onclick = function () {
      const back = dashboardStack.pop();
      dashboardLevel = back.level;
      renderDashboard();
    };
    document.querySelectorAll('.dashboard-card-room').forEach(el => {
      el.onclick = function () {
        dashboardStack.push({
          level: dashboardLevel,
          building,
          room: el.dataset.room
        });
        dashboardLevel = 'aset';
        renderDashboard();
      }
    });
  }

  if (dashboardLevel === 'aset') {
    let stackLast = dashboardStack[dashboardStack.length - 1];
    let building = stackLast.building;
    let room = stackLast.room;
    let assets = data.filter(r => r["Nama Bangunan"] === building && r["Nama Ruangan"] === room);
    let rows = assets.map(a => `
            <tr>
                <td>${a["Nama Barang"]}</td>
                <td>${a["Kategori"] || '-'}</td>
                <td>${a["Spesifikasi"] || '-'}</td>
                <td>${a["Jumlah"]}</td>
                <td>${a["Kondisi"]}</td>
                <td>${a["Catatan"]||''}</td>
            </tr>
        `).join('');
    document.getElementById('dashboardContent').innerHTML = `
            <div class="d-flex justify-content-start mb-3"><button class="btn btn-secondary btn-sm" id="dashboardBack">Kembali</button></div>
            <div class="card shadow-lg border-0">
                <div class="card-header bg-primary text-white fw-bold">${building} - ${room}</div>
                <div class="card-body p-2">
                    <div class="table-responsive">
                        <table class="table table-sm table-striped">
                            <thead>
                                <tr>
                                    <th>Barang</th><th>Kategori</th><th>Spesifikasi</th>
                                    <th>Jumlah</th><th>Kondisi</th><th>Catatan</th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    document.getElementById('dashboardBack').onclick = function () {
      const back = dashboardStack.pop();
      dashboardLevel = back.level;
      renderDashboard();
    };
  }
}

// Refresh dashboard setiap tab dashboard diaktifkan
document.querySelector('a[href="#dashboard"]').addEventListener('shown.bs.tab', function () {
  dashboardLevel = 'all';
  dashboardStack = [];
  renderDashboard();
});


document.getElementById('btnLaporanSelisih').onclick = async function () {
  // Tampilkan loading
  document.getElementById('isiModalSelisih').innerHTML = "Loading data dari Google Sheet...";
  const modal = new bootstrap.Modal(document.getElementById('modalSelisihAset'));
  modal.show();

  // Ambil data dari sheet
  const response = await fetch(DAFTAR_ASET_SHEET_URL);
const rawData = await response.json();
const data = parseSheetRows(rawData.values || []);
  // Filter hanya yang punya selisih
  const dataSelisih = data.filter(r => {
    const kebutuhan = parseInt(r["Kebutuhan"]) || 0;
    const jumlah = parseInt(r["Jumlah"]) || 0;
    return kebutuhan > 0 && kebutuhan !== jumlah;
  });

  let html = "<div class='table-responsive'><table class='table table-bordered table-sm'><thead><tr>";
  html += "<th>Nama Barang</th><th>Kategori</th><th>Spesifikasi</th><th>Ruangan</th><th>Bangunan</th><th>Kebutuhan</th><th>Aktual</th><th>Selisih</th><th>Kondisi</th><th>Catatan</th></tr></thead><tbody>";
  dataSelisih.forEach(r => {
    html += `<tr>
      <td>${r["Nama Barang"]}</td>
      <td>${r["Kategori"]}</td>
      <td>${r["Spesifikasi"]}</td>
      <td>${r["Nama Ruangan"]}</td>
      <td>${r["Nama Bangunan"]}</td>
      <td>${r["Kebutuhan"]||0}</td>
      <td>${r["Jumlah"]||0}</td>
      <td>${(parseInt(r["Jumlah"]||0)-(parseInt(r["Kebutuhan"])||0))}</td>
      <td>${r["Kondisi"]}</td>
      <td>${r["Catatan"]||''}</td>
    </tr>`;
  });
  html += "</tbody></table></div>";
  document.getElementById('isiModalSelisih').innerHTML = html;

  // Untuk Export Excel Selisih
  document.getElementById('btnExportSelisihExcel').onclick = function () {
    const ws_data = [
      ["Nama Barang", "Kategori", "Spesifikasi", "Ruangan", "Bangunan", "Kebutuhan", "Aktual", "Selisih", "Kondisi", "Catatan"],
      ...dataSelisih.map(r => [
        r["Nama Barang"], r["Kategori"], r["Spesifikasi"], r["Nama Ruangan"], r["Nama Bangunan"],
        r["Kebutuhan"]||0, r["Jumlah"]||0, (parseInt(r["Jumlah"]||0)-(parseInt(r["Kebutuhan"])||0)), r["Kondisi"], r["Catatan"]||''
      ])
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Selisih');
    XLSX.writeFile(wb, 'Laporan_Selisih_Aset.xlsx');
  };
};

// Init CURRENT_USER from localStorage
let CURRENT_USER = getCurrentUser();


async function fetchUsersFromSheet() {
  try {
    let res = await fetch(AUTH_API_URL);
let rawUsers = await res.json();
let users = parseSheetRows(rawUsers.values || []);
    // Normalisasi kategoriAkses agar selalu array
    users = users.map(u => ({
      ...u,
      kategoriAkses: Array.isArray(u.kategoriAkses)
        ? u.kategoriAkses
        : (typeof u.kategoriAkses === 'string'
            ? u.kategoriAkses.split(',').map(s => s.trim()).filter(Boolean)
            : [])
    }));
    setUsers(users); // kalau mau simpan ke localStorage
    return users;
  } catch (err) {
    // Fallback jika error ambil user dari sheet
    return getUsers(); // dari localStorage
  }
}

// Handler Login (dengan persistensi)
document.getElementById('formLogin').onsubmit = async function (e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  let users = await fetchUsersFromSheet();

  // Normalisasi lagi jika perlu (seharusnya sudah)
  users = users.map(u => ({
    ...u,
    kategoriAkses: Array.isArray(u.kategoriAkses)
      ? u.kategoriAkses
      : (typeof u.kategoriAkses === 'string'
          ? u.kategoriAkses.split(',').map(s => s.trim()).filter(Boolean)
          : [])
  }));

  console.log('Data user:', users, 'Input:', username, password);
  const user = users.find(u => u.username === username && u.password === password);
  console.log('User ditemukan:', user);

  if (user) {
    CURRENT_USER = user;
    setCurrentUser(user);
    hideLoginModal();
    updateUserInfo();
    cekAksesUI();
    document.querySelector('a[href="#dashboard"]').click();
    if (CURRENT_USER.role === 'peminjam') {
      refreshBarangPinjamSelect();
      refreshRiwayatPinjam();
    }
    if (CURRENT_USER.role === 'admin') {
      refreshUserTable();
      refreshKategoriUserSelect();
    }
  } else {
    alert('Login gagal. Cek username/password!');
  }
};


function renderApprovalTable() {
  if (!CURRENT_USER || CURRENT_USER.role !== 'admin') {
    document.getElementById('approvalTable').innerHTML = '';
    return;
  }
  const pinjamans = getPinjamans().filter(p => p.status === 'pending');
  const barang = getData('barang');
  let html = `
    <h5 class="mb-2 text-primary">Approval Peminjaman Barang</h5>
    <div class="table-responsive">
      <table class="table table-sm table-bordered">
        <thead>
          <tr>
            <th>User</th>
            <th>Barang</th>
            <th>Jumlah</th>
            <th>Tanggal</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
  `;
  if (pinjamans.length === 0) {
    html += `<tr><td colspan="5" class="text-center text-muted">Tidak ada permintaan baru.</td></tr>`;
  } else {
    pinjamans.forEach((p, i) => {
      const b = barang.find(x => x.id === p.barangId);
      html += `
        <tr>
          <td>${p.username}</td>
          <td>${b ? b.nama : '-'}</td>
          <td>${p.jumlah}</td>
          <td>${new Date(p.tanggal).toLocaleString()}</td>
          <td>
            <button class="btn btn-success btn-sm" onclick="approvePinjaman(${i})">Setujui</button>
            <button class="btn btn-danger btn-sm ms-1" onclick="rejectPinjaman(${i})">Tolak</button>
          </td>
        </tr>
      `;
    });
  }
  html += `</tbody></table></div>`;
  document.getElementById('approvalTable').innerHTML = html;
}

window.approvePinjaman = async function (idx) {
  let pinjamans = getPinjamans();
  let pending = pinjamans.filter(p => p.status === 'pending');
  let p = pending[idx];
  let globalIdx = pinjamans.findIndex(x => x.username === p.username && x.tanggal === p.tanggal && x.status === 'pending');
  if (globalIdx > -1) {
    pinjamans[globalIdx].status = 'approved';
    setPinjamans(pinjamans);
    showToast("Peminjaman disetujui!", "success");
    logAudit("Approve Pinjam", `User: ${p.username}, Barang: ${p.barangId}, Jumlah: ${p.jumlah}`);
    renderApprovalTable();
    refreshRiwayatPinjam();
    refreshBarangPinjamSelect();
    // Tambah: Sync otomatis ke Sheet (status PINJAM)
    await syncSinglePinjamanToSheet(pinjamans[globalIdx], 'pinjam');


      // --- Kirim notifikasi Telegram ke admin/user
    const barang = getData('barang').find(x => x.id === p.barangId);
    sendTelegramNotif(
      `✅ <b>Pinjaman Disetujui</b>\nUser: <b>${p.username}</b>\nBarang: <b>${barang ? barang.nama : ''}</b>\nJumlah: <b>${p.jumlah}</b>\nStatus: <b>Disetujui Admin</b>`
    );

  }
}

window.rejectPinjaman = function (idx) {
  let pinjamans = getPinjamans();
  let pending = pinjamans.filter(p => p.status === 'pending');
  let p = pending[idx];
  let globalIdx = pinjamans.findIndex(x => x.username === p.username && x.tanggal === p.tanggal && x.status === 'pending');
  if (globalIdx > -1) {
    pinjamans[globalIdx].status = 'rejected';
    setPinjamans(pinjamans);
    showToast("Peminjaman ditolak!", "danger");
    logAudit("Reject Pinjam", `User: ${p.username}, Barang: ${p.barangId}, Jumlah: ${p.jumlah}`);
    renderApprovalTable();
    refreshRiwayatPinjam();
    refreshBarangPinjamSelect();
  } 
}


// --- BATAS: PENGAMAN AKSES ---

function cekAksesUI() {
  // Tab NAV
  const tabDashboard = document.getElementById('nav-dashboard');
  const tabMaster = document.getElementById('nav-masterdata');
  const tabAset = document.getElementById('nav-aset');
  const tabLaporan = document.getElementById('nav-laporan');
  const tabSync = document.getElementById('nav-sync');
  const tabPinjam = document.getElementById('nav-peminjaman');
  // Konten Section
  const sectionUser = document.getElementById('userSection');
  // Konten Tab
  const panelMaster = document.getElementById('masterdata');
  const panelAset = document.getElementById('aset');
  const panelPinjam = document.getElementById('peminjaman');
  // Sembunyikan semua dulu
  [tabDashboard, tabMaster, tabAset, tabLaporan, tabSync, tabPinjam].forEach(t => {
    if (t) t.style.display = 'none'
  });
  [panelMaster, panelAset, panelPinjam].forEach(p => {
    if (p) p.style.display = 'none'
  });
  if (sectionUser) sectionUser.style.display = 'none';

  if (!CURRENT_USER) return;

  // Tab dan panel untuk ADMIN
  if (CURRENT_USER.role === 'admin') {
    if (tabDashboard) tabDashboard.style.display = '';
    if (tabMaster) tabMaster.style.display = '';
    if (tabAset) tabAset.style.display = '';
    if (tabLaporan) tabLaporan.style.display = '';
    if (tabSync) tabSync.style.display = '';
    if (panelMaster) panelMaster.style.display = '';
    if (panelAset) panelAset.style.display = '';
    if (sectionUser) sectionUser.style.display = '';
  }
  // Tab dan panel untuk PEMINJAM
  if (CURRENT_USER.role === 'peminjam') {
    if (tabDashboard) tabDashboard.style.display = 'none';
    if (tabLaporan) tabLaporan.style.display = 'none';
    if (tabPinjam) tabPinjam.style.display = '';
    if (panelPinjam) panelPinjam.style.display = '';
  }

  // Sembunyikan tombol reset jika bukan admin
  const btnResetApp = document.getElementById('btnResetApp');
if (btnResetApp) btnResetApp.style.display = (CURRENT_USER && CURRENT_USER.role === 'admin') ? '' : 'none';

}

function showToast(msg, type = 'info', timeout = 3000) {
  const container = document.getElementById('toast-container');
  const id = 'toast-' + Math.random().toString(36).substr(2, 9);
  const bg = {
    'success': 'bg-success text-white',
    'danger': 'bg-danger text-white',
    'info': 'bg-info text-white',
    'warning': 'bg-warning text-dark'
  } [type] || 'bg-secondary text-white';
  const toast = document.createElement('div');
  toast.className = `toast align-items-center show mb-2 ${bg}`;
  toast.id = id;
  toast.style.minWidth = "220px";
  toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body w-100">${msg}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" onclick="this.closest('.toast').remove()" aria-label="Close"></button>
      </div>
    `;
  container.appendChild(toast);
  setTimeout(() => {
    if (document.getElementById(id)) container.removeChild(toast);
  }, timeout);
}

// Hook ke event tab change
document.querySelectorAll('.nav-link').forEach(tab => {
  tab.addEventListener('show.bs.tab', function (e) {
    if (!CURRENT_USER) {
      e.preventDefault();
      showLoginModal();
      showToast("Silakan login terlebih dahulu", "danger");
      return;
    }
    // Cek hak akses tab
    let tabTarget = e.target.getAttribute('href');
    if (CURRENT_USER.role === 'admin') {
      if (tabTarget === "#peminjaman") {
        e.preventDefault();
        showToast("Admin tidak boleh akses tab peminjaman!", "danger");
        document.querySelector('a[href="#dashboard"]').click();
      }
    }
    if (CURRENT_USER.role === 'peminjam') {
      if (tabTarget === "#masterdata" || tabTarget === "#aset" || tabTarget === "#sync") {
        e.preventDefault();
        showToast("Menu ini hanya untuk admin!", "danger");
        document.querySelector('a[href="#dashboard"]').click();
      }
    }
  });
});


async function fetchStokAwal() {
  const res = await fetch(MASTER_SHEET_URL);
const raw = await res.json();
const data = parseSheetRows(raw.values || []);
  // Data: [{Kode Barang, Nama Barang, Kategori, Spesifikasi, Stok Awal, ...}]
  return data;
}

function cekAkses() {
  if (!CURRENT_USER) return;
  // Tab Master Data hanya admin
  document.getElementById('masterdata').style.display = CURRENT_USER.role === 'admin' ? '' : 'none';
  // Tab Pencatatan Aset hanya admin
  document.getElementById('aset').style.display = CURRENT_USER.role === 'admin' ? '' : 'none';
  // Tab Peminjaman/Pengembalian: semua
}


let userCurrentPage = 1;

// Filter user sesuai keyword pencarian
function filterUserData(users, keyword) {
  if (!keyword) return users;
  return users.filter(u => (u.username || '').toLowerCase().includes(keyword.toLowerCase()));
}

// Paging dan render tabel user
function refreshUserTable() {
  const users = getUsers();
  const tbody = document.querySelector('#tabelUser tbody');
  const searchKeyword = document.getElementById('searchUser')?.value.toLowerCase() || '';
  const showCount = parseInt(document.getElementById('userShowCount')?.value || 10);

  let dataTampil = filterUserData(users, searchKeyword);

  // Paging
  const totalRows = dataTampil.length;
  const maxPage = Math.ceil(totalRows / showCount);
  if (userCurrentPage > maxPage) userCurrentPage = 1;
  const startIdx = (userCurrentPage - 1) * showCount;
  const rowsPage = dataTampil.slice(startIdx, startIdx + showCount);

  tbody.innerHTML = '';
  rowsPage.forEach((u, i) => {
    tbody.innerHTML += `
      <tr>
        <td>${u.username}</td>
        <td>${u.role}</td>
        <td>${
          Array.isArray(u.kategoriAkses)
            ? u.kategoriAkses.join(', ')
            : (typeof u.kategoriAkses === 'string' ? u.kategoriAkses : '')
        }</td>
        <td>
          ${u.username !== 'admin' ? `<button class="btn btn-danger btn-sm" onclick="deleteUser(${getUsers().findIndex(x=>x.username===u.username)})">Hapus</button>` : ''}
        </td>
      </tr>
    `;
  });

  document.getElementById('userPaging').innerHTML = renderPaging(userCurrentPage, maxPage, 'setUserPage');
}

window.setUserPage = function(page) {
  userCurrentPage = page;
  refreshUserTable();
}

// Event handler untuk search dan paging
document.getElementById('userShowCount').onchange = function () {
  userCurrentPage = 1;
  refreshUserTable();
};
document.getElementById('searchUser').oninput = function () {
  userCurrentPage = 1;
  refreshUserTable();
};


window.deleteUser = function (idx) {
  let users = getUsers();
  if (users[idx].username === 'admin') return alert("User admin utama tidak bisa dihapus!");
  if (confirm("Hapus user ini?")) {
    // LOG HAPUS USER
    logAudit('Hapus User', `User: ${users[idx].username} | Role: ${users[idx].role}`);
    users.splice(idx, 1);
    setUsers(users);
    refreshUserTable();
  }
}

document.getElementById('formUser').onsubmit = async function (e) {
  e.preventDefault();
  const username = document.getElementById('userUsername').value.trim();
  const password = document.getElementById('userPassword').value.trim();
  const role = document.getElementById('userRole').value;
  const kategoriSelect = document.getElementById('userKategori');
  const kategoriAkses = Array.from(kategoriSelect.selectedOptions).map(opt => opt.value);

  let users = getUsers();
  if (users.find(u => u.username === username)) return alert("Username sudah ada!");

  const userObj = {
    username,
    password,
    role,
    kategoriAkses
  };
  users.push(userObj);
  setUsers(users);
  document.getElementById('formUser').reset();
  refreshUserTable();

  // LOG TAMBAH USER
  logAudit('Tambah User', `User: ${username} | Role: ${role} | Kategori: ${(kategoriAkses || []).join(',')}`);
  // Kirim ke Sheet Pass saja (bukan Auth)
  tambahUserKeSheetPass(userObj);
}


// Isi select kategori secara dinamis dari master barang
function refreshKategoriUserSelect() {
  const barang = getData('barang');
  const kategoriSet = new Set(barang.map(b => b.kategori).filter(Boolean));
  const select = document.getElementById('userKategori');
  select.innerHTML = '';
  Array.from(kategoriSet).forEach(kat => {
    const opt = document.createElement('option');
    opt.value = kat;
    opt.text = kat;
    select.appendChild(opt);
  });
}

function showAdminUI() {
  document.getElementById('userSection').style.display = 'block';
}

function hideAdminUI() {
  document.getElementById('userSection').style.display = 'none';
}

if (CURRENT_USER && CURRENT_USER.role === 'admin') {
  showAdminUI();
  refreshUserTable();
  refreshKategoriUserSelect();
} else {
  hideAdminUI();
}

function getPinjamans() {
  return JSON.parse(localStorage.getItem('pinjamans') || '[]');
}

function setPinjamans(data) {
  localStorage.setItem('pinjamans', JSON.stringify(data));
}

// Filtering barang hanya kategori sesuai user
function refreshBarangPinjamSelect() {
  if (!CURRENT_USER) return;
  const barang = getData('barang');
  const select = document.getElementById('pinjamBarang');
  select.innerHTML = '<option value="">Pilih Barang</option>';
  let allowedKategori = CURRENT_USER.kategoriAkses || [];
  barang.filter(b => allowedKategori.includes(b.kategori)).forEach(b => {
    select.innerHTML += `<option value="${b.id}">${b.nama} (${b.kategori}) - stok: ${getSisaStok(b.id)}</option>`;
  });
}

function getSisaStok(barangId) {
  // Total aset - total dipinjam & belum dikembalikan
  const aset = getData('asetruangan').filter(a => a.barangId === barangId);
  let stok = aset.reduce((sum, a) => sum + (parseInt(a.jumlah) || 0), 0);
  const pinjamans = getPinjamans();
  let terpakai = pinjamans.filter(p => p.barangId === barangId && !p.sudahKembali)
    .reduce((sum, p) => sum + (parseInt(p.jumlah) || 0), 0);
  return stok - terpakai;
}

function getNamaBarang(barangId) {
  const barang = getData('barang').find(x => x.id === barangId);
  return barang ? barang.nama : '-';
}


document.getElementById('formPinjam').onsubmit = function (e) {
  e.preventDefault();
  const barangId = document.getElementById('pinjamBarang').value;
  const jumlah = parseInt(document.getElementById('pinjamJumlah').value);
  if (!barangId || !jumlah) return;
  if (getSisaStok(barangId) < jumlah) {
    showToast("Stok tidak cukup!", "danger");
    return;
  }
  let pinjamans = getPinjamans();
  pinjamans.push({
    username: CURRENT_USER.username,
    barangId,
    jumlah,
    tanggal: new Date().toISOString(),
    sudahKembali: false,
    status: 'pending' // <- inisialisasi status approval
  });
  setPinjamans(pinjamans);
  document.getElementById('formPinjam').reset();
  showToast("Permintaan pinjam dikirim, menunggu approval admin.", "info");
  logAudit('Ajukan Pinjam', `Barang: ${getNamaBarang(barangId)}, Jumlah: ${jumlah}`);
  refreshRiwayatPinjam();
  refreshBarangPinjamSelect();

   // --- Kirim notifikasi Telegram
  const barang = getData('barang').find(x => x.id === barangId);
  sendTelegramNotif(
    `📦 <b>Peminjaman Aset Baru</b>\nUser: <b>${CURRENT_USER.username}</b>\nBarang: <b>${barang ? barang.nama : ''}</b>\nJumlah: <b>${jumlah}</b>\nStatus: <b>Pending Approval</b>`
  );
};

function refreshRiwayatPinjam() {
  const pinjamans = getPinjamans().filter(p => p.username === CURRENT_USER.username);
  const barang = getData('barang');
  const tbody = document.querySelector('#tabelRiwayatPinjam tbody');
  tbody.innerHTML = '';
  pinjamans.forEach((p, i) => {
    const b = barang.find(x => x.id === p.barangId);
    tbody.innerHTML += `
  <tr>
    <td>${new Date(p.tanggal).toLocaleString()}</td>
    <td>${b?b.nama:''}</td>
    <td>${p.jumlah}</td>
    <td>${
  p.status === 'pending' ? 'Menunggu Approval'
  : p.status === 'approved' ? (p.sudahKembali ? 'Dikembalikan' : 'Disetujui')
  : p.status === 'rejected' ? 'Ditolak'
  : p.sudahKembali ? 'Dikembalikan' : 'Dipinjam'
}</td>
    <td>${!p.sudahKembali?`<button class="btn btn-sm btn-warning" onclick="kembalikanPinjaman(${i})">Kembalikan</button>`:''}</td>
  </tr>
`;
  });
}

// USER AUTH: LocalStorage + Persistensi Login
function setCurrentUser(user) {
  if (user) localStorage.setItem('current_user', JSON.stringify(user));
  else localStorage.removeItem('current_user');
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem('current_user') || 'null');
}

function setUsers(users) {
  localStorage.setItem('users', JSON.stringify(users));
}
function getUsers() {
  return JSON.parse(localStorage.getItem('users') || '[]');
}

window.kembalikanPinjaman = async function (idx) {
  let pinjamans = getPinjamans();
  let pinjamanSaya = pinjamans.filter(p => p.username === CURRENT_USER.username);
  let pinjaman = pinjamanSaya[idx];
  let globalIdx = getPinjamans().findIndex(p => p.username === CURRENT_USER.username && p.tanggal === pinjaman.tanggal);
  if (globalIdx > -1) {
    pinjamans[globalIdx].sudahKembali = true;
    pinjamans[globalIdx].tanggalKembali = new Date().toISOString();
    setPinjamans(pinjamans);
    refreshRiwayatPinjam();
    refreshBarangPinjamSelect();
    // Tambah: Sync otomatis ke Sheet (status KEMBALI)
    await syncSinglePinjamanToSheet(pinjamans[globalIdx], 'kembali');
    logAudit('Kembalikan Pinjam', `Barang: ${getNamaBarang(pinjaman.barangId)}, Jumlah: ${pinjaman.jumlah}`);

    // --- Kirim notifikasi Telegram
    const barang = getData('barang').find(x => x.id === pinjaman.barangId);
    sendTelegramNotif(
      `🔄 <b>Pengembalian Aset</b>\nUser: <b>${CURRENT_USER.username}</b>\nBarang: <b>${barang ? barang.nama : ''}</b>\nJumlah: <b>${pinjaman.jumlah}</b>\nStatus: <b>Dikembalikan</b>`
    );
  }
}

// panggil cekAksesUI() setelah login & tab aktif

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName("History Peminjaman");
    if (!sheet) {
      sheet = ss.insertSheet("History Peminjaman");
      const headers = ["Tanggal", "Username", "Nama Barang", "Kategori", "Jumlah", "Status", "Keterangan", "Timestamp Server"];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    }
    // data = array of transaksi
    const rows = data.map(x => [
      x.tanggal,
      x.username,
      x.namaBarang,
      x.kategori,
      x.jumlah,
      x.status,
      x.keterangan || "",
      new Date()
    ]);
    if (rows.length) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    }
    return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: `Berhasil menambah ${rows.length} data`
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: err.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


// Kirim semua transaksi baru (belum terkirim)
async function syncPinjamansToSheet() {
  let pinjamans = getPinjamans();
  let barang = getData('barang');
  let belumSynced = pinjamans.filter(x => !x.synced);
  if (belumSynced.length === 0) {
    alert('Tidak ada data baru untuk disinkronkan.');
    return;
  }
  // Map data untuk dikirim ke Sheet
  let dataSheet = [];
  belumSynced.forEach(x => {
    let b = barang.find(bb => bb.id === x.barangId) || {};
    // Kirim dua baris: Pinjam dan jika sudah kembali, Kirim juga "Kembali"
    dataSheet.push({
      tanggal: new Date(x.tanggal).toLocaleString(),
      username: x.username,
      namaBarang: b.nama || '-',
      kategori: b.kategori || '-',
      jumlah: x.jumlah,
      status: 'Pinjam',
      keterangan: ''
    });
    if (x.sudahKembali && x.tanggalKembali) {
      dataSheet.push({
        tanggal: new Date(x.tanggalKembali).toLocaleString(),
        username: x.username,
        namaBarang: b.nama || '-',
        kategori: b.kategori || '-',
        jumlah: x.jumlah,
        status: 'Kembali',
        keterangan: ''
      });
    }
  });

  try {
    await fetch(PINJAM_SHEET_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(dataSheet),
      headers: {
        'Content-Type': 'application/json'
      },
      mode: 'no-cors'
    });
    // Mark as synced
    pinjamans.forEach(x => {
      x.synced = true;
    });
    setPinjamans(pinjamans);
    showToast('Data peminjaman/pengembalian berhasil dikirim ke Google Sheet!', 'success');
  } catch (err) {
    alert('Gagal sync ke Google Sheet! ' + err.message);
  }
}

// Kirim SATU transaksi pinjaman ke Google Sheets (async)
async function syncSinglePinjamanToSheet(pinjamObj, tipe) {
  let barang = getData('barang');
  let b = barang.find(bb => bb.id === pinjamObj.barangId) || {};
  let payload = [{
    tanggal: new Date(tipe === 'kembali' ? pinjamObj.tanggalKembali : pinjamObj.tanggal).toLocaleString(),
    username: pinjamObj.username,
    namaBarang: b.nama || '-',
    kategori: b.kategori || '-',
    jumlah: pinjamObj.jumlah,
    status: tipe === 'kembali' ? 'Kembali' : 'Pinjam',
    keterangan: ''
  }];
  try {
    await fetch(PINJAM_SHEET_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
      mode: 'no-cors'
    });
    // Mark as synced hanya untuk status terkait
    pinjamObj.synced = true;
    let pinjamans = getPinjamans();
    let idx = pinjamans.findIndex(x => x.username === pinjamObj.username && x.tanggal === pinjamObj.tanggal);
    if (idx > -1) {
      pinjamans[idx] = pinjamObj;
      setPinjamans(pinjamans);
    }
    showToast('Data berhasil dikirim ke Google Sheet!', 'success');
  } catch (err) {
    showToast('Gagal sync ke Google Sheet! ' + err.message, 'danger');
  }
}


function updateUserInfo() {
  document.getElementById('userInfo').innerHTML = CURRENT_USER ?
    `Login sebagai: ${CURRENT_USER.username} (${CURRENT_USER.role}) <button onclick="logout()" class="btn btn-sm btn-danger ms-3">Logout</button>` :
    '';
}

function logout() {
  CURRENT_USER = null;
  setCurrentUser(null);
  // localStorage.removeItem('users'); // Boleh dihapus kalau mau selalu reload users dari Sheet saat login
  updateUserInfo();
  cekAksesUI();
  showLoginModal();
}

function logAudit(action, detail) {
  let logs = JSON.parse(localStorage.getItem('audit_logs') || '[]');
  logs.unshift({
    timestamp: new Date().toISOString(),
    user: CURRENT_USER ? CURRENT_USER.username : 'anonymous',
    action,
    detail
  });
  // Limit log, misal 200 entry terakhir
  if (logs.length > 200) logs = logs.slice(0, 200);
  localStorage.setItem('audit_logs', JSON.stringify(logs));
}


let auditLogCurrentPage = 1;

// Filter audit log sesuai keyword
function filterAuditLogData(logs, keyword) {
  if (!keyword) return logs;
  return logs.filter(log =>
    (log.user || '').toLowerCase().includes(keyword) ||
    (log.action || '').toLowerCase().includes(keyword) ||
    (log.detail || '').toLowerCase().includes(keyword)
  );
}

// Paging dan render tabel Audit Log
function refreshAuditLogTable() {
  const logs = JSON.parse(localStorage.getItem('audit_logs') || '[]');
  const tbody = document.querySelector('#tabelAuditLog tbody');
  const searchKeyword = document.getElementById('searchAuditLog')?.value.toLowerCase() || '';
  const showCount = parseInt(document.getElementById('auditLogShowCount')?.value || 10);

  let dataTampil = filterAuditLogData(logs, searchKeyword);

  // Paging
  const totalRows = dataTampil.length;
  const maxPage = Math.ceil(totalRows / showCount);
  if (auditLogCurrentPage > maxPage) auditLogCurrentPage = 1;
  const startIdx = (auditLogCurrentPage - 1) * showCount;
  const rowsPage = dataTampil.slice(startIdx, startIdx + showCount);

  tbody.innerHTML = '';
  rowsPage.forEach(log => {
    tbody.innerHTML += `
      <tr>
        <td>${new Date(log.timestamp).toLocaleString()}</td>
        <td>${log.user}</td>
        <td>${log.action}</td>
        <td>${log.detail}</td>
      </tr>
    `;
  });

  document.getElementById('auditLogPaging').innerHTML = renderPaging(auditLogCurrentPage, maxPage, 'setAuditLogPage');
}

window.setAuditLogPage = function(page) {
  auditLogCurrentPage = page;
  refreshAuditLogTable();
}

// Event handler untuk search dan paging
document.getElementById('auditLogShowCount').onchange = function () {
  auditLogCurrentPage = 1;
  refreshAuditLogTable();
};
document.getElementById('searchAuditLog').oninput = function () {
  auditLogCurrentPage = 1;
  refreshAuditLogTable();
};


window.approvePinjam = function (idx) {
  let pinjamans = getPinjamans();
  let pending = pinjamans.filter(p => p.status === 'pending');
  let p = pending[idx];
  let globalIdx = pinjamans.findIndex(x => x.username === p.username && x.tanggal === p.tanggal);
  if (globalIdx > -1) {
    pinjamans[globalIdx].status = 'approved';
    setPinjamans(pinjamans);
    logAudit('Approve Pinjam', `User: ${p.username}, Barang: ${getNamaBarang(barangId)}, Jumlah: ${p.jumlah}`);
    showToast('Peminjaman disetujui!', 'success');
    renderApprovalTable();
  }
}
window.rejectPinjam = function (idx) {
  let pinjamans = getPinjamans();
  let pending = pinjamans.filter(p => p.status === 'pending');
  let p = pending[idx];
  let globalIdx = pinjamans.findIndex(x => x.username === p.username && x.tanggal === p.tanggal);
  if (globalIdx > -1) {
    pinjamans[globalIdx].status = 'rejected';
    setPinjamans(pinjamans);
    logAudit('Reject Pinjam', `User: ${p.username}, Barang: ${getNamaBarang(barangId)}, Jumlah: ${p.jumlah}`);
    showToast('Peminjaman ditolak!', 'danger');
    renderApprovalTable();
  }
}

document.querySelector('a[href="#auditlog"]').addEventListener('shown.bs.tab', refreshAuditLogTable);

document.getElementById('btnExportAuditLog').onclick = function () {
  const logs = JSON.parse(localStorage.getItem('audit_logs') || '[]');
  const ws_data = [
    ['Waktu', 'User', 'Aksi', 'Detail'],
    ...logs.map(l => [l.timestamp, l.user, l.action, l.detail])
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  XLSX.utils.book_append_sheet(wb, ws, 'AuditLog');
  XLSX.writeFile(wb, 'Audit_Log_STC.xlsx');
};


document.getElementById('btnSyncPinjamans').style.display = "none";

document.querySelector('a[href="#peminjaman"]').addEventListener('shown.bs.tab', function () {
  if (CURRENT_USER && CURRENT_USER.role === 'peminjam') {
    refreshBarangPinjamSelect();
    refreshRiwayatPinjam();
    cekAksesUI();
  }
});
document.querySelector('a[href="#masterdata"]').addEventListener('shown.bs.tab', function () {
  if (CURRENT_USER && CURRENT_USER.role === 'admin') {
    refreshUserTable();
    refreshKategoriUserSelect();
    renderApprovalTable();
    cekAksesUI();
  }
});

// Tambahkan pemanggilan grafik saat tab laporan dibuka
document.querySelector('a[href="#laporan"]').addEventListener('shown.bs.tab', function () {
  refreshTabelRekapBarang();
  refreshFilterLaporanRuangan();
  refreshTabelBarangPerRuangan();
  renderChartAset();
});


// Fungsi simpan user ke Sheet "Pass" via GAS (POST)
async function tambahUserKeSheetPass(userObj) {
  const payload = {
    username: userObj.username,
    password: userObj.password,
    role: userObj.role,
    kategoriAkses: (userObj.kategoriAkses || []).join(',')
  };
  try {
    await fetch(PASS_SHEET_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
      mode: 'no-cors'
    });
    showToast('User juga dikirim ke Sheet Pass!', 'success');
  } catch (err) {
    showToast('Gagal sync user ke Sheet Pass! ' + err.message, 'danger');
  }
}

// --- Notifikasi TELEGRAM ---

function sendTelegramNotif(msg) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: msg,
      parse_mode: "HTML"
    })
  });
}

// --- BACKUP & RESTORE ---
// --- Backup Data Lokal ke File JSON ---
function backupAllData() {
    const keys = ['bangunan', 'ruangan', 'barang', 'asetruangan', 'users', 'pinjamans', 'audit_logs'];
    const backup = {};
    keys.forEach(k => backup[k] = getData(k));
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup_inventaris_sntz_' + new Date().toISOString().replace(/[:.]/g,'-') + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    document.getElementById('backupRestoreInfo').innerHTML = '<span class="text-success">Backup data berhasil diunduh!</span>';
    setTimeout(() => { document.getElementById('backupRestoreInfo').innerHTML = ''; }, 5000);
}

// --- Restore Data dari File JSON ---
function handleRestoreFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            const keys = ['bangunan', 'ruangan', 'barang', 'asetruangan', 'users', 'pinjamans', 'audit_logs'];
            keys.forEach(k => {
                if (data[k]) setData(k, data[k]);
            });
            document.getElementById('backupRestoreInfo').innerHTML = '<span class="text-success">Restore data berhasil! Silakan refresh halaman.</span>';
            setTimeout(() => { location.reload(); }, 1500);
        } catch (err) {
            document.getElementById('backupRestoreInfo').innerHTML = '<span class="text-danger">Restore gagal: file tidak valid.</span>';
        }
    };
    reader.readAsText(file);
    // Reset value agar bisa pilih file yang sama lagi di lain waktu
    event.target.value = '';
}

// --- RESET: All Data ---
function resetAllAppData() {
    if (!CURRENT_USER || CURRENT_USER.role !== 'admin') {
        document.getElementById('resetAppInfo').innerHTML = '<span class="text-danger">Akses hanya untuk admin!</span>';
        return;
    }
    if (!confirm('Yakin ingin menghapus SEMUA DATA aplikasi (master data, user, aset, pinjaman, log)? Proses tidak bisa dibatalkan!')) return;
    
    // Hapus semua key yang digunakan aplikasi
    ['bangunan', 'ruangan', 'barang', 'asetruangan', 'users', 'pinjamans', 'audit_logs', 'current_user'].forEach(localStorage.removeItem.bind(localStorage));
    
    document.getElementById('resetAppInfo').innerHTML = '<span class="text-success">Semua data aplikasi berhasil direset! Halaman akan dimuat ulang.</span>';
    setTimeout(() => { location.reload(); }, 1200);
}


// --- BATAS: INIT DOMContentLoaded ---

window.addEventListener('DOMContentLoaded', () => {
  // Ambil current user dari localStorage
  CURRENT_USER = getCurrentUser();

  updateUserInfo();
  cekAksesUI();

  if (!CURRENT_USER) {
    showLoginModal();
  } else {
    if (CURRENT_USER.role === 'peminjam') {
      refreshBarangPinjamSelect();
      refreshRiwayatPinjam();
    }
    if (CURRENT_USER.role === 'admin') {
      refreshUserTable();
      refreshKategoriUserSelect();
      renderApprovalTable();
    }
  }
  // Master data tetap di-refresh
  refreshBangunan();
  refreshRuangan();
  refreshBarang();
  refreshFilterKategoriRekap();
});