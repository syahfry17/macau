// DATA MACAU - hanya membaca Google Sheets, tidak menulis/menghapus data.
// 1) Google Sheets > File > Bagikan > Publikasikan ke web > Sheet1 > CSV.
// 2) Tempel URL CSV hasil publikasi di bawah ini.
const SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTQRyD6E4bb0KU9WvAjmWaItVQNXf0thYXjyvxcN0V2Tcq2yvGldxOtkZ-ipQGtrZNBMGa4K7XJ67ve/pub?output=csv';

const tbody = document.querySelector('#tabelku tbody');
const statusData = document.getElementById('statusData');
const searchInput = document.getElementById('searchInput');
const btnClearSearch = document.getElementById('btnClearSearch');
const infoHasilCari = document.getElementById('infoHasilCari');

function filterTabel() {
  const q = searchInput.value.trim().toLocaleLowerCase('id');
  btnClearSearch.hidden = !q;
  infoHasilCari.hidden = !q;
  // Biar pil hijau nya muncul / hilang cantik
  infoHasilCari.classList.toggle('tampil', Boolean(q));
  btnClearSearch.classList.toggle('tampil', Boolean(q));
  let jumlahBarisCocok = 0;
  for (const tr of tbody.querySelectorAll('tr')) {
    if (tr.classList.contains('tahun')) {
      tr.hidden = Boolean(q);
      tr.style.display = q ? 'none' : '';
      continue;
    }
    const cells = [...tr.querySelectorAll('td')];
    if (cells.length !== 7) continue;
    let cocok = false;
    cells.forEach((td, index) => {
      const value = td.textContent;
      const lower = value.toLocaleLowerCase('id');
      // Buat ulang teks agar highlight lama bersih tanpa mengubah data.
      td.replaceChildren(document.createTextNode(value));
      if (!q || !lower.includes(q)) return;
      cocok = true;
      if (index === 0) return; // tanggal ikut dicari, tapi tidak disorot
      const fragment = document.createDocumentFragment();
      let cursor = 0, pos;
      while ((pos = lower.indexOf(q, cursor)) !== -1) {
        fragment.appendChild(document.createTextNode(value.slice(cursor, pos)));
        const mark = document.createElement('mark');
        mark.className = 'highlight-angka';
        mark.textContent = value.slice(pos, pos + q.length);
        fragment.appendChild(mark);
        cursor = pos + q.length;
      }
      fragment.appendChild(document.createTextNode(value.slice(cursor)));
      td.replaceChildren(fragment);
    });
    tr.style.display = !q || cocok ? '' : 'none';
    if (q && cocok) jumlahBarisCocok++;
  }
  if (q) {
    const kata = searchInput.value.trim();
    infoHasilCari.innerHTML = `Ditemukan <b>${jumlahBarisCocok}</b> tanggal yang mengandung “<b>${kata}</b>”`;
  } else {
    infoHasilCari.innerHTML = '';
  }
}
searchInput.addEventListener('input', filterTabel);
btnClearSearch.addEventListener('click', () => { searchInput.value = ''; filterTabel(); searchInput.focus(); });

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
  filterTabel();
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
