// === Konfigurasi Awal ===
const SPREADSHEET_ID = '1lRFH01IHzA_dz_rzpUMQ0z4ZyE7Ek0eoUuYs84oHkwI';

// --- Daftar konfigurasi sheet dan header
const SHEETS_CONFIG = [
  // ... (ISI SAMA SEPERTI PUNYAMU SEBELUMNYA)
  // Copy list konfigurasi sheet di sini, tidak diubah dari skrip kamu sebelumnya
  {
    name: 'Bangunan',
    header: ['ID', 'Nama', 'Timestamp']
  },
  {
    name: 'Ruangan',
    header: ['ID', 'Nama', 'Bangunan ID', 'Timestamp']
  },
  {
    name: 'Barang',
    header: ['ID', 'Nama', 'Kategori', 'Spesifikasi', 'Timestamp']
  },
  {
    name: 'Daftar Aset',
    header: [
      'ID Aset',
      'Nama Bangunan',
      'Nama Ruangan',
      'Nama Barang',
      'Kategori',
      'Spesifikasi',
      'Kebutuhan',
      'Jumlah',
      'Selisih',
      'Kondisi',
      'Catatan',
      'Timestamp'
    ]
  },
  {
    name: 'History Peminjaman',
    header: [
      'Tanggal',
      'Username',
      'Nama Barang',
      'Kategori',
      'Jumlah',
      'Status',
      'Keterangan',
      'Timestamp Server'
    ]
  },
  {
    name: 'Aunth',
    header: ['username', 'password', 'role', 'kategoriAkses', 'Timestamp']
  },
  {
    name: 'Audit Log',
    header: ['Timestamp', 'User', 'Aksi', 'Detail']
  }
];

// --- Function setupSheets, getSheetConfig, mapObjectToRow, findRowById
// ... Copy PERSIS dari script kamu sebelumnya
function setupSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  SHEETS_CONFIG.forEach(conf => {
    let sheet = ss.getSheetByName(conf.name);
    if (!sheet) {
      sheet = ss.insertSheet(conf.name);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, conf.header.length).setValues([conf.header]);
    } else {
      const existingHeader = sheet.getRange(1, 1, 1, conf.header.length).getValues()[0];
      let needRewrite = false;
      for (let i = 0; i < conf.header.length; i++) {
        if (existingHeader[i] !== conf.header[i]) {
          needRewrite = true;
          break;
        }
      }
      if (needRewrite) {
        sheet.getRange(1, 1, 1, conf.header.length).setValues([conf.header]);
      }
    }
  });
}

function getSheetConfig(sheetName) {
  return SHEETS_CONFIG.find(c => c.name === sheetName);
}

function mapObjectToRow(sheetName, dataObj) {
  const conf = getSheetConfig(sheetName);
  if (!conf) throw new Error('Sheet "' + sheetName + '" tidak terdaftar di konfigurasi.');
  return conf.header.map(headerKey => (dataObj[headerKey] !== undefined ? dataObj[headerKey] : ''));
}

function findRowById(sheet, idHeaderKey, idValue) {
  const conf = getSheetConfig(sheet.getName());
  const headerRow = sheet.getRange(1, 1, 1, conf.header.length).getValues()[0];
  const colIndex = headerRow.indexOf(idHeaderKey);
  if (colIndex < 0) return -1;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  const columnValues = sheet.getRange(2, colIndex + 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < columnValues.length; i++) {
    if (columnValues[i][0] === idValue) {
      return i + 2; // baris 2 + index i
    }
  }
  return -1;
}

// --- FUNGSI AGREGASI & SINKRONISASI MASTER BARANG ---
/**
 * Mengumpulkan data dari sheet "Daftar Aset", meng‐agregasi per (Nama Barang, Kategori, Spesifikasi),
 * lalu menuliskan ke sheet "Master Barang" secara otomatis ter‐urut: 
 *   1) pertama berdasarkan Kategori (ascending), 
 *   2) kemudian berdasarkan Nama Barang (ascending).
 */
function updateMasterBarangSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const asetSheet = ss.getSheetByName('Daftar Aset');
  if (!asetSheet) return;
  
  // Ambil semua data Daftar Aset
  const data = asetSheet.getDataRange().getValues();
  if (data.length < 2) return;

  // Tentukan indeks kolom berdasarkan header
  const headers = data[0];
  const idxNamaBarang   = headers.indexOf('Nama Barang');
  const idxKategori     = headers.indexOf('Kategori');
  const idxSpesifikasi  = headers.indexOf('Spesifikasi');
  const idxJumlah       = headers.indexOf('Jumlah');

  if (idxNamaBarang < 0 || idxKategori < 0 || idxSpesifikasi < 0 || idxJumlah < 0) {
    throw new Error('Header "Nama Barang", "Kategori", "Spesifikasi", atau "Jumlah" tidak ditemukan.');
  }

  // Agregasi berdasarkan (Nama Barang, Kategori, Spesifikasi)
  const agregat = {};
  for (let i = 1; i < data.length; i++) {
    const row      = data[i];
    const nama     = row[idxNamaBarang]   || '';
    const kategori = row[idxKategori]     || '';
    const spek     = row[idxSpesifikasi]  || '';
    const jumlah   = parseFloat(row[idxJumlah]) || 0;
    const key      = `${nama}||${kategori}||${spek}`;

    if (!agregat[key]) {
      agregat[key] = {
        nama:     nama,
        kategori: kategori,
        spek:     spek,
        jumlah:   0
      };
    }
    agregat[key].jumlah += jumlah;
  }

  // Ubah agregat menjadi array untuk di‐sort
  const masterRows = Object.values(agregat);

  //  Sort: pertama berdasarkan kategori, lalu berdasarkan nama barang
  masterRows.sort((a, b) => {
    const katCompare = a.kategori.toString().localeCompare(b.kategori.toString());
    if (katCompare !== 0) return katCompare;
    return a.nama.toString().localeCompare(b.nama.toString());
  });

  // Siapkan array 2D untuk ditulis ke sheet:
  // baris pertama = header, sisanya = baris hasil agregasi dan sort
  const masterHeader = ['Nama Barang', 'Kategori', 'Spesifikasi', 'Total Stok'];
  const masterData = [ masterHeader ];
  masterRows.forEach(obj => {
    masterData.push([ obj.nama, obj.kategori, obj.spek, obj.jumlah ]);
  });

  // Hapus sheet lama (jika ada), lalu insert sheet baru "Master Barang"
  let masterSheet = ss.getSheetByName('Master Barang');
  if (masterSheet) {
    ss.deleteSheet(masterSheet);
  }
  masterSheet = ss.insertSheet('Master Barang');

  // Tulis data (header + isi) ke sheet baru, dan bekukan baris header
  masterSheet.getRange(1, 1, masterData.length, masterHeader.length).setValues(masterData);
  masterSheet.setFrozenRows(1);
}


// --- TRIGGER OTOMATIS (edit manual di Sheet) ---
function onEdit(e) {
  try {
    const range = e.range;
    const sheet = range.getSheet();
    if (sheet.getName() === 'Daftar Aset') {
      updateMasterBarangSheet();
    }
  } catch (err) {
    // error silent agar tidak mengganggu edit
  }
}

// --- TRIGGER OTOMATIS (edit lewat API atau perubahan besar) ---
function onChange(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getActiveSheet();
    if (sheet && sheet.getName() === 'Daftar Aset') {
      updateMasterBarangSheet();
    }
  } catch (err) {
    // error silent agar tidak mengganggu
  }
}

// --- FUNGSI API utama (doPost) + update master setiap ada update di Daftar Aset ---
function doPost(e) {
  var response = { status: 'error', message: '' };
  try {
    const jsonData  = JSON.parse(e.postData.contents);
    const action    = jsonData.action || 'append';
    const tableName = jsonData.table;
    const dataArray = jsonData.data;
    if (!tableName || !Array.isArray(dataArray)) {
      response.message = '`table` atau `data` tidak valid.';
      return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeader('Access-Control-Allow-Origin', '*');
    }
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetPrimer = ss.getSheetByName(tableName);
    if (!sheetPrimer) {
      response.message = 'Sheet primer untuk `' + tableName + '` tidak ditemukan.';
      return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeader('Access-Control-Allow-Origin', '*');
    }

    let idHeaderKey = (tableName === 'Daftar Aset') ? 'ID Aset'
                    : (tableName === 'Bangunan' || tableName === 'Ruangan' || tableName === 'Barang') ? 'ID'
                    : null;
    if (!idHeaderKey && ['Bangunan', 'Ruangan', 'Barang', 'Daftar Aset'].indexOf(tableName) >= 0) {
      // nothing to do
    } else if (tableName === 'Aunth') {
      idHeaderKey = 'username';
    } else if (tableName === 'History Peminjaman') {
      idHeaderKey = null;
    } else if (tableName === 'Audit Log') {
      idHeaderKey = null;
    }

    dataArray.forEach(obj => {
      const now = new Date().toISOString();
      if (tableName === 'History Peminjaman') {
        obj['Timestamp Server'] = now;
      } else {
        if (!obj['Timestamp']) obj['Timestamp'] = now;
      }
      if (action === 'append') {
        const rowValues = mapObjectToRow(tableName, obj);
        sheetPrimer.appendRow(rowValues);
      } else if (action === 'update') {
        const idValue   = obj[idHeaderKey];
        const rowIndex  = findRowById(sheetPrimer, idHeaderKey, idValue);
        if (rowIndex > 0) {
          const rowValues = mapObjectToRow(tableName, obj);
          sheetPrimer.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
        }
      } else if (action === 'delete') {
        const idValue  = obj[idHeaderKey];
        const rowIndex = findRowById(sheetPrimer, idHeaderKey, idValue);
        if (rowIndex > 0) {
          sheetPrimer.deleteRow(rowIndex);
        }
      }
    });

    // === SINKRONISASI AGREGAT MASTER BARANG ===
    if (tableName === 'Daftar Aset') {
      updateMasterBarangSheet();
    }

    response.status  = 'success';
    response.message = 'Aksi `' + action + '` untuk sheet `' + tableName + '` berhasil dijalankan untuk ' + dataArray.length + ' objek.';
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader('Access-Control-Allow-Origin', '*');

  } catch (err) {
    response.message = 'Error: ' + err.toString();
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader('Access-Control-Allow-Origin', '*');
  }
}

// --- doGet tetap sama untuk setupSheets ---
function doGet(e) {
  if (e.parameter && e.parameter.action === 'setup') {
    setupSheets();
    return ContentService.createTextOutput('setupSheets() telah dijalankan.')
      .setMimeType(ContentService.MimeType.TEXT)
      .setHeader('Access-Control-Allow-Origin', '*');
  }
  return ContentService.createTextOutput('Gunakan ?action=setup untuk membuat sheet otomatis.')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader('Access-Control-Allow-Origin', '*');
}
