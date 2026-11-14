// DATA MACAU - hanya membaca Google Sheets, tidak menulis/menghapus data.
// 1) Google Sheets > File > Bagikan > Publikasikan ke web > Sheet1 > CSV.
// 2) Tempel URL CSV hasil publikasi di bawah ini.
const SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTQRyD6E4bb0KU9WvAjmWaItVQNXf0thYXjyvxcN0V2Tcq2yvGldxOtkZ-ipQGtrZNBMGa4K7XJ67ve/pub?output=csv';

const tbody = document.querySelector('#tabelku tbody');
const statusData = document.getElementById('statusData');

// Parser CSV sederhana, mendukung koma, petik ganda, dan baris baru di dalam petik.
function parseCSV(csv) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (ch === '"') {
      if (quoted && csv[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      row.push(field); field = '';
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && csv[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function tampilkanData(rows) {
  // Spreadsheet asli: baris 1 judul, baris 2 sumber, baris 3 header,
  // baris 4 dst data; kolom A = tanggal, B-G = 6 jam.
  const data = rows.slice(3).filter(r => r[0] && r[0].trim());
  tbody.replaceChildren();
  let jumlah = 0;
  for (const r of data) {
    const tanggal = String(r[0] || '').trim();
    if (!tanggal) continue;
    const tr = document.createElement('tr');
    if (/TAHUN\s+20\d{2}/i.test(tanggal)) {
      tr.className = 'tahun';
      const td = document.createElement('td'); td.colSpan = 7;
      td.textContent = tanggal; tr.appendChild(td);
    } else {
      for (let c = 0; c < 7; c++) {
        const td = document.createElement('td');
        const value = String(r[c] ?? '').trim();
        td.textContent = value || (c ? 'xxxx' : '');
        tr.appendChild(td);
      }
      jumlah++;
    }
    tbody.appendChild(tr);
  }
  if (!jumlah) throw new Error('Tidak ada data pada Sheet1. Periksa susunan baris dan link CSV.');
  statusData.textContent = '';
}

async function muatData() {
  if (!SHEETS_CSV_URL.startsWith('https://')) {
    statusData.textContent = 'Hubungkan URL CSV Google Sheets di script.js terlebih dahulu.';
    return;
  }
  statusData.textContent = 'Memuat data terbaru...';
  try {
    const url = new URL(SHEETS_CSV_URL);
    url.searchParams.set('_', Date.now().toString()); // cegah cache lama
    const response = await fetch(url.toString(), { cache: 'no-store' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const csv = await response.text();
    if (csv.trim().startsWith('<')) throw new Error('Link tidak mengembalikan CSV. Pastikan Sheet dipublikasikan sebagai CSV.');
    tampilkanData(parseCSV(csv.replace(/^\uFEFF/, '')));
  } catch (error) {
    statusData.textContent = 'Data gagal dimuat: ' + error.message;
    tbody.replaceChildren();
  }
}
muatData();
