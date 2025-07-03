// --- MASTER DATA --- //
const SHEET_ID = '1lRFH01IHzA_dz_rzpUMQ0z4ZyE7Ek0eoUuYs84oHkwI';
const GOOGLE_API_KEY = 'AIzaSyBf3LLK72GTjY-m4Wzh8vd0BBIujgyH5t0';

// Helper konversi dari array‐of‐array ke array‐of‐object
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

// --- Mengecek apakah untuk entri `entry` sudah ada record history
function hasLaterStatus(historyData, entry, laterStatuses) {
  const thisTime = new Date(entry["Timestamp Server"]).getTime();
  return historyData.some(x =>
    x["Username"]     === entry["Username"] &&
    x["Nama Barang"]  === entry["Nama Barang"] &&
    parseInt(x["Jumlah"], 10) === parseInt(entry["Jumlah"], 10) &&
    laterStatuses.includes(x["Status"]) &&
    new Date(x["Timestamp Server"]).getTime() > thisTime
  );
}

const DASHBOARD_SHEET_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Daftar%20Aset?key=${GOOGLE_API_KEY}`;
const DAFTAR_ASET_SHEET_URL  = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Daftar%20Aset?key=${GOOGLE_API_KEY}`;
const HISTORY_PINJAM_SHEET_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/History%20Peminjaman?key=${GOOGLE_API_KEY}`;
const MASTER_SHEET_URL       = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Master%20Barang?key=${GOOGLE_API_KEY}`;
const AUNTH_API_URL          = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Aunth?key=${GOOGLE_API_KEY}`;
const BANGUNAN_SHEET_URL     = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Bangunan?key=${GOOGLE_API_KEY}`;
const RUANGAN_SHEET_URL      = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Ruangan?key=${GOOGLE_API_KEY}`;
const BARANG_SHEET_URL       = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Barang?key=${GOOGLE_API_KEY}`;

const GAS_URL = 'https://script.google.com/macros/s/AKfycbxyvlSQoupgz6bk_c3CZfIQKJKgqtWPykVZKk9Y_g1o04ri5TdSN9tcebgLX0APR9rheg/exec';

const TELEGRAM_BOT_TOKEN = '7520083448:AAHbf4QgZurXd8gbI2OnM0PxD8jK_zAXJ08';
const TELEGRAM_CHAT_ID   = '968137878';

let daftarAsetData      = [];
let historyPinjamanData = [];

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
    for (let i = 1; i <= maxPage; i++) pages.push(i);
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

  let dataTampil = filterBangunanData(bangunan, searchKeyword);
  const totalRows = dataTampil.length;
  const maxPage = Math.ceil(totalRows / showCount);
  if (bangunanCurrentPage > maxPage) bangunanCurrentPage = 1;
  const startIdx = (bangunanCurrentPage - 1) * showCount;
  const rowsPage = dataTampil.slice(startIdx, startIdx + showCount);

  rowsPage.forEach(b => {
    list.innerHTML += `
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <div><b>${b.nama}</b></div>
        <div>
          <button class="btn btn-sm btn-primary me-1" onclick="editBangunan('${b.id}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteBangunan('${b.id}')">Hapus</button>
        </div>
      </li>`;
    select.innerHTML += `<option value="${b.id}">${b.nama}</option>`;
  });

  document.getElementById('bangunanPaging').innerHTML =
    renderPaging(bangunanCurrentPage, maxPage, 'setBangunanPage');
}
window.setBangunanPage = function(page) {
  bangunanCurrentPage = page;
  refreshBangunan();
};
document.getElementById('bangunanShowCount').onchange = function () {
  bangunanCurrentPage = 1;
  refreshBangunan();
};
document.getElementById('bangunanSearchAll').oninput = function () {
  bangunanCurrentPage = 1;
  refreshBangunan();
};


// --- 4. Tombol Sync Bangunan (Push ke Google Sheets) ---
document.getElementById('btnSyncBangunan').onclick = async function () {
  const bangunanArr = getData('bangunan');
  if (!bangunanArr || bangunanArr.length === 0) {
    alert('Tidak ada data Bangunan di localStorage untuk disinkronkan.');
    return;
  }

  try {
    const resp = await fetch(BANGUNAN_SHEET_URL);
    const raw  = await resp.json();
    const existingRows = parseSheetRows(raw.values || []);
    const existingNamesSet = new Set(existingRows.map(r => (r['Nama'] || '').toString().trim()));

    const toAppendObjs = [];
    const nowTs = new Date().toISOString();
    bangunanArr.forEach(b => {
      if (!existingNamesSet.has(b.nama.trim())) {
        toAppendObjs.push({
          'ID': b.id,
          'Nama': b.nama,
          'Timestamp': nowTs
        });
      }
    });

    if (toAppendObjs.length === 0) {
      alert('Tidak ada Bangunan baru untuk disinkronkan—semua nama sudah ada di Google Sheets.');
      return;
    }

    syncToGoogleSheet('Bangunan', toAppendObjs, () => {
      console.log('✅ Sinkron Bangunan selesai. Baris baru telah ditambahkan.');
    });

  } catch (err) {
    console.error('Gagal mengambil data Bangunan dari Google Sheets:', err);
    alert('⚠️ Gagal mengambil data Bangunan dari Google Sheets. Periksa koneksi atau API key.');
  }
};


// 2.1. Fungsi load data Bangunan ke form untuk di‐edit
function editBangunan(id) {
  const bangunan = getData('bangunan');
  const b = bangunan.find(x => x.id === id);
  if (!b) return;
  document.getElementById('namaBangunan').value = b.nama;
  document.getElementById('formBangunan').setAttribute('data-edit-id', id);
  document.querySelector('#formBangunan button[type="submit"]').textContent = 'Simpan Perubahan';
}

// --- 2. Fetch (Pull) Data Bangunan dari Google Sheets ---
async function loadBangunanFromSheet() {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Bangunan?key=${GOOGLE_API_KEY}`;
    const response = await fetch(url);
    const raw = await response.json();
    const rows = parseSheetRows(raw.values || []);
    const bangunanArr = rows.map(r => ({
      id: r['ID'],
      nama: r['Nama']
    }));
    setData('bangunan', bangunanArr);
    refreshBangunan();
  } catch (err) {
    console.error('Gagal load Bangunan dari sheet:', err);
    alert('⚠️ Tidak dapat menarik data Bangunan dari Google Sheets.');
  }
}

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

  let dataTampil = filterRuanganData(ruangan, searchKeyword);

  const totalRows = dataTampil.length;
  const maxPage = Math.ceil(totalRows / showCount);
  if (ruanganCurrentPage > maxPage) ruanganCurrentPage = 1;
  const startIdx = (ruanganCurrentPage - 1) * showCount;
  const rowsPage = dataTampil.slice(startIdx, startIdx + showCount);

  rowsPage.forEach(r => {
    const namaBangunan = bangunan.find(b => b.id === r.bangunanId)?.nama || '-';
    list.innerHTML += `
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <div>${namaBangunan} – ${r.nama}</div>
        <div>
          <button class="btn btn-sm btn-primary me-1" onclick="editRuangan('${r.id}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteRuangan('${r.id}')">Hapus</button>
        </div>
      </li>`;
  });

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


/**
 * Fetch semua baris dari sheet "Barang" di Google Sheets,
 * kemudian simpan ke localStorage('barang') sebagai array {id, nama, kategori, spesifikasi}.
 * Setelah itu panggil refreshBarang() untuk merender tabel.
 */
async function fetchBarangFromSheet() {
  try {
    const response = await fetch(BARANG_SHEET_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} – ${response.statusText}`);
    }
    const raw = await response.json();
    const rowsObj = parseSheetRows(raw.values || []);
    const arrForLocal = rowsObj.map(r => ({
      id:          r['ID'],
      nama:        r['Nama'],
      kategori:    r['Kategori'],
      spesifikasi: r['Spesifikasi']
    }));
    setData('barang', arrForLocal);
    refreshBarang();
  } catch (err) {
    console.error('Gagal fetch Barang dari Google Sheets:', err);
  }
}


/**
 * Fetch semua baris dari sheet "Ruangan" di Google Sheets, lalu simpan ke localStorage('ruangan').
 * Struktur returned object: { ID, Nama, "Bangunan ID", Timestamp }.
 */
async function fetchRuanganFromSheet() {
  try {
    const response = await fetch(RUANGAN_SHEET_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} - ${response.statusText}`);
    }
    const raw = await response.json();
    const rowsObj = parseSheetRows(raw.values || []);
    const arrForLocal = rowsObj.map(r => ({
      id: r['ID'],
      nama: r['Nama'],
      bangunanId: r['Bangunan ID']
    }));
    setData('ruangan', arrForLocal);
    refreshRuangan();
  } catch (err) {
    console.error('Gagal fetch Ruangan dari Google Sheets:', err);
  }
}

/**
 * Handler Sync Ruangan:
 * 1) Tarik “Ruangan” dari Google Sheets
 * 2) Bangun Set <bangunanId>|<namaRuangan> untuk data yang sudah ada
 * 3) Dari localStorage('ruangan'), pilih hanya yang belum ada di Set → append ke sheet
 */
document.getElementById('btnSyncRuangan').onclick = async function () {
  const ruanganLocal = getData('ruangan');
  if (!ruanganLocal || ruanganLocal.length === 0) {
    alert('Tidak ada data ruangan di localStorage untuk disinkronkan.');
    return;
  }

  try {
    const response = await fetch(RUANGAN_SHEET_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} – ${response.statusText}`);
    }
    const raw = await response.json();
    const rowsSheet = parseSheetRows(raw.values || []);
    const existingKeys = new Set(
      rowsSheet.map(r => {
        const bid = (r['Bangunan ID'] || '').toString().trim();
        const n   = (r['Nama'] || '').toString().trim().toLowerCase();
        return bid + '|' + n;
      })
    );

    const nowTs = new Date().toISOString();
    const toSync = ruanganLocal
      .filter(r => {
        const keyLocal = r.bangunanId.toString().trim() + '|' + r.nama.trim().toLowerCase();
        return !existingKeys.has(keyLocal);
      })
      .map(r => ({
        'ID':            r.id,
        'Nama':          r.nama,
        'Bangunan ID':   r.bangunanId,
        'Timestamp':     nowTs
      }));

    if (toSync.length === 0) {
      alert('Tidak ada ruangan baru yang perlu disinkron (semua sudah ada di Google Sheets).');
      return;
    }

    await fetch(GAS_URL, {
      method: 'POST',
      mode:   'no-cors',
      headers:{ 'Content-Type': 'application/json' },
      body:   JSON.stringify({
        action: 'append',
        table:  'Ruangan',
        data:   toSync
      })
    });
    alert(`✅ ${toSync.length} ruangan baru berhasil disinkronkan ke Google Sheets.`);
  } catch (err) {
    console.error('Gagal sinkron Ruangan:', err);
    alert('⚠️ Terjadi kesalahan saat sinkron Ruangan:\n' + err.message);
  }
};


// 2.2.1. Load data Ruangan ke form edit
function editRuangan(id) {
  const ruangan = getData('ruangan');
  const r = ruangan.find(x => x.id === id);
  if (!r) return;
  document.getElementById('namaRuangan').value = r.nama;
  document.getElementById('bangunanRuang').value = r.bangunanId;
  document.getElementById('formRuangan').setAttribute('data-edit-id', id);
  document.querySelector('#formRuangan button[type="submit"]').textContent = 'Simpan Perubahan';
}

// 2.2.2. Handler formRuangan
document.getElementById('formRuangan').onsubmit = function(e) {
  e.preventDefault();
  const bangunanId = document.getElementById('bangunanRuang').value;
  const nama = document.getElementById('namaRuangan').value.trim();
  if (!nama || !bangunanId) return;

  const formEl = document.getElementById('formRuangan');
  const editId = formEl.getAttribute('data-edit-id');

  if (editId) {
    // === UPDATE ===
    let ruangan = getData('ruangan');
    const idx = ruangan.findIndex(x => x.id === editId);
    if (idx > -1) {
      ruangan[idx].nama = nama;
      ruangan[idx].bangunanId = bangunanId;
      setData('ruangan', ruangan);
    }
    const now = new Date().toISOString();
    const payloadObj = {
      action: 'update',
      table: 'Ruangan',
      data: [
        {
          'ID': editId,
          'Nama': nama,
          'Bangunan ID': bangunanId,
          'Timestamp': now
        }
      ]
    };
    fetch(GAS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadObj)
    });

    formEl.removeAttribute('data-edit-id');
    document.querySelector('#formRuangan button[type="submit"]').textContent = 'Tambah';
    formEl.reset();
    logAudit('Edit Ruangan', `Ruangan: ${nama} (ID: ${editId})`);
  } else {
    // === CREATE ===
    const ruangan = getData('ruangan');
    const newId = uuid();
    ruangan.push({ id: newId, bangunanId, nama });
    setData('ruangan', ruangan);

    const now = new Date().toISOString();
    const payloadObj = {
      action: 'append',
      table: 'Ruangan',
      data: [
        {
          'ID': newId,
          'Nama': nama,
          'Bangunan ID': bangunanId,
          'Timestamp': now
        }
      ]
    };
    fetch(GAS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadObj)
    });
    logAudit('Tambah Ruangan', `Ruangan: ${nama}`);
    formEl.reset();
  }

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
  // --- Tambahkan CSS hanya sekali ---
  if (!document.getElementById('antiwrap-style')) {
    var style = document.createElement('style');
    style.id = 'antiwrap-style';
    style.innerHTML = `
      .table-responsive-custom {
        width: 100%;
        overflow-x: auto;
      }
      #listBarang .list-group-item {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      #listBarang {
        min-width: 600px;
      }
    `;
    document.head.appendChild(style);
  }

  // --- Bungkus #listBarang dalam .table-responsive-custom ---
  var list = document.getElementById('listBarang');
  if (list && !list.parentElement.classList.contains('table-responsive-custom')) {
    var wrapper = document.createElement('div');
    wrapper.className = 'table-responsive-custom';
    list.parentNode.insertBefore(wrapper, list);
    wrapper.appendChild(list);
  }

  // --- Sisa fungsi asli ---
  const barang = getData('barang');
  const showCount = parseInt(document.getElementById('barangShowCount')?.value || 10);
  const searchKeyword = document.getElementById('barangSearchAll')?.value || '';
  list.innerHTML = '';

  let dataTampil = filterBarangData(barang, searchKeyword);

  const totalRows = dataTampil.length;
  const maxPage = Math.ceil(totalRows / showCount);
  if (barangCurrentPage > maxPage) barangCurrentPage = 1;
  const startIdx = (barangCurrentPage - 1) * showCount;
  const rowsPage = dataTampil.slice(startIdx, startIdx + showCount);

  rowsPage.forEach(b => {
    const tampilNama = `
      <b>${b.nama}</b>
      ${b.kategori ? `(${b.kategori})` : ''}
      ${b.spesifikasi ? `- ${b.spesifikasi}` : ''}
    `;
    list.innerHTML += `
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <div>${tampilNama}</div>
        <div>
          <button class="btn btn-sm btn-primary me-1" onclick="editBarang('${b.id}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteBarang('${b.id}')">Hapus</button>
        </div>
      </li>`;
  });

  document.getElementById('barangPaging').innerHTML =
    renderPaging(barangCurrentPage, maxPage, 'setBarangPage');
}


function editBarang(id) {
  const barang = getData('barang');
  const b = barang.find(x => x.id === id);
  if (!b) return;
  document.getElementById('namaBarang').value        = b.nama;
  document.getElementById('kategoriBarang').value    = b.kategori || '';
  document.getElementById('spesifikasiBarang').value = b.spesifikasi || '';
  const formEl = document.getElementById('formBarang');
  formEl.setAttribute('data-edit-id', id);
  document.querySelector('#formBarang button[type="submit"]').textContent = 'Simpan Perubahan';
}

// 6.2. Handler formBarang.submit → Create / Update
document.getElementById('formBarang').onsubmit = async function (e) {
  e.preventDefault();
  const nama        = document.getElementById('namaBarang').value.trim();
  const kategori    = document.getElementById('kategoriBarang').value.trim();
  const spesifikasi = document.getElementById('spesifikasiBarang').value.trim();
  if (!nama) return;

  const formEl   = document.getElementById('formBarang');
  const editId   = formEl.getAttribute('data-edit-id');
  const nowTs    = new Date().toISOString();

  if (editId) {
    // === UPDATE ===
    let barangArr = getData('barang');
    const idx = barangArr.findIndex(x => x.id === editId);
    if (idx > -1) {
      barangArr[idx].nama        = nama;
      barangArr[idx].kategori    = kategori;
      barangArr[idx].spesifikasi = spesifikasi;
      setData('barang', barangArr);
    }

    const payloadObj = {
      action: 'update',
      table:  'Barang',
      data: [
        {
          'ID':          editId,
          'Nama':        nama,
          'Kategori':    kategori,
          'Spesifikasi': spesifikasi,
          'Timestamp':   nowTs
        }
      ]
    };
    await fetch(GAS_URL, {
      method: 'POST',
      mode:   'no-cors',
      headers:{ 'Content-Type': 'application/json' },
      body:   JSON.stringify(payloadObj)
    });

    formEl.removeAttribute('data-edit-id');
    document.querySelector('#formBarang button[type="submit"]').textContent = 'Tambah';
    formEl.reset();
    refreshBarang();
    logAudit('Edit Barang', `Barang: ${nama} (ID: ${editId})`);
  } 
  else {
    // === CREATE (Tambah Baru) ===
    let barangArr = getData('barang');
    const newId = uuid();
    barangArr.push({ id: newId, nama, kategori, spesifikasi });
    setData('barang', barangArr);

    const payloadObj = {
      action: 'append',
      table:  'Barang',
      data: [
        {
          'ID':          newId,
          'Nama':        nama,
          'Kategori':    kategori,
          'Spesifikasi': spesifikasi,
          'Timestamp':   nowTs
        }
      ]
    };
    await fetch(GAS_URL, {
      method: 'POST',
      mode:   'no-cors',
      headers:{ 'Content-Type': 'application/json' },
      body:   JSON.stringify(payloadObj)
    });

    refreshBarang();
    logAudit('Tambah Barang', `Barang: ${nama}`);
    formEl.reset();
  }
};


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

/**
 * Helper: Mengirim data arrayOfObjects ke GAS via fetch no-cors
 */
async function syncToGoogleSheet(tableName, arrayData, onSuccess) {
  if (!arrayData || arrayData.length === 0) {
    alert('Tidak ada data baru di localStorage untuk table "' + tableName + '".');
    return;
  }
  const payload = {
    table: tableName,
    data: arrayData
  };

  try {
    document.getElementById('syncResult')?.insertAdjacentHTML('beforeend',
      `<div class="small text-info">Menyinkronkan "${tableName}"…</div>`);
    
    await fetch(GAS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    onSuccess();
    alert('✅ Data "' + tableName + '" berhasil disinkronkan.');
  } catch (err) {
    alert('⚠️ Gagal sinkron data "' + tableName + '"! Cek koneksi atau ulangi lagi.\n' + err.message);
  }
}

// CRUD Bangunan
document.getElementById('formBangunan').onsubmit = function (e) {
  e.preventDefault();
  const nama = document.getElementById('namaBangunan').value.trim();
  if (!nama) return;

  const formEl = document.getElementById('formBangunan');
  const editId = formEl.getAttribute('data-edit-id');

  if (editId) {
    // === UPDATE Bangunan ===
    let bangunan = getData('bangunan');
    const idx = bangunan.findIndex(x => x.id === editId);
    if (idx > -1) {
      bangunan[idx].nama = nama;
      setData('bangunan', bangunan);
    }
    const now = new Date().toISOString();
    const payloadObj = {
      action: 'update',
      table:  'Bangunan',
      data: [
        { 'ID': editId, 'Nama': nama, 'Timestamp': now }
      ]
    };
    fetch(GAS_URL, {
      method: 'POST',
      mode:   'no-cors',
      headers:{ 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadObj)
    });
    formEl.removeAttribute('data-edit-id');
    document.querySelector('#formBangunan button[type="submit"]').textContent = 'Tambah';
    formEl.reset();
  } else {
    // === CREATE Bangunan Baru ===
    const bangunan = getData('bangunan');
    const newId = uuid();
    bangunan.push({ id: newId, nama });
    setData('bangunan', bangunan);
    const now = new Date().toISOString();
    const payloadObj = {
      action: 'append',
      table: 'Bangunan',
      data: [
        { 'ID': newId, 'Nama': nama, 'Timestamp': now }
      ]
    };
    fetch(GAS_URL, {
      method: 'POST',
      mode:   'no-cors',
      headers:{ 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadObj)
    });
    formEl.reset();
  }

  refreshBangunan();
  refreshRuangan();
  logAudit('Tambah Bangunan', `Bangunan: ${nama}`);
};


// --- 5) Handler “Tambah/Edit Aset” ---
document.getElementById('formAsetRuangan').onsubmit = async function(e) {
  e.preventDefault();

  const ruanganIdEl = document.getElementById('ruanganAset');
  const barangIdEl  = document.getElementById('barangAset');
  const kebutuhanEl = document.getElementById('kebutuhanAset');
  const jumlahEl    = document.getElementById('jumlahAset');
  const kondisiEl   = document.getElementById('kondisiAset');
  const catatanEl   = document.getElementById('catatanAset');

  const ruanganId = ruanganIdEl.value;
  const barangId  = barangIdEl.value;
  const kebutuhan = parseInt(kebutuhanEl.value) || 0;
  const jumlah    = parseInt(jumlahEl.value);
  const kondisi   = kondisiEl.value;
  const catatan   = catatanEl.value.trim();

  if (!ruanganId || !barangId || !jumlah || !kondisi) {
    return alert('Lengkapi semua field yang wajib.');
  }

  const ruanganArr   = getData('ruangan') || [];
  const bangunanArr  = getData('bangunan') || [];
  const barangArr    = getData('barang') || [];

  const ruObj = ruanganArr.find(r => r.id === ruanganId);
  if (!ruObj) return alert('⚠️ Ruangan tidak valid.');
  const namaRu     = ruObj.nama;
  const namaBangun = bangunanArr.find(b => b.id === ruObj.bangunanId)?.nama || '';

  const bObj       = barangArr.find(b => b.id === barangId);
  if (!bObj) return alert('⚠️ Barang tidak valid.');
  const namaBarang = bObj.nama;
  const kategori   = bObj.kategori || '';
  const spesifikasi = bObj.spesifikasi || '';

  const formEl = document.getElementById('formAsetRuangan');
  const editId = formEl.getAttribute('data-edit-id');

  if (editId) {
    const now = new Date().toISOString();
    const payloadObj = {
      action: 'update',
      table: 'Daftar Aset',
      data: [
        {
          'ID Aset': editId,
          'Nama Bangunan': namaBangun,
          'Nama Ruangan': namaRu,
          'Nama Barang': namaBarang,
          'Kategori': kategori,
          'Spesifikasi': spesifikasi,
          'Kebutuhan': kebutuhan,
          'Jumlah': jumlah,
          'Selisih': (jumlah - kebutuhan),
          'Kondisi': kondisi,
          'Catatan': catatan,
          'Timestamp': now
        }
      ]
    };

    await fetch(GAS_URL, {
      method: 'POST',
      mode:   'no-cors',
      headers:{ 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadObj)
    });

    formEl.removeAttribute('data-edit-id');
    document.querySelector('#formAsetRuangan button[type="submit"]').textContent = 'Catat';
    formEl.reset();
    showToast('🖊️ Perubahan Aset berhasil disimpan.', 'success');
  } else {
    const existingSet = new Set(
      asetSheetData.map(r => 
        `${(r["Nama Bangunan"]||'')}|${(r["Nama Ruangan"]||'')}|${(r["Nama Barang"]||'')}`
      )
    );
    const thisKey = `${namaBangun}|${namaRu}|${namaBarang}`;
    if (existingSet.has(thisKey)) {
      return alert('⚠️ Aset untuk Bangunan→Ruangan→Barang yang sama sudah ada.');
    }

    const newId = uuid();
    const now = new Date().toISOString();
    const payloadObj = {
      action: 'append',
      table: 'Daftar Aset',
      data: [
        {
          'ID Aset': newId,
          'Nama Bangunan': namaBangun,
          'Nama Ruangan': namaRu,
          'Nama Barang': namaBarang,
          'Kategori': kategori,
          'Spesifikasi': spesifikasi,
          'Kebutuhan': kebutuhan,
          'Jumlah': jumlah,
          'Selisih': (jumlah - kebutuhan),
          'Kondisi': kondisi,
          'Catatan': catatan,
          'Timestamp': now
        }
      ]
    };

    await fetch(GAS_URL, {
      method: 'POST',
      mode:   'no-cors',
      headers:{ 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadObj)
    });

    showToast('➕ Aset baru berhasil ditambahkan.', 'success');
    formEl.reset();
  }

  await fetchAsetFromSheet();
  refreshAsetRuanganTable();
};

// --- Hapus Bangunan ---
window.deleteBangunan = function (id) {
  if (!confirm('Yakin hapus bangunan?')) return;
  let bangunan = getData('bangunan');
  const b = bangunan.find(x => x.id === id);
  bangunan = bangunan.filter(x => x.id !== id);
  setData('bangunan', bangunan);

  let ruangan = getData('ruangan');
  ruangan = ruangan.filter(r => r.bangunanId !== id);
  setData('ruangan', ruangan);

  const payloadObj = {
    action: 'delete',
    table: 'Bangunan',
    data: [
      { 'ID': id }
    ]
  };
  fetch(GAS_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payloadObj)
  });

  refreshBangunan();
  refreshRuangan();
  logAudit('Hapus Bangunan', `Bangunan: ${b ? b.nama : id}`);
};


// --- Hapus Ruangan ---
window.deleteRuangan = function(id) {
  if (!confirm('Yakin hapus ruangan?')) return;
  let ruangan = getData('ruangan');
  const r = ruangan.find(x => x.id === id);
  ruangan = ruangan.filter(x => x.id !== id);
  setData('ruangan', ruangan);

  const payloadObj = {
    action: 'delete',
    table: 'Ruangan',
    data: [
      {'ID': id}
    ]
  };
  fetch(GAS_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payloadObj)
  });

  refreshRuangan();
  logAudit('Hapus Ruangan', `Ruangan: ${r ? r.nama : id}`);
};


// --- Hapus Barang ---
window.deleteBarang = async function (id) {
  if (!confirm('Yakin hapus barang?')) return;
  let barangArr = getData('barang');
  const b = barangArr.find(x => x.id === id);
  barangArr = barangArr.filter(x => x.id !== id);
  setData('barang', barangArr);

  const payloadObj = {
    action: 'delete',
    table:  'Barang',
    data:   [ { 'ID': id } ]
  };
  await fetch(GAS_URL, {
    method: 'POST',
    mode:   'no-cors',
    headers:{ 'Content-Type': 'application/json' },
    body:   JSON.stringify(payloadObj)
  });

  refreshBarang();
  logAudit('Hapus Barang', `Barang: ${b ? b.nama : id}`);
};

let asetSheetData = [];

async function fetchAsetFromSheet() {
  try {
    const res = await fetch(DAFTAR_ASET_SHEET_URL);
    const raw = await res.json();
    asetSheetData = parseSheetRows(raw.values || []);
  } catch (err) {
    console.error('⚠️ Gagal mengambil data Aset dari Google Sheet:', err);
    asetSheetData = [];
  }
}

// --------- ASETRUANGAN (MAPPING BARANG KE RUANGAN) -------------
let asetCurrentPage = 1;

function filterAsetRuanganData(data, keyword, barang, filterRuangan, filterKondisi) {
  if (filterRuangan && filterRuangan !== 'all') {
    data = data.filter(a => a.ruanganId === filterRuangan);
  }
  if (filterKondisi) {
    data = data.filter(a => (a.kondisi || '').toLowerCase() === filterKondisi.toLowerCase());
  }
  if (keyword) {
    data = data.filter(a => {
      const b = barang.find(x => x.id === a.barangId);
      return b && b.nama && b.nama.toLowerCase().includes(keyword.toLowerCase());
    });
  }
  return data;
}

// --- 3) Render tabel Daftar Aset ---
function refreshAsetRuanganTable() {
  const tbody = document.querySelector('#tabelAsetRuangan tbody');
  if (!tbody) return;

  let data = Array.isArray(asetSheetData) ? [...asetSheetData] : [];

  const filterRuanganId = document.getElementById('filterRuanganAset')?.value || '';
  const filterKondisi   = document.getElementById('filterKondisiAset')?.value || '';
  const searchKeyword   = document.getElementById('searchAsetRuangan')?.value.toLowerCase() || '';

  const ruanganArr   = getData('ruangan') || [];
  const bangunanArr = getData('bangunan') || [];

  if (filterRuanganId && filterRuanganId !== 'all') {
    const namaRuFilter = ruanganArr.find(r => r.id === filterRuanganId)?.nama || '';
    data = data.filter(d => (d["Nama Ruangan"] || '') === namaRuFilter);
  }
  if (filterKondisi) {
    data = data.filter(d => ((d["Kondisi"]||'').toLowerCase() === filterKondisi.toLowerCase()));
  }
  if (searchKeyword) {
    data = data.filter(d => (d["Nama Barang"]||'').toLowerCase().includes(searchKeyword));
  }

  const showCount = parseInt(document.getElementById('asetShowCount')?.value || '10');
  const totalRows = data.length;
  const maxPage   = Math.max(1, Math.ceil(totalRows / showCount));
  if (asetCurrentPage > maxPage) asetCurrentPage = 1;
  const startIdx = (asetCurrentPage - 1) * showCount;
  const rowsPage = data.slice(startIdx, startIdx + showCount);

  tbody.innerHTML = '';
  rowsPage.forEach(row => {
    const idAset      = row["ID Aset"];
    const namaBangun  = row["Nama Bangunan"] || '-';
    const namaRu      = row["Nama Ruangan"] || '-';
    const namaBarang  = row["Nama Barang"] || '-';
    const kebutuhan   = row["Kebutuhan"] || 0;
    const jumlah      = row["Jumlah"] || 0;
    const selisih     = (jumlah - kebutuhan);
    const kondisi     = row["Kondisi"] || '';
    const catatan     = row["Catatan"] || '';

    tbody.innerHTML += `
      <tr>
        <td>${namaBangun} &rarr; ${namaRu}</td>
        <td>${namaBarang}</td>
        <td>${kebutuhan}</td>
        <td>${jumlah}</td>
        <td>${selisih}</td>
        <td>${kondisi}</td>
        <td>${catatan}</td>
        <td>
          <button class="btn btn-sm btn-primary me-1" onclick="editAsetRuangan('${idAset}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteAsetRuangan('${idAset}')">Hapus</button>
        </td>
      </tr>
    `;
  });

  document.getElementById('asetPaging').innerHTML =
    renderPaging(asetCurrentPage, maxPage, 'setAsetPage');
}

window.setAsetPage = function(page) {
  asetCurrentPage = page;
  refreshAsetRuanganTable();
};
document.getElementById('asetShowCount').onchange = function() {
  asetCurrentPage = 1;
  refreshAsetRuanganTable();
};
document.getElementById('filterRuanganAset').onchange = function() {
  asetCurrentPage = 1;
  refreshAsetRuanganTable();
};
document.getElementById('filterKondisiAset').onchange = function() {
  asetCurrentPage = 1;
  refreshAsetRuanganTable();
};
document.getElementById('searchAsetRuangan').oninput = function() {
  asetCurrentPage = 1;
  refreshAsetRuanganTable();
};


// --- 6) editAsetRuangan(id) untuk prefill form ---
function editAsetRuangan(idAset) {
  const rec = asetSheetData.find(r => r["ID Aset"] === idAset);
  if (!rec) return alert('⚠️ Data Aset tidak ditemukan.');

  const namaRu      = rec["Nama Ruangan"] || '';
  const namaBangun  = rec["Nama Bangunan"] || '';
  const namaBarang  = rec["Nama Barang"]   || '';

  const ruanganArr  = getData('ruangan')   || [];
  const bangunanArr = getData('bangunan') || [];
  const barangArr   = getData('barang')    || [];

  const ruObj = ruanganArr.find(r =>
    r.nama === namaRu &&
    ((bangunanArr.find(b => b.id === r.bangunanId)?.nama || '') === namaBangun)
  );
  if (!ruObj) return alert('⚠️ Gagal konversi Nama Ruangan → ID.');

  const bObj = barangArr.find(b => b.nama === namaBarang);
  if (!bObj) return alert('⚠️ Gagal konversi Nama Barang → ID.');

  document.getElementById('ruanganAset').value    = ruObj.id;
  document.getElementById('barangAset').value     = bObj.id;
  document.getElementById('kebutuhanAset').value  = rec["Kebutuhan"]||0;
  document.getElementById('jumlahAset').value     = rec["Jumlah"]||'';
  document.getElementById('kondisiAset').value    = rec["Kondisi"]||'';
  document.getElementById('catatanAset').value    = rec["Catatan"]||'';

  const formEl = document.getElementById('formAsetRuangan');
  formEl.setAttribute('data-edit-id', idAset);
  document.querySelector('#formAsetRuangan button[type="submit"]').textContent = 'Simpan Perubahan';
}

// 2.4.2. Handler formAsetRuangan
document.getElementById('formAsetRuangan').onsubmit = function (e) {
  e.preventDefault();
  const ruanganId = document.getElementById('ruanganAset').value;
  const barangId  = document.getElementById('barangAset').value;
  const jumlah    = parseInt(document.getElementById('jumlahAset').value);
  const kondisi   = document.getElementById('kondisiAset').value;
  const catatan   = document.getElementById('catatanAset').value.trim();
  const kebutuhan = parseInt(document.getElementById('kebutuhanAset').value) || 0;

  if (!ruanganId || !barangId || !jumlah || !kondisi) return;

  const formEl = document.getElementById('formAsetRuangan');
  const editId = formEl.getAttribute('data-edit-id');

  if (editId) {
    let asetRuangan = getData('asetruangan');
    const idx = asetRuangan.findIndex(a => a.id === editId);
    if (idx > -1) {
      asetRuangan[idx].ruanganId = ruanganId;
      asetRuangan[idx].barangId  = barangId;
      asetRuangan[idx].kebutuhan = kebutuhan;
      asetRuangan[idx].jumlah    = jumlah;
      asetRuangan[idx].kondisi   = kondisi;
      asetRuangan[idx].catatan   = catatan;
      setData('asetruangan', asetRuangan);
    }
    const now = new Date().toISOString();
    const bObj = getData('barang').find(x => x.id === barangId) || {};
    const rObj = getData('ruangan').find(x => x.id === ruanganId) || {};
    const namaBangunan = getData('bangunan').find(bg => bg.id === rObj.bangunanId)?.nama || '';
    const payloadObj = {
      action: 'update',
      table: 'Daftar Aset',
      data: [
        {
          'ID Aset': editId,
          'Nama Bangunan': namaBangunan,
          'Nama Ruangan': rObj.nama || '',
          'Nama Barang': bObj.nama || '',
          'Kategori': bObj.kategori || '',
          'Spesifikasi': bObj.spesifikasi || '',
          'Kebutuhan': kebutuhan,
          'Jumlah': jumlah,
          'Selisih': kebutuhan ? (jumlah - kebutuhan) : 0,
          'Kondisi': kondisi,
          'Catatan': catatan,
          'Timestamp': now
        }
      ]
    };
    fetch(GAS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadObj)
    });

    formEl.removeAttribute('data-edit-id');
    document.querySelector('#formAsetRuangan button[type="submit"]').textContent = 'Catat';
    formEl.reset();
    logAudit('Edit Aset', `ID Aset: ${editId}`);
  } else {
    let asetRuangan = getData('asetruangan');
    const newId = uuid();
    asetRuangan.push({
      id: newId,
      ruanganId,
      barangId,
      kebutuhan,
      jumlah,
      kondisi,
      catatan
    });
    setData('asetruangan', asetRuangan);

    const now = new Date().toISOString();
    const bObj = getData('barang').find(x => x.id === barangId) || {};
    const rObj = getData('ruangan').find(x => x.id === ruanganId) || {};
    const namaBangunan = getData('bangunan').find(bg => bg.id === rObj.bangunanId)?.nama || '';
    const payloadObj = {
      action: 'append',
      table: 'Daftar Aset',
      data: [
        {
          'ID Aset': newId,
          'Nama Bangunan': namaBangunan,
          'Nama Ruangan': rObj.nama || '',
          'Nama Barang': bObj.nama || '',
          'Kategori': bObj.kategori || '',
          'Spesifikasi': bObj.spesifikasi || '',
          'Kebutuhan': kebutuhan,
          'Jumlah': jumlah,
          'Selisih': kebutuhan ? (jumlah - kebutuhan) : 0,
          'Kondisi': kondisi,
          'Catatan': catatan,
          'Timestamp': now
        }
      ]
    };
    fetch(GAS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadObj)
    });

    logAudit('Tambah Aset', `ID Aset: ${newId}`);
    formEl.reset();
  }

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


// --- 7) deleteAsetRuangan(id) untuk hapus satu baris dari sheet ---
function deleteAsetRuangan(idAset) {
  if (!confirm('Yakin hapus data aset ini?')) return;

  const payloadObj = {
    action: 'delete',
    table: 'Daftar Aset',
    data: [ { 'ID Aset': idAset } ]
  };

  fetch(GAS_URL, {
    method: 'POST',
    mode:   'no-cors',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payloadObj)
  }).then(async () => {
    showToast('🗑️ Aset berhasil dihapus.', 'success');
    await fetchAsetFromSheet();
    refreshAsetRuanganTable();
  }).catch(err => {
    console.error('❌ Gagal hapus Aset:', err);
    alert('Gagal menghapus Aset. Coba lagi.');
  });
}


// Event saat tab "Pencatatan Aset" dibuka
document.querySelector('a[href="#aset"]').addEventListener('shown.bs.tab', function () {
  if (typeof refreshRuanganAsetDropdowns === "function") {
    refreshRuanganAsetDropdowns();
  }
  if (typeof refreshBarangAsetDropdown === "function") {
    refreshBarangAsetDropdown();
  }
  fetchAsetFromSheet();
  refreshAsetRuanganTable();
});

// --------- PELAPORAN ---------

let rekapCurrentPage = 1;

  // Fungsi untuk mengambil data Daftar Aset dan menyimpannya ke daftarAsetData
  async function fetchDaftarAsetFromSheet() {
    try {
      const resp = await fetch(DAFTAR_ASET_SHEET_URL);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const raw = await resp.json();
      daftarAsetData = parseSheetRows(raw.values || []);
    } catch (err) {
      console.error('⚠️ Gagal fetch Daftar Aset:', err);
      daftarAsetData = [];
    }
  }

  // ———— Fungsi Rekap Barang ————
  async function refreshTabelRekapBarang() {
    // Pastikan data sudah terisi
    if (daftarAsetData.length === 0) {
      await fetchDaftarAsetFromSheet();
    }

    const tbody = document.querySelector('#tabelRekapBarang tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Filter input
    const filterKategori = document.getElementById('filterKategoriRekap')?.value || '';
    const searchKeyword  = document.getElementById('searchRekap')?.value.toLowerCase() || '';

    // Agregasi: hitung total jumlah per “Nama Barang – Kategori – Spesifikasi”
    const mapTotal = {}; // key: `${nama}|${kategori}|${spesifikasi}`, value: total jumlah
    daftarAsetData.forEach(row => {
      const nama        = row['Nama Barang']?.toString() || '';
      const kategori    = row['Kategori']?.toString() || '';
      const spesifikasi = row['Spesifikasi']?.toString() || '';
      const jumlah      = parseInt(row['Jumlah'] || '0', 10) || 0;

      if (!nama) return;
      const key = `${nama}||${kategori}||${spesifikasi}`;
      mapTotal[key] = (mapTotal[key] || 0) + jumlah;
    });

    // Bentuk array data rekap
    let dataTampil = Object.entries(mapTotal).map(([key, total]) => {
      const [nama, kategori, spesifikasi] = key.split('||');
      return { nama, kategori, spesifikasi, total };
    }).filter(item => item.total > 0);

    // Filter berdasarkan kategori dan nama barang
    if (filterKategori) {
      dataTampil = dataTampil.filter(item => item.kategori === filterKategori);
    }
    if (searchKeyword) {
      dataTampil = dataTampil.filter(item =>
        item.nama.toLowerCase().includes(searchKeyword)
      );
    }

    // Pagination
    const showCount = parseInt(document.getElementById('rekapShowCount')?.value || '10', 10);
    const totalRows = dataTampil.length;
    const maxPage   = Math.ceil(totalRows / showCount) || 1;
    if (rekapCurrentPage > maxPage) rekapCurrentPage = 1;
    const startIdx = (rekapCurrentPage - 1) * showCount;
    const rowsPage = dataTampil.slice(startIdx, startIdx + showCount);

    // Render setiap baris
    rowsPage.forEach(item => {
      tbody.insertAdjacentHTML('beforeend', `
        <tr>
          <td>${item.nama}</td>
          <td>${item.kategori || '-'}</td>
          <td>${item.spesifikasi || '-'}</td>
          <td>${item.total}</td>
        </tr>
      `);
    });

    // Tampilkan pagination
    const pagingEl = document.getElementById('rekapPaging');
    if (pagingEl) {
      pagingEl.innerHTML = renderPaging(rekapCurrentPage, maxPage, 'setRekapPage');
    }
  }

  window.setRekapPage = function(page) {
    if (page < 1) page = 1;
    rekapCurrentPage = page;
    refreshTabelRekapBarang();
  };

  document.getElementById('rekapShowCount')?.addEventListener('change', function() {
    rekapCurrentPage = 1;
    refreshTabelRekapBarang();
  });
  document.getElementById('filterKategoriRekap')?.addEventListener('change', function() {
    rekapCurrentPage = 1;
    refreshTabelRekapBarang();
  });
  document.getElementById('searchRekap')?.addEventListener('input', function() {
    rekapCurrentPage = 1;
    refreshTabelRekapBarang();
  });

  // ———— Filter Kategori di Dropdown ————
  async function refreshFilterKategoriRekap() {
    if (daftarAsetData.length === 0) {
      await fetchDaftarAsetFromSheet();
    }
    const selKategori = document.getElementById('filterKategoriRekap');
    if (!selKategori) return;

    // Kumpulkan semua kategori unik dari daftarAsetData
    const kategoriSet = new Set();
    daftarAsetData.forEach(r => {
      const kat = r['Kategori']?.toString() || '';
      if (kat) kategoriSet.add(kat);
    });

    const current = selKategori.value || '';
    selKategori.innerHTML = '<option value="">Semua Kategori</option>';
    Array.from(kategoriSet).sort().forEach(kat => {
      selKategori.insertAdjacentHTML('beforeend',
        `<option value="${kat}"${current === kat ? ' selected' : ''}>${kat}</option>`
      );
    });
    selKategori.value = current;
  }

  // ———— Filter Ruangan di Dropdown ————
  async function refreshFilterLaporanRuangan() {
    if (daftarAsetData.length === 0) {
      await fetchDaftarAsetFromSheet();
    }
    const sel = document.getElementById('filterLaporanRuangan');
    if (!sel) return;

    // Kumpulkan Nama Ruangan unik
    const ruangSet = new Set();
    daftarAsetData.forEach(r => {
      const namaRu = r['Nama Ruangan']?.toString() || '';
      if (namaRu) ruangSet.add(namaRu);
    });

    sel.innerHTML = '<option value="">Pilih Ruangan</option>';
    Array.from(ruangSet).sort().forEach(namaRu => {
      sel.insertAdjacentHTML('beforeend',
        `<option value="${namaRu}">${namaRu}</option>`
      );
    });
  }

  // ———— Tabel Barang per Ruangan ————
  async function refreshTabelBarangPerRuangan() {
    if (daftarAsetData.length === 0) {
      await fetchDaftarAsetFromSheet();
    }
    const ruanganTerpilih = document.getElementById('filterLaporanRuangan')?.value || '';
    const tbody = document.querySelector('#tabelBarangPerRuangan tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!ruanganTerpilih) return;

    // Filter baris yang Nama Ruangan = ruanganTerpilih
    const baris = daftarAsetData.filter(r => (r['Nama Ruangan'] || '') === ruanganTerpilih);

    baris.forEach(r => {
      const namaBarang  = r['Nama Barang']?.toString() || '-';
      const kategori    = r['Kategori']?.toString()      || '-';
      const spesifikasi = r['Spesifikasi']?.toString()   || '-';
      const jumlah      = r['Jumlah']?.toString()        || '0';
      const kondisi     = r['Kondisi']?.toString()       || '';
      const catatan     = r['Catatan']?.toString()       || '';

      tbody.insertAdjacentHTML('beforeend', `
        <tr>
          <td>${namaBarang}</td>
          <td>${kategori}</td>
          <td>${spesifikasi}</td>
          <td>${jumlah}</td>
          <td>${kondisi}</td>
          <td>${catatan}</td>
        </tr>
      `);
    });
  }

  // ———— Event ketika tab “Laporan” dibuka ————
  document.querySelector('a[href="#laporan"]')?.addEventListener('shown.bs.tab', async function() {
    // Pastikan data terbaru terambil
    await fetchDaftarAsetFromSheet();

    // Perbarui dropdown & tabel
    refreshFilterKategoriRekap();
    refreshFilterLaporanRuangan();

    // Refresh tabel rekap & per-ruangan
    rekapCurrentPage = 1;
    refreshTabelRekapBarang();
    refreshTabelBarangPerRuangan();
  });

  // ———— Event saat memilih ruangan ————
  document.getElementById('filterLaporanRuangan')?.addEventListener('change', function() {
    refreshTabelBarangPerRuangan();
  });

  // Kalau Anda ingin langsung memuat rekap begitu halaman siap (tanpa klik tab),
  // bisa panggil fetchDaftarAsetFromSheet() dan refreshTabelRekapBarang() di sini:
  document.addEventListener('DOMContentLoaded', function() {
    // (opsional) fetchDaftarAsetFromSheet().then(() => {
    //   refreshFilterKategoriRekap();
    //   refreshFilterLaporanRuangan();
    //   refreshTabelRekapBarang();
    // });
  });

// -------------------------------------------
// 2) Fetch Daftar Aset & History Peminjaman
// -------------------------------------------
async function fetchDaftarAsetFromSheet() {
  try {
    const resp = await fetch(DAFTAR_ASET_SHEET_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const raw = await resp.json();
    daftarAsetData = parseSheetRows(raw.values || []);
  } catch (err) {
    console.error('⚠️ Gagal fetch Daftar Aset:', err);
    daftarAsetData = [];
  }
}

async function fetchHistoryFromSheet() {
  try {
    const resp = await fetch(HISTORY_PINJAM_SHEET_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const raw = await resp.json();
    historyPinjamanData = parseSheetRows(raw.values || []);
  } catch (err) {
    console.error('⚠️ Gagal fetch History Peminjaman:', err);
    historyPinjamanData = [];
  }
}

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
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text("Rekap Aset Seriang Training Center", 14, 12);
  doc.autoTable({
    head: [ ['Nama Barang','Kategori','Spesifikasi','Total Jumlah'] ],
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
    const workbook = XLSX.read(data, { type: 'array' });

    // Import Bangunan
    const bangunanSheet = workbook.Sheets['Bangunan'];
    let bangunan = [];
    if (bangunanSheet) {
      const bangunanJson = XLSX.utils.sheet_to_json(bangunanSheet, { header: 1 });
      bangunan = bangunanJson.slice(1)
        .filter(row => row[0])
        .map(row => ({ id: uuid(), nama: row[0] }));
      setData('bangunan', bangunan);
    }

    // Import Ruangan
    const ruanganSheet = workbook.Sheets['Ruangan'];
    let ruangan = [];
    if (ruanganSheet) {
      const ruanganJson = XLSX.utils.sheet_to_json(ruanganSheet, { header: 1 });
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
      const barangJson = XLSX.utils.sheet_to_json(barangSheet, { header: 1 });
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
      const asetJson = XLSX.utils.sheet_to_json(asetSheet, { header: 1 });
      asetruangan = asetJson.slice(1)
        .filter(row => row[0] && row[1] && row[2])
        .map(row => {
          const b = barang.find(x => x.nama.trim().toLowerCase() === row[0].trim().toLowerCase());
          const r = ruangan.find(x => x.nama.trim().toLowerCase() === row[1].trim().toLowerCase());
          return {
            id: uuid(),
            barangId: b ? b.id : '',
            ruanganId: r ? r.id : '',
            jumlah: parseInt(row[2]) || 0,
            kondisi: row[3] || 'Baik',
            catatan: row[4] || '',
            kebutuhan: parseInt(row[5]) || 0
          };
        }).filter(a => a.barangId && a.ruanganId && a.jumlah);
      setData('asetruangan', asetruangan);
    }

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
  event.target.value = '';
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
let dashboardStack = [];

async function renderDashboard() {
  document.getElementById('dashboardContent').innerHTML = '<div class="text-center my-5"><div class="spinner-border"></div><div>Loading data...</div></div>';
  const response = await fetch(DASHBOARD_SHEET_URL);
  const rawData = await response.json();
  let data = parseSheetRows(rawData.values || []);

  data = data.filter(row => row["Nama Barang"]);

  if (dashboardLevel === 'all') {
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
    document.querySelector('.dashboard-card-sntz').onclick = function () {
      dashboardStack.push({ level: dashboardLevel });
      dashboardLevel = 'building';
      renderDashboard();
    };
  }

  if (dashboardLevel === 'building') {
    let buildings = {};
    data.forEach(r => {
      let b = r["Nama Bangunan"] || "-";
      buildings[b] = (buildings[b] || 0) + parseInt(r["Jumlah"] || 0);
    });
    let cards = Object.entries(buildings).map(([nama, jumlah]) => `
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
        dashboardStack.push({ level: dashboardLevel, building: el.dataset.building });
        dashboardLevel = 'room';
        dashboardLevelBuilding = el.dataset.building;
        renderDashboard();
      }
    });
  }

  if (dashboardLevel === 'room') {
    let stackLast = dashboardStack[dashboardStack.length - 1];
    let building = stackLast.building;
    let rooms = {};
    data.filter(r => r["Nama Bangunan"] === building).forEach(r => {
      let ru = r["Nama Ruangan"] || "-";
      rooms[ru] = (rooms[ru] || 0) + parseInt(r["Jumlah"] || 0);
    });
    let cards = Object.entries(rooms).map(([nama, jumlah]) => `
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
        dashboardStack.push({ level: dashboardLevel, building, room: el.dataset.room });
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
          <div class="table-responsive" style="white-space: nowrap;">
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

document.querySelector('a[href="#dashboard"]').addEventListener('shown.bs.tab', function () {
  dashboardLevel = 'all';
  dashboardStack = [];
  renderDashboard();
});


document.getElementById('btnLaporanSelisih').onclick = async function () {
  document.getElementById('isiModalSelisih').innerHTML = "Loading data dari Google Sheet...";
  const modal = new bootstrap.Modal(document.getElementById('modalSelisihAset'));
  modal.show();

  const response = await fetch(DAFTAR_ASET_SHEET_URL);
  const rawData = await response.json();
  const data = parseSheetRows(rawData.values || []);

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

// Init CURRENT_USER dari localStorage
let CURRENT_USER = getCurrentUser();

async function fetchUsersFromSheet() {
  try {
    let res = await fetch(AUNTH_API_URL);
    let rawUsers = await res.json();
    let users = parseSheetRows(rawUsers.values || []);
    users = users.map(u => ({
      ...u,
      kategoriAkses: Array.isArray(u.kategoriAkses)
        ? u.kategoriAkses
        : (typeof u.kategoriAkses === 'string'
            ? u.kategoriAkses.split(',').map(s => s.trim()).filter(Boolean)
            : [])
    }));
    setUsers(users);
    return users;
  } catch (err) {
    return getUsers();
  }
}

// Handler Login (dengan persistensi)
document.getElementById('formLogin').onsubmit = async function (e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  let users = await fetchUsersFromSheet();
  users = users.map(u => ({
    ...u,
    kategoriAkses: Array.isArray(u.kategoriAkses)
      ? u.kategoriAkses
      : (typeof u.kategoriAkses === 'string'
          ? u.kategoriAkses.split(',').map(s => s.trim()).filter(Boolean)
          : [])
  }));

  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    handleLoginSuccess(user);
  } else {
    alert('Login gagal. Cek username/password!');
  }
};

function handleLoginSuccess(user) {
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
    renderApprovalTable();
    startApprovalAutoRefresh();
  }
}


// --- BATAS: PENGAMAN AKSES ---
function cekAksesUI() {
  const tabDashboard = document.getElementById('nav-dashboard');
  const tabMaster    = document.getElementById('nav-masterdata');
  const tabAset      = document.getElementById('nav-aset');
  const tabLaporan   = document.getElementById('nav-laporan');
  const tabSync      = document.getElementById('nav-sync');
  const tabPinjam    = document.getElementById('nav-peminjaman');
  const sectionUser  = document.getElementById('userSection');
  const panelMaster  = document.getElementById('masterdata');
  const panelAset    = document.getElementById('aset');
  const panelPinjam  = document.getElementById('peminjaman');

  [tabDashboard, tabMaster, tabAset, tabLaporan, tabSync, tabPinjam].forEach(el => {
    if (el) el.style.display = 'none';
  });
  [panelMaster, panelAset, panelPinjam].forEach(el => {
    if (el) el.style.display = 'none';
  });
  if (sectionUser) sectionUser.style.display = 'none';

  if (!CURRENT_USER) return;

  if (CURRENT_USER.role === 'admin') {
    if (tabDashboard) tabDashboard.style.display = '';
    if (tabMaster)    tabMaster.style.display = '';
    if (tabAset)      tabAset.style.display = '';
    if (tabLaporan)   tabLaporan.style.display = '';
    if (tabSync)      tabSync.style.display = '';
    if (panelMaster)  panelMaster.style.display = '';
    if (panelAset)    panelAset.style.display = '';
    if (sectionUser)  sectionUser.style.display = '';
  }

  if (CURRENT_USER.role === 'peminjam') {
    if (tabPinjam)   tabPinjam.style.display = '';
    if (panelPinjam) panelPinjam.style.display = '';
  }

  const btnResetApp = document.getElementById('btnResetApp');
  if (btnResetApp) {
    btnResetApp.style.display = (CURRENT_USER.role === 'admin') ? '' : 'none';
  }
}


function showToast(msg, type = 'info', timeout = 3000) {
  const container = document.getElementById('toast-container');
  const id = 'toast-' + Math.random().toString(36).substr(2, 9);
  const bg = {
    'success': 'bg-success text-white',
    'danger': 'bg-danger text-white',
    'info': 'bg-info text-white',
    'warning': 'bg-warning text-dark'
  }[type] || 'bg-secondary text-white';
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


document.querySelectorAll('.nav-link').forEach(tab => {
  tab.addEventListener('show.bs.tab', function (e) {
    if (!CURRENT_USER) {
      e.preventDefault();
      showLoginModal();
      showToast("Silakan login terlebih dahulu", "danger");
      return;
    }
    let tabTarget = e.target.getAttribute('href');
    if (CURRENT_USER.role === 'admin') {
      if (tabTarget === "#peminjaman") {
        e.preventDefault();
        showToast("Admin tidak boleh akses tab peminjaman!", "danger");
        document.querySelector('a[href="#masterdata"]').click();
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
  return data;
}

document.querySelector('a[href="#masterdata"]').addEventListener('shown.bs.tab', async function() {
  await refreshTabelMasterStok();
});

function cekAkses() {
  if (!CURRENT_USER) return;
  document.getElementById('masterdata').style.display = CURRENT_USER.role === 'admin' ? '' : 'none';
  document.getElementById('aset').style.display       = CURRENT_USER.role === 'admin' ? '' : 'none';
}


let userCurrentPage = 1;

function filterUserData(users, keyword) {
  if (!keyword) return users;
  return users.filter(u =>
    (u.username || '').toLowerCase().includes(keyword.toLowerCase())
  );
}

function refreshUserTable() {
  const users = getUsers();
  const tbody = document.querySelector('#tabelUser tbody');
  const searchKeyword = (document.getElementById('searchUser')?.value || '').toLowerCase();
  const showCount = parseInt(document.getElementById('userShowCount')?.value || 10);

  let dataTampil = filterUserData(users, searchKeyword);
  const totalRows = dataTampil.length;
  const maxPage = Math.ceil(totalRows / showCount);
  if (userCurrentPage > maxPage) userCurrentPage = 1;
  const startIdx = (userCurrentPage - 1) * showCount;
  const rowsPage = dataTampil.slice(startIdx, startIdx + showCount);

  tbody.innerHTML = '';
  rowsPage.forEach((u) => {
    const kategoriAksesText = Array.isArray(u.kategoriAkses)
      ? u.kategoriAkses.join(', ')
      : (u.kategoriAkses || '');
    tbody.innerHTML += `
      <tr>
        <td>${u.username}</td>
        <td>${u.role}</td>
        <td>${kategoriAksesText}</td>
        <td>
          <button class="btn btn-sm btn-primary me-1" onclick="editUser('${u.username}')">Edit</button>
          ${u.username !== 'admin' ? `<button class="btn btn-sm btn-danger" onclick="deleteUser('${u.username}')">Hapus</button>` : ''}
        </td>
      </tr>
    `;
  });

  document.getElementById('userPaging').innerHTML =
    renderPaging(userCurrentPage, maxPage, 'setUserPage');
}

window.setUserPage = function(page) {
  userCurrentPage = page;
  refreshUserTable();
}

document.getElementById('userShowCount').onchange = function () {
  userCurrentPage = 1;
  refreshUserTable();
};
document.getElementById('searchUser').oninput = function () {
  userCurrentPage = 1;
  refreshUserTable();
};

function editUser(username) {
  const users = getUsers();
  const u = users.find(x => x.username === username);
  if (!u) return;
  document.getElementById('userUsername').value = u.username;
  document.getElementById('userPassword').value = u.password;
  document.getElementById('userRole').value     = u.role;
  const selectKat = document.getElementById('userKategori');
  Array.from(selectKat.options).forEach(opt => {
    opt.selected = u.kategoriAkses && u.kategoriAkses.includes(opt.value);
  });
  document.getElementById('formUser').setAttribute('data-edit-username', username);
  document.querySelector('#formUser button[type="submit"]').textContent = 'Simpan Perubahan';
}

function deleteUser(username) {
  let users = getUsers();
  if (username === 'admin') {
    return alert("User admin utama tidak bisa dihapus!");
  }
  if (!confirm(`Hapus user “${username}”?`)) return;
  const u = users.find(x => x.username === username);
  users = users.filter(x => x.username !== username);
  setUsers(users);

  const payloadAunthDel = {
    action: 'delete',
    table: 'Aunth',
    data: [ { 'username': username } ]
  };
  fetch(GAS_URL, {
    method: 'POST',
    mode:   'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payloadAunthDel)
  });

  refreshUserTable();
  logAudit('Hapus User', `User: ${username}`);
  alert(`✅ User “${username}” berhasil dihapus dari sheet Aunth.`);
}


document.getElementById('formUser').onsubmit = async function (e) {
  e.preventDefault();
  const username = document.getElementById('userUsername').value.trim();
  const password = document.getElementById('userPassword').value.trim();
  const role     = document.getElementById('userRole').value;
  const kategoriSelect = document.getElementById('userKategori');
  const kategoriAkses  = Array.from(kategoriSelect.selectedOptions).map(opt => opt.value);

  const formEl = document.getElementById('formUser');
  const editUsername = formEl.getAttribute('data-edit-username');
  let users = getUsers();

  if (editUsername) {
    const idx = users.findIndex(x => x.username === editUsername);
    if (idx > -1) {
      users[idx].password      = password;
      users[idx].role          = role;
      users[idx].kategoriAkses = kategoriAkses;
      setUsers(users);
    }

    const now = new Date().toISOString();
    const payloadAunth = {
      action: 'update',
      table: 'Aunth',
      data: [
        {
          'username': editUsername,
          'password': password,
          'role':     role,
          'kategoriAkses': kategoriAkses.join(','),
          'Timestamp': now
        }
      ]
    };
    fetch(GAS_URL, {
      method: 'POST',
      mode:   'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadAunth)
    });

    formEl.removeAttribute('data-edit-username');
    document.querySelector('#formUser button[type="submit"]').textContent = 'Tambah';
    formEl.reset();

    alert(`✅ User “${editUsername}” berhasil diperbarui di sheet Aunth.`);
    await fetchUsersFromSheet();
    refreshUserTable();
    logAudit('Edit User', `User: ${editUsername}`);

  } else {
    if (users.find(u => u.username === username)) {
      return alert('Username sudah ada di lokal!');
    }
    const newUserObj = {
      username,
      password,
      role,
      kategoriAkses
    };
    users.push(newUserObj);
    setUsers(users);

    const now = new Date().toISOString();
    const payloadAunth = {
      action: 'append',
      table: 'Aunth',
      data: [
        {
          'username': username,
          'password': password,
          'role':     role,
          'kategoriAkses': kategoriAkses.join(','),
          'Timestamp': now
        }
      ]
    };
    fetch(GAS_URL, {
      method: 'POST',
      mode:   'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadAunth)
    });

    alert(`✅ User “${username}” berhasil ditambahkan ke sheet Aunth.`);
    formEl.reset();
    refreshUserTable();
    logAudit('Tambah User', `User: ${username}`);
  }
};


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


function getNamaBarang(barangId) {
  const barang = getData('barang').find(x => x.id === barangId);
  return barang ? barang.nama : '-';
}


// USER Aunth: LocalStorage + Persistensi Login
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

// 4.7. Sync Users (Aunth / Pass)
document.getElementById('btnSyncUsers').onclick = async function () {
  let sheetUsers = await fetchUsersFromSheet();
  const localUsers = getUsers() || [];
  const existingUsernames = new Set(sheetUsers.map(u => u.username));
  const usersToAppend = localUsers.filter(u => !existingUsernames.has(u.username));

  if (usersToAppend.length === 0) {
    return alert('Tidak ada user baru yang perlu disinkronkan.');
  }

  const now = new Date().toISOString();
  const payloadArray = usersToAppend.map(u => ({
    'username': u.username,
    'password': u.password,
    'role':     u.role,
    'kategoriAkses': (u.kategoriAkses || []).join(','),
    'Timestamp': now
  }));

  syncToGoogleSheet('Aunth', payloadArray, async () => {
    alert(`✅ ${usersToAppend.length} user baru berhasil disinkronkan ke sheet Aunth.`);
    await fetchUsersFromSheet();
    refreshUserTable();
  });
};

// -------------------------------------------
// (B) Fungsi Fetch dari Google Sheets
// -------------------------------------------

async function fetchMasterBarangFromSheet() {
  try {
    const resp = await fetch(MASTER_SHEET_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status} – ${resp.statusText}`);
    const raw = await resp.json();
    return parseSheetRows(raw.values || []);
  } catch (err) {
    console.error('⚠️ Gagal fetch Master Barang dari Google Sheets:', err);
    return [];
  }
}

async function refreshTabelMasterStok() {
  const tbody = document.querySelector('#tabelMasterStok tbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="4" class="text-center">Loading...</td></tr>';

  const dataAgregasi = await fetchMasterBarangFromSheet();

  if (!dataAgregasi || dataAgregasi.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Tidak ada data master stok.</td></tr>';
    return;
  }

  let html = '';
  dataAgregasi.forEach(item => {
    html += `
      <tr>
        <td>${item['Nama Barang']}</td>
        <td>${item['Kategori'] || '-'}</td>
        <td>${item['Spesifikasi'] || '-'}</td>
        <td>${item['Total Stok']}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}


// -------------------------------------------
// (C) Hitung dan Render <select id="pinjamBarang">
// -------------------------------------------

async function refreshBarangPinjamSelect() {
  if (!CURRENT_USER) return;
  const select = document.getElementById('pinjamBarang');
  if (!select) return;

  select.innerHTML = '<option value="">Pilih Barang</option>';

  await fetchHistoryFromSheet();
  const mapOutstanding = {};
  historyPinjamanData.forEach(h => {
    const nama = (h["Nama Barang"] || '').toString();
    const jml  = parseInt(h["Jumlah"]) || 0;
    if (!mapOutstanding[nama]) {
      mapOutstanding[nama] = { approved: 0, returned: 0 };
    }
    if (h["Status"] === "Approved") {
      mapOutstanding[nama].approved += jml;
    } else if (h["Status"] === "Returned") {
      mapOutstanding[nama].returned += jml;
    }
  });

  const masterList = await fetchMasterBarangFromSheet();
  const allowedKategori = CURRENT_USER.kategoriAkses || [];

  masterList.forEach(item => {
    const namaBarang   = (item["Nama Barang"] || '').toString();
    const kategoriItem = (item["Kategori"]   || '').toString();
    const masterJumlah = parseInt(item["Total Stok"] || '0', 10);

    const info = mapOutstanding[namaBarang] || { approved: 0, returned: 0 };
    const outstanding = info.approved - info.returned;
    const available   = masterJumlah - outstanding;

    if (available <= 0) return;
    if (!allowedKategori.includes(kategoriItem)) return;

    select.innerHTML += `
      <option value="${namaBarang}">
        ${namaBarang} — (${kategoriItem}) — tersedia: ${available}
      </option>
    `;
  });
}


// -------------------------------------------
// (D) Handler Form "Ajukan Pinjam"
// -------------------------------------------

document.getElementById('formPinjam').onsubmit = async function (e) {
  e.preventDefault();
  const barangNama = document.getElementById('pinjamBarang').value;
  const jumlah     = parseInt(document.getElementById('pinjamJumlah').value);
  if (!barangNama || !jumlah) return;

  await fetchHistoryFromSheet();
  const masterList = await fetchMasterBarangFromSheet();
  const masterItem = masterList.find(item => item["Nama Barang"] === barangNama);
  if (!masterItem) {
    return showToast("⚠️ Barang tidak ditemukan di Master Barang.", "danger");
  }

  const masterJumlah = parseInt(masterItem["Total Stok"] || '0', 10);

  const approvedTotal = historyPinjamanData
    .filter(h => h["Nama Barang"] === barangNama && h["Status"] === "Approved")
    .reduce((s, h) => s + (parseInt(h["Jumlah"]) || 0), 0);
  const returnedTotal = historyPinjamanData
    .filter(h => h["Nama Barang"] === barangNama && h["Status"] === "Returned")
    .reduce((s, h) => s + (parseInt(h["Jumlah"]) || 0), 0);

  const outstanding = approvedTotal - returnedTotal;
  const available   = masterJumlah - outstanding;

  if (available < jumlah) {
    return showToast(`Stok tidak cukup: tersedia cuma ${available}`, "danger");
  }

  const nowLok = new Date().toLocaleString();
  const nowISO = new Date().toISOString();
  const payload = {
    action: 'append',
    table:  'History Peminjaman',
    data: [
      {
        'Tanggal':         nowLok,
        'Username':        CURRENT_USER.username,
        'Nama Barang':     barangNama,
        'Kategori':        masterItem["Kategori"] || '',
        'Jumlah':          jumlah,
        'Status':          'Pending',
        'Keterangan':      '',
        'Timestamp Server': nowISO
      }
    ]
  };

  await fetch(GAS_URL, {
    method: 'POST',
    mode:   'no-cors',
    headers:{ 'Content-Type': 'application/json' },
    body:   JSON.stringify(payload)
  });

  showToast('✅ Permintaan peminjaman dikirim. Menunggu approval admin.', 'info');
  logAudit('Request Pinjam', `User: ${CURRENT_USER.username} → ${barangNama} (jml ${jumlah})`);

  await fetchHistoryFromSheet();
  refreshRiwayatPinjam();
  await refreshBarangPinjamSelect();
  document.getElementById('formPinjam').reset();
};


// -------------------------------------------
// (E) Render / Approve / Reject Peminjaman (Admin)
// -------------------------------------------

async function renderApprovalTable() {
  if (!CURRENT_USER || CURRENT_USER.role !== 'admin') {
    document.getElementById('approvalTable').innerHTML = '';
    return;
  }

  // 1) Tarik data history terbaru
  await fetchHistoryFromSheet();

  // 2) Ambil semua record “Pending” (pinjam) dan filter yang paling baru per siklus
  const pendingBorrow = historyPinjamanData.filter(h => h["Status"] === "Pending");
  const borrowRequests = pendingBorrow.filter(h =>
    // hanya yang TIDAK punya Approved/Rejected lebih baru
    !hasLaterStatus(historyPinjamanData, h, ["Approved", "Rejected"])
  );

  // 3) Ambil semua record “ReturnPending” (pengembalian) dan filter yang paling baru per siklus
  const pendingReturn = historyPinjamanData.filter(h => h["Status"] === "ReturnPending");
  const returnRequests = pendingReturn.filter(h =>
    // hanya yang TIDAK punya Returned lebih baru
    !hasLaterStatus(historyPinjamanData, h, ["Returned"])
  );

  // 4) Bangun HTML
  let html = `
    <h5 class="mb-2 text-primary">Approval Peminjaman Barang</h5>
    <div class="table-responsive">
      <table class="table table-sm table-bordered">
        <thead>
          <tr>
            <th>User</th>
            <th>Barang</th>
            <th>Kategori</th>
            <th>Jumlah</th>
            <th>Tanggal Request</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
  `;

  // Jika tidak ada permintaan pinjam baru sama sekali
  if (borrowRequests.length === 0) {
    html += `
      <tr>
        <td colspan="6" class="text-center text-muted">Tidak ada permintaan pinjam baru.</td>
      </tr>
    `;
  } else {
    borrowRequests.forEach(p => {
      html += `
        <tr>
          <td>${p["Username"]}</td>
          <td>${p["Nama Barang"]}</td>
          <td>${p["Kategori"] || '-'}</td>
          <td>${p["Jumlah"]}</td>
          <td>${p["Tanggal"]}</td>
          <td>
            <button class="btn btn-success btn-sm"
                    onclick="approvePinjaman('${p["Timestamp Server"]}')">
              Setujui
            </button>
            <button class="btn btn-danger btn-sm ms-1"
                    onclick="rejectPinjaman('${p["Timestamp Server"]}')">
              Tolak
            </button>
          </td>
        </tr>
      `;
    });
  }

  html += `
        </tbody>
      </table>
    </div>
  `;

  // Jika ada permintaan pengembalian, tampilkan di bawah tabel
  if (returnRequests.length > 0) {
    html += `
      <h5 class="mt-4 mb-2 text-warning">Permintaan Pengembalian</h5>
      <div class="table-responsive">
        <table class="table table-sm table-bordered">
          <thead>
            <tr>
              <th>User</th>
              <th>Barang</th>
              <th>Kategori</th>
              <th>Jumlah</th>
              <th>Tanggal Pengembalian</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
    `;
    returnRequests.forEach(p => {
      html += `
        <tr>
          <td>${p["Username"]}</td>
          <td>${p["Nama Barang"]}</td>
          <td>${p["Kategori"] || '-'}</td>
          <td>${p["Jumlah"]}</td>
          <td>${p["Tanggal"]}</td>
          <td>
            <button class="btn btn-warning btn-sm"
                    onclick="prosesPengembalian('${p["Timestamp Server"]}')">
              Proses
            </button>
          </td>
        </tr>
      `;
    });
    html += `
          </tbody>
        </table>
      </div>
    `;
  }

  document.getElementById('approvalTable').innerHTML = html;
}

window.approvePinjaman = async function(timestampServer) {
  await fetchHistoryFromSheet();
  const target = historyPinjamanData.find(h =>
    h["Timestamp Server"] === timestampServer && h["Status"] === "Pending"
  );
  if (!target) {
    return showToast("⚠️ Data permintaan tidak valid atau sudah diproses.", "warning");
  }

  const nowLok = new Date().toLocaleString();
  const nowISO = new Date().toISOString();
  const payload = {
    action: 'append',
    table:  'History Peminjaman',
    data: [
      {
        'Tanggal':          nowLok,
        'Username':         target["Username"],
        'Nama Barang':      target["Nama Barang"],
        'Kategori':         target["Kategori"] || '',
        'Jumlah':           target["Jumlah"],
        'Status':           'Approved',
        'Keterangan':       '',
        'Timestamp Server': nowISO
      }
    ]
  };

  await fetch(GAS_URL, {
    method: 'POST',
    mode:   'no-cors',
    headers:{ 'Content-Type': 'application/json' },
    body:   JSON.stringify(payload)
  });

  showToast('✅ Peminjaman disetujui.', 'success');
  logAudit('Approve Pinjam', `User: ${target["Username"]} → ${target["Nama Barang"]} (jml ${target["Jumlah"]})`);

  await renderApprovalTable();
};

window.rejectPinjaman = async function(timestampServer) {
  await fetchHistoryFromSheet();
  const target = historyPinjamanData.find(h =>
    h["Timestamp Server"] === timestampServer && h["Status"] === "Pending"
  );
  if (!target) {
    return showToast("⚠️ Data permintaan tidak valid atau sudah diproses.", "warning");
  }

  const nowLok = new Date().toLocaleString();
  const nowISO = new Date().toISOString();
  const payload = {
    action: 'append',
    table:  'History Peminjaman',
    data: [
      {
        'Tanggal':          nowLok,
        'Username':         target["Username"],
        'Nama Barang':      target["Nama Barang"],
        'Kategori':         target["Kategori"] || '',
        'Jumlah':           target["Jumlah"],
        'Status':           'Rejected',
        'Keterangan':       '',
        'Timestamp Server': nowISO
      }
    ]
  };

  await fetch(GAS_URL, {
    method: 'POST',
    mode:   'no-cors',
    headers:{ 'Content-Type': 'application/json' },
    body:   JSON.stringify(payload)
  });

  showToast('🚫 Peminjaman ditolak.', 'warning');
  logAudit('Reject Pinjam', `User: ${target["Username"]} → ${target["Nama Barang"]} (jml ${target["Jumlah"]})`);

  await renderApprovalTable();
};


// -------------------------------------------
// (F) Refresh Riwayat Peminjaman untuk User
// -------------------------------------------
async function refreshRiwayatPinjam() {
  if (!CURRENT_USER) return;

  // 1) Tarik data history terbaru
  await fetchHistoryFromSheet();

  // 2) Ambil seluruh baris milik user ini
  const userHistory = historyPinjamanData
    .filter(h => h["Username"] === CURRENT_USER.username)
    .map(h => ({
      ...h,
      _ts: new Date(h["Timestamp Server"]).getTime()
    }));

  // 3) Kalau kosong, bersihkan tabel dan kembali
  if (userHistory.length === 0) {
    document.querySelector('#tabelRiwayatPinjam tbody').innerHTML = '';
    return;
  }

  // 4) Filter: Pending yang belum ada Approved/Rejected lebih baru
  const pending = userHistory.filter(h => 
    h["Status"] === "Pending" &&
    !hasLaterStatus(userHistory, h, ["Approved", "Rejected"])
  );

  // 5) Filter: Approved yang belum ada ReturnPending/Returned lebih baru
  const approved = userHistory.filter(h =>
    h["Status"] === "Approved" &&
    !hasLaterStatus(userHistory, h, ["ReturnPending", "Returned"])
  );

  // 6) Filter: ReturnPending yang belum ada Returned lebih baru
  const returnPending = userHistory.filter(h =>
    h["Status"] === "ReturnPending" &&
    !hasLaterStatus(userHistory, h, ["Returned"])
  );

  // 7) Susun HTML <tbody>
  let rowsHtml = '';

  // 7.a) Semua Pending (Menunggu Approval)
  pending.forEach(h => {
    rowsHtml += `
      <tr>
        <td>${h["Tanggal"]}</td>
        <td>${h["Nama Barang"]}</td>
        <td>${h["Jumlah"]}</td>
        <td>Menunggu Approval</td>
        <td></td>
      </tr>
    `;
  });

  // 7.b) Semua Approved (Disetujui, tombol “Kembalikan” muncul)
  approved.forEach(h => {
    rowsHtml += `
      <tr>
        <td>${h["Tanggal"]}</td>
        <td>${h["Nama Barang"]}</td>
        <td>${h["Jumlah"]}</td>
        <td>Disetujui</td>
        <td>
          <button class="btn btn-sm btn-warning"
                  onclick="kembalikanPinjaman('${h["Timestamp Server"]}')">
            Kembalikan
          </button>
        </td>
      </tr>
    `;
  });

  // 7.c) Semua ReturnPending (Menunggu Konfirmasi Admin)
  returnPending.forEach(h => {
    rowsHtml += `
      <tr>
        <td>${h["Tanggal"]}</td>
        <td>${h["Nama Barang"]}</td>
        <td>${h["Jumlah"]}</td>
        <td>Pengembalian Menunggu Admin</td>
        <td></td>
      </tr>
    `;
  });

  document.querySelector('#tabelRiwayatPinjam tbody').innerHTML = rowsHtml;
}



// -------------------------------------------
// (G) Fungsi "Kembalikan" Peminjaman (User)
// -------------------------------------------

window.kembalikanPinjaman = async function(timestampServer) {
  await fetchHistoryFromSheet();

  const target = historyPinjamanData.find(h =>
    h["Timestamp Server"] === timestampServer &&
    h["Status"] === "Approved" &&
    h["Username"] === CURRENT_USER.username
  );
  if (!target) {
    return alert("⚠️ Data untuk pengembalian tidak valid.");
  }

  const nowLok = new Date().toLocaleString();
  const nowISO = new Date().toISOString();
  const payload = {
    action: 'append',
    table:  'History Peminjaman',
    data: [
      {
        'Tanggal':          nowLok,
        'Username':         target["Username"],
        'Nama Barang':      target["Nama Barang"],
        'Kategori':         target["Kategori"] || '',
        'Jumlah':           target["Jumlah"],
        'Status':           'ReturnPending',
        'Keterangan':       '',
        'Timestamp Server': nowISO
      }
    ]
  };

  await fetch(GAS_URL, {
    method: 'POST',
    mode:   'no-cors',
    headers:{ 'Content-Type': 'application/json' },
    body:   JSON.stringify(payload)
  });

  showToast('🔄 Permintaan pengembalian dikirim. Menunggu konfirmasi admin.', 'info');
  logAudit('Return Request', `User: ${target["Username"]} → ${target["Nama Barang"]} (jml ${target["Jumlah"]})`);

  await fetchHistoryFromSheet();
  refreshRiwayatPinjam();
  refreshBarangPinjamSelect();
};


// -------------------------------------------
// (H) Hook ke Event Tab “Peminjaman” & “MasterData”
// -------------------------------------------

document.querySelector('a[href="#peminjaman"]').addEventListener('shown.bs.tab', async function () {
  if (CURRENT_USER && CURRENT_USER.role === 'peminjam') {
    await fetchDaftarAsetFromSheet();
    await fetchHistoryFromSheet();
    await refreshBarangPinjamSelect();
    await refreshRiwayatPinjam();
    cekAksesUI();
  }
});


window.prosesPengembalian = async function(timestampServer) {
  await fetchHistoryFromSheet();

  const target = historyPinjamanData.find(h =>
    h["Timestamp Server"] === timestampServer &&
    h["Status"] === "ReturnPending"
  );
  if (!target) {
    return showToast("⚠️ Data pengembalian tidak valid atau sudah diproses.", "warning");
  }

  const originalQty = parseInt(target["Jumlah"], 10) || 0;
  if (originalQty <= 0) {
    return alert("⚠️ Jumlah pengembalian tidak valid.");
  }

  let qtyStr = prompt(`Masukkan jumlah yang dikembalikan (maks ${originalQty}):`, originalQty);
  if (qtyStr === null) {
    return;
  }
  const returnedQty = parseInt(qtyStr, 10);
  if (isNaN(returnedQty) || returnedQty < 1 || returnedQty > originalQty) {
    return alert("⚠️ Jumlah dikembalikan tidak valid.");
  }

  const note = prompt("Masukkan keterangan (opsional):", "") || "";

  const statusNew = (returnedQty === originalQty) ? "Returned" : "Pending";

  const nowLok = new Date().toLocaleString();
  const nowISO = new Date().toISOString();
  const payload = {
    action: 'append',
    table:  'History Peminjaman',
    data: [
      {
        'Tanggal':          nowLok,
        'Username':         target["Username"],
        'Nama Barang':      target["Nama Barang"],
        'Kategori':         target["Kategori"] || '',
        'Jumlah':           returnedQty,
        'Status':           statusNew,
        'Keterangan':       note,
        'Timestamp Server': nowISO
      }
    ]
  };

  await fetch(GAS_URL, {
    method: 'POST',
    mode:   'no-cors',
    headers:{ 'Content-Type': 'application/json' },
    body:   JSON.stringify(payload)
  });

  showToast(`🔁 Pengembalian diproses (${statusNew}).`, 'success');
  logAudit('Process Return', `User: ${target["Username"]} → ${target["Nama Barang"]} (kembali ${returnedQty})`);

  await renderApprovalTable();
  await refreshRiwayatPinjam();
  await refreshBarangPinjamSelect();
};

document.querySelectorAll('a[href="#masterdata"], a[href="#user"]').forEach(tabEl => {
  tabEl.addEventListener('shown.bs.tab', async function () {
    if (CURRENT_USER && CURRENT_USER.role === 'admin') {
      await fetchHistoryFromSheet();
      renderApprovalTable();
      cekAksesUI();
      startApprovalAutoRefresh();
    }
  });
});

function updateUserInfo() {
  document.getElementById('userInfo').innerHTML = CURRENT_USER ?
    `Login sebagai: ${CURRENT_USER.username} (${CURRENT_USER.role}) <button onclick="logout()" class="btn btn-sm btn-danger ms-3">Logout</button>` :
    '';
}

function logout() {
  CURRENT_USER = null;
  setCurrentUser(null);
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
  if (logs.length > 200) logs = logs.slice(0, 200);
  localStorage.setItem('audit_logs', JSON.stringify(logs));
}


let auditLogCurrentPage = 1;

function filterAuditLogData(logs, keyword) {
  if (!keyword) return logs;
  return logs.filter(log =>
    (log.user || '').toLowerCase().includes(keyword) ||
    (log.action || '').toLowerCase().includes(keyword) ||
    (log.detail || '').toLowerCase().includes(keyword)
  );
}

function refreshAuditLogTable() {
  const logs = JSON.parse(localStorage.getItem('audit_logs') || '[]');
  const tbody = document.querySelector('#tabelAuditLog tbody');
  const searchKeyword = document.getElementById('searchAuditLog')?.value.toLowerCase() || '';
  const showCount = parseInt(document.getElementById('auditLogShowCount')?.value || 10);

  let dataTampil = filterAuditLogData(logs, searchKeyword);

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

document.getElementById('btnSyncAuditLog').onclick = function () {
  const allLogs = JSON.parse(localStorage.getItem('audit_logs') || '[]');
  const payloadArray = allLogs.map(l => ({
    'Timestamp': l.timestamp,
    'User': l.user,
    'Aksi': l.action,
    'Detail': l.detail
  }));
  syncToGoogleSheet('Audit Log', payloadArray, () => {
    localStorage.removeItem('audit_logs');
    refreshAuditLogTable();
  });
};

window.setAuditLogPage = function(page) {
  auditLogCurrentPage = page;
  refreshAuditLogTable();
}

document.getElementById('auditLogShowCount').onchange = function () {
  auditLogCurrentPage = 1;
  refreshAuditLogTable();
};
document.getElementById('searchAuditLog').oninput = function () {
  auditLogCurrentPage = 1;
  refreshAuditLogTable();
};

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

document.querySelector('a[href="#peminjaman"]').addEventListener('shown.bs.tab', function () {
  if (CURRENT_USER && CURRENT_USER.role === 'peminjam') {
    fetchDaftarAsetFromSheet();
    fetchHistoryFromSheet();
    refreshBarangPinjamSelect();
    refreshRiwayatPinjam();
    cekAksesUI();
  }
});
document.querySelector('a[href="#masterdata"]').addEventListener('shown.bs.tab', async function () {
  if (CURRENT_USER && CURRENT_USER.role === 'admin') {
    await fetchUsersFromSheet();
    refreshUserTable();
    refreshKategoriUserSelect();
    renderApprovalTable();
    cekAksesUI();
  }
});

document.querySelector('a[href="#laporan"]').addEventListener('shown.bs.tab', function () {
  refreshTabelRekapBarang();
  refreshFilterLaporanRuangan();
  refreshTabelBarangPerRuangan();
  renderChartAset();
});

// --- Notifikasi TELEGRAM dengan Error Handling ---
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
  })
  .then(res => res.json())
  .then(data => {
    if (!data.ok) {
      alert('Telegram error: ' + data.description);
      console.error('Telegram error:', data);
    }
  })
  .catch(err => {
    alert('Fetch Telegram error: ' + err);
    console.error('Fetch Telegram error:', err);
  });
}

// Polling history hingga status sesuai, max 5x (total ~2 detik)
async function getHistoryWithStatus(key, value, status) {
  let target = null;
  for (let i = 0; i < 5; i++) {
    target = historyPinjamanData.find(h => h[key] === value && h["Status"] === status);
    if (target) return target;
    await new Promise(res => setTimeout(res, 400));
  }
  return null;
}

// 4) Setelah pengguna mengajukan pinjam → notif Telegram
const originalFormPinjamSubmit = document.getElementById('formPinjam').onsubmit;
document.getElementById('formPinjam').onsubmit = async function(e) {
  await originalFormPinjamSubmit.call(this, e);
  // Ambil nilai form
  const barangNama = document.getElementById('pinjamBarang').value;
  const jumlahRaw = document.getElementById('pinjamJumlah').value;
  const jumlah = parseInt(jumlahRaw);
  if (!barangNama || isNaN(jumlah) || jumlah <= 0) {
    console.warn("Notifikasi batal: Nama/Jumlah pinjam kosong/0");
    return;
  }
  const msg = `📩 <b>New Loan Request</b>\n` +
              `User: <i>${CURRENT_USER.username}</i>\n` +
              `Barang: <i>${barangNama}</i>\n` +
              `Jumlah: <b>${jumlah}</b>`;
  sendTelegramNotif(msg);
};

// Fungsi polling untuk menunggu data update, max 5x (2 detik total)
async function getTargetWithWait(key, value, status) {
  let target = null;
  for (let i=0; i<5; i++) {
    target = historyPinjamanData.find(h => h[key] === value && h["Status"] === status);
    if (target) return target;
    await wait(400);
  }
  return null;
}

// 5) Setelah admin menyetujui pinjam → notif Telegram
const originalApprovePinjaman = window.approvePinjaman;
window.approvePinjaman = async function(timestampServer) {
  await originalApprovePinjaman.call(this, timestampServer);
  // Polling data
  const target = await getHistoryWithStatus("Timestamp Server", timestampServer, "Approved");
  if (!target) {
    console.warn("Notif Approve: data pinjaman tidak ditemukan/sudah berubah status");
    return;
  }
  const msg = `✅ <b>Loan Approved</b>\n` +
              `User: <i>${target["Username"]}</i>\n` +
              `Barang: <i>${target["Nama Barang"]}</i>\n` +
              `Jumlah: <b>${target["Jumlah"]}</b>`;
  sendTelegramNotif(msg);
};

// 6) Setelah admin menolak pinjam → notif Telegram
const originalRejectPinjaman = window.rejectPinjaman;
window.rejectPinjaman = async function(timestampServer) {
  await originalRejectPinjaman.call(this, timestampServer);
  // Polling data
  const target = await getHistoryWithStatus("Timestamp Server", timestampServer, "Rejected");
  if (!target) {
    console.warn("Notif Reject: data pinjaman tidak ditemukan/sudah berubah status");
    return;
  }
  const msg = `❌ <b>Loan Rejected</b>\n` +
              `User: <i>${target["Username"]}</i>\n` +
              `Barang: <i>${target["Nama Barang"]}</i>\n` +
              `Jumlah: <b>${target["Jumlah"]}</b>`;
  sendTelegramNotif(msg);
};

// 7) Setelah user mengajukan pengembalian → notif Telegram
const originalKembalikanPinjaman = window.kembalikanPinjaman;
window.kembalikanPinjaman = async function(timestampServer) {
  await originalKembalikanPinjaman.call(this, timestampServer);
  // Polling data
  const target = await getHistoryWithStatus("Timestamp Server", timestampServer, "ReturnPending");
  if (!target) {
    console.warn("Notif ReturnPending: data pinjaman tidak ditemukan/sudah berubah status");
    return;
  }
  const msg = `🔄 <b>Return Requested</b>\n` +
              `User: <i>${target["Username"]}</i>\n` +
              `Barang: <i>${target["Nama Barang"]}</i>\n` +
              `Jumlah: <b>${target["Jumlah"]}</b>`;
  sendTelegramNotif(msg);
};

// 8) Setelah admin memproses pengembalian (Returned atau Pending) → notif Telegram
const originalProsesPengembalian = window.prosesPengembalian;
window.prosesPengembalian = async function(timestampServer) {
  await originalProsesPengembalian.call(this, timestampServer);
  // Cari record terbaru yang di-append (ini pola sudah benar & stabil)
  const entries = historyPinjamanData.filter(h =>
    h["Timestamp Server"] > timestampServer &&
    h["Username"]
  );
  if (entries.length === 0) {
    console.warn("Notif Proses Pengembalian: record baru tidak ditemukan.");
    return;
  }
  const last = entries[entries.length - 1];
  if (last["Status"] === "Returned") {
    const msg = `📦 <b>Return Processed</b>\n` +
                `User: <i>${last["Username"]}</i>\n` +
                `Barang: <i>${last["Nama Barang"]}</i>\n` +
                `Jumlah: <b>${last["Jumlah"]}</b>\n` +
                `Status: <b>Returned</b>`;
    sendTelegramNotif(msg);
  } else {
    const msg = `🕒 <b>Return Partially Processed</b>\n` +
                `User: <i>${last["Username"]}</i>\n` +
                `Barang: <i>${last["Nama Barang"]}</i>\n` +
                `Jumlah Dikembalikan: <b>${last["Jumlah"]}</b>\n` +
                `Status: <b>Pending Return</b>`;
    sendTelegramNotif(msg);
  }
};


// --- BACKUP & RESTORE ---
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
  event.target.value = '';
}

function resetAllAppData() {
  if (!CURRENT_USER || CURRENT_USER.role !== 'admin') {
    document.getElementById('resetAppInfo').innerHTML = '<span class="text-danger">Akses hanya untuk admin!</span>';
    return;
  }
  if (!confirm('Yakin ingin menghapus SEMUA DATA aplikasi (master data, user, aset, pinjaman, log)? Proses tidak bisa dibatalkan!')) return;
    
  ['bangunan', 'ruangan', 'barang', 'asetruangan', 'users', 'pinjamans', 'audit_logs', 'current_user'].forEach(localStorage.removeItem.bind(localStorage));
    
  document.getElementById('resetAppInfo').innerHTML = '<span class="text-success">Semua data aplikasi berhasil direset! Halaman akan dimuat ulang.</span>';
  setTimeout(() => { location.reload(); }, 1200);
}

// 5. Sync Semua Data Master & Aset
document.getElementById('btnSyncSheet').onclick = async function () {
  const bangunanArr   = getData('bangunan');
  const ruanganArr    = getData('ruangan');
  const barangArr     = getData('barang');
  const asetArr       = getData('asetruangan');
  const nowTimestamp = new Date().toISOString();

  const payloadBangunan = bangunanArr.map(b => ({
    'ID': b.id,
    'Nama': b.nama,
    'Timestamp': nowTimestamp
  }));

  const payloadRuangan = ruanganArr.map(r => ({
    'ID': r.id,
    'Nama': r.nama,
    'Bangunan ID': r.bangunanId,
    'Timestamp': nowTimestamp
  }));

  const payloadBarang = barangArr.map(b => ({
    'ID': b.id,
    'Nama': b.nama,
    'Kategori': b.kategori || '',
    'Spesifikasi': b.spesifikasi || '',
    'Timestamp': nowTimestamp
  }));

  const bangunanList = bangunanArr;
  const ruanganList  = ruanganArr;
  const barangList   = barangArr;
  const payloadDaftarAset = asetArr.map(a => {
    const ru = ruanganList.find(r => r.id === a.ruanganId) || { nama: '', bangunanId: '' };
    const ba = bangunanList.find(b => b.id === ru.bangunanId) || { nama: '' };
    const br = barangList.find(b => b.id === a.barangId) || { nama: '', kategori: '', spesifikasi: '' };

    const kebutuhan = a.kebutuhan || 0;
    const jumlah    = a.jumlah || 0;
    const selisih   = kebutuhan ? (jumlah - kebutuhan) : 0;

    return {
      'ID Aset':       a.id,
      'Nama Bangunan': ba.nama,
      'Nama Ruangan':  ru.nama,
      'Nama Barang':   br.nama,
      'Kategori':      br.kategori,
      'Spesifikasi':   br.spesifikasi,
      'Kebutuhan':     kebutuhan,
      'Jumlah':        jumlah,
      'Selisih':       selisih,
      'Kondisi':       a.kondisi || '',
      'Catatan':       a.catatan || '',
      'Timestamp':     nowTimestamp
    };
  });

  try {
    await syncToGoogleSheet('Bangunan', payloadBangunan, () => {
      console.log('✅ Bangunan terkirim.');
    });
  } catch (e) {
    console.warn('Gagal sinkron Bangunan:', e);
  }

  try {
    await syncToGoogleSheet('Ruangan', payloadRuangan, () => {
      console.log('✅ Ruangan terkirim.');
    });
  } catch (e) {
    console.warn('Gagal sinkron Ruangan:', e);
  }

  try {
    await syncToGoogleSheet('Barang', payloadBarang, () => {
      console.log('✅ Barang terkirim.');
    });
  } catch (e) {
    console.warn('Gagal sinkron Barang:', e);
  }

  try {
    await syncToGoogleSheet('Daftar Aset', payloadDaftarAset, () => {
      console.log('✅ Daftar Aset terkirim.');
    });
  } catch (e) {
    console.warn('Gagal sinkron Daftar Aset:', e);
  }

  alert('Sinkronisasi ke Google Sheets selesai (periksa log CONSOLE untuk detail).');
};

// AUTO-REFRESH APPROVAL UNTUK ADMIN
let approvalInterval;

function startApprovalAutoRefresh() {
  if (approvalInterval) clearInterval(approvalInterval);
  approvalInterval = setInterval(() => {
    if (CURRENT_USER && CURRENT_USER.role === 'admin') {
      renderApprovalTable();
    }
  }, 5000);
}

function stopApprovalAutoRefresh() {
  if (approvalInterval) {
    clearInterval(approvalInterval);
    approvalInterval = null;
  }
}

// Auto close navbar when tab is clicked on mobile
document.querySelectorAll('#navbarTabs .nav-link').forEach(link => {
    link.addEventListener('click', () => {
        const navbarCollapse = document.querySelector('.navbar-collapse');
        if (navbarCollapse.classList.contains('show')) {
            const bsCollapse = new bootstrap.Collapse(navbarCollapse, {
                toggle: false
            });
            bsCollapse.hide();
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
  if (CURRENT_USER && CURRENT_USER.role === 'admin') {
    renderApprovalTable();
    startApprovalAutoRefresh();
  }
});

const originalLogout = logout;
logout = function() {
  stopApprovalAutoRefresh();
  originalLogout();
};

window.addEventListener('DOMContentLoaded', () => {
  loadBangunanFromSheet();
  fetchRuanganFromSheet();
  fetchBarangFromSheet();

  fetchDaftarAsetFromSheet();
  fetchHistoryFromSheet();

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
      renderApprovalTable();
      startApprovalAutoRefresh();
    }
  }

  refreshBangunan();
  refreshRuangan();
  refreshBarang();
  refreshFilterKategoriRekap();
  refreshTabelMasterStok();
});