// Moto Racing Stats Maker
// This is a little tool for generating Racing-Reference-like motor racing statistics pages.
// :)
// Copyright (c) 2025, Softwave, https://s0ftwave.net/

const initial = [];

const tbody = document.getElementById('tbody');
const addRowBtn = document.getElementById('addRow');
const exportBtn = document.getElementById('exportCsv');
const importBtn = document.getElementById('importCsvBtn');
const fileInput = document.getElementById('csvFileInput');
//const undoBtn = document.getElementById('undoBtn');
const resetBtn = document.getElementById('resetBtn');
const driverNameInput = document.getElementById('driverName');
const totals = {
  races: document.getElementById('totalRaces'),
  wins: document.getElementById('totalWins'),
  poles: document.getElementById('totalPoles'),
  podiums: document.getElementById('totalPodiums'),
  points: document.getElementById('totalPoints'),
  champs: document.getElementById('totalChamps'),
  years: document.getElementById('totalYears')
};


let rows = [];
let history = [];

// fallback sample is empty (starts blank)
const SAMPLE = [];

const STORAGE_KEY = 'racing_stats_v1';

function saveState(pushHistory = true) {
  if(pushHistory){
    history.push(JSON.stringify(rows));
    if(history.length > 50) history.shift();
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ rows, name: driverNameInput.value || '' }));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if(raw){
    try{
      const parsed = JSON.parse(raw);
      rows = Array.isArray(parsed.rows) ? parsed.rows : SAMPLE.slice();
      driverNameInput.value = parsed.name || driverNameInput.value;
      return;
    }catch(e){}
  }
  rows = SAMPLE.slice();
}

function render() {
  tbody.innerHTML = '';
  rows.forEach((r, idx) => tbody.appendChild(rowNode(r, idx)));
  recomputeTotals();
  saveState(false);
}

function rowNode(r, idx) {
  const tr = document.createElement('tr');

  const yearTd = cell('year', r.year, idx);
  const racesTd = numCell('races', r.races, idx);
  const winsTd = numCell('wins', r.wins, idx);
  const polesTd = numCell('poles', r.poles, idx);
  const podsTd = numCell('podiums', r.podiums, idx);
  const ptsTd = numCell('points', r.points, idx);
  const placeTd = cell('place', r.place ?? '', idx);

  const actions = document.createElement('td');
  actions.className = 'row-actions';
  
  const delBtn = smallBtn('Delete', e => { e.stopPropagation(); removeRow(idx); delBtn.classList.add('danger'); });
  actions.appendChild(delBtn);

  // highlight if validation fails 
  if((r.wins || 0) > (r.races || 0)) {
    tr.classList.add('bad');
  }

  tr.append(yearTd, racesTd, winsTd, polesTd, podsTd, ptsTd, placeTd, actions);
  return tr;
}

function cell(key, value, idx) {
  const td = document.createElement('td');
  const input = document.createElement('input');
  input.className = 'input';
  input.value = value ?? '';
  input.addEventListener('change', () => {
    pushHistory();
    // our finishing spot can be a string if need be (like out, DSQ, etc.)
    if(key === 'year'){
      setRowValue(idx, key, parseIntOrEmpty(input.value, true));
    } else if(key === 'place') {
      setRowValue(idx, key, input.value);
    } else {
      setRowValue(idx, key, parseIntOrEmpty(input.value, false));
    }
    render();
  });
  if(key === 'year') input.type = 'number';
  if(key === 'place') input.type = 'text';
  td.appendChild(input);
  return td;
}

function numCell(key, value, idx) {
  const td = document.createElement('td');
  td.className = 'num';
  const input = document.createElement('input');
  input.className = 'input';
  input.value = value ?? 0;
  input.type = 'number';
  input.min = 0;
  input.addEventListener('change', () => {
    pushHistory();
    setRowValue(idx, key, Math.max(0, parseIntOrZero(input.value)));
    // you can't have more wins than races
    const r = rows[idx];
    if(key === 'races' && r.wins > r.races) {
      r.wins = r.races;
    }
    render();
  });
  td.appendChild(input);
  return td;
}

function smallBtn(label, onClick) {
  const btn = document.createElement('button');
  btn.className = 'small-btn';
  btn.textContent = 'x';
  btn.title = 'Delete';
  btn.tabIndex = 0;
  btn.setAttribute('role', 'button');
  btn.addEventListener('click', onClick);
  btn.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(e);
    }
  });
  return btn;
}

function parseIntOrEmpty(v, allowEmpty=false) {
  if(allowEmpty && (v === '' || v === null)) return '';
  const n = parseInt(v,10);
  return isNaN(n) ? 0 : n;
}
function parseIntOrZero(v){ return parseIntOrEmpty(v, false); }

function setRowValue(idx, key, val) {
  rows[idx] = {...rows[idx], [key]: val};
  // post-validation: ensure numeric fields >= 0
  ['races','wins','poles','podiums','points'].forEach(k => {
    rows[idx][k] = Math.max(0, Number(rows[idx][k] || 0));
  });
  // ensure wins <= races
  if(rows[idx].wins > rows[idx].races){
    rows[idx].wins = rows[idx].races;
  }
}

function incrementRow(idx) {
  pushHistory();
  rows = rows.map((r,i) => i===idx ? {...r, wins: (r.wins||0)+1, races: (r.races||0)+1} : {...r});
  render();
}

function removeRow(idx) {
  pushHistory();
  rows.splice(idx,1);
  render();
}

function addRow() {
  pushHistory();
  const maxYear = rows.reduce((m,r)=>Math.max(m, Number(r.year||0)), 0);
  const year = maxYear ? maxYear + 1 : new Date().getFullYear();
  rows.push({ year, races:0, wins:0, poles:0, podiums:0, points:0, place: '' });
  render();
}

function recomputeTotals() {
  const totalsVals = rows.reduce((acc,r) => {
    acc.races += Number(r.races||0);
    acc.wins += Number(r.wins||0);
    acc.poles += Number(r.poles||0);
    acc.podiums += Number(r.podiums||0);
    acc.points += Number(r.points||0);
    // count championships: place exactly "1" or numeric 1
    if(String(r.place) === '1') acc.champs += 1;
    // collect unique years
    if(r.year) acc.yearsSet.add(Number(r.year));
    return acc;
  }, {races:0,wins:0,poles:0,podiums:0,points:0,champs:0,yearsSet:new Set()});

  totals.races.textContent   = totalsVals.races;
  totals.wins.textContent    = totalsVals.wins >= 1 ? totalsVals.wins + " 🏆" : "0";
  totals.poles.textContent   = totalsVals.poles;
  totals.podiums.textContent = totalsVals.podiums;
  totals.points.textContent  = totalsVals.points;
  totals.champs.textContent  = totalsVals.champs >= 1 ? totalsVals.champs + " 👑" : "0";
  totals.years.textContent   = totalsVals.yearsSet.size + " years";
}

// We can import and export driver files. 
function exportCsv() {
  // include driver name as a first metadata line, then header + rows
  const keys = ['year','races','wins','poles','podiums','points','place'];
  const meta = ['driver', (driverNameInput.value || '')];
  const lines = [meta.join(',') , keys.join(',')].concat(rows.map(r => keys.map(k => r[k] ?? '').join(',')));
  const blob = new Blob([lines.join('\n')], {type: 'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (driverNameInput.value || 'driver') + '-stats.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importCsvFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const text = reader.result;
    const parsed = parseCsv(text);
    if(parsed.rows && parsed.rows.length){
      rows = parsed.rows;
      history = [];
      if(parsed.driverName !== undefined){
        driverNameInput.value = parsed.driverName;
      }
      saveState(false);
      render();
    }
  };
  reader.readAsText(file);
}

function parseCsv(text) {
  // CSV parser
  // If first non-empty line starts with "driver,", get driver name.
  const allLines = text.split(/\r?\n/);
  const lines = allLines.map(l => l.trim()).filter(Boolean);
  if(lines.length === 0) return { rows: [] };
  let cursor = 0;
  let driverName;
  const firstCols = lines[0].split(',').map(c => c.trim());
  if(firstCols[0].toLowerCase() === 'driver'){
    driverName = firstCols.slice(1).join(','); // can haz commas in name
    cursor = 1;
  }
  if(cursor >= lines.length) return { rows: [], driverName };
  const headers = lines[cursor].split(',').map(h => h.trim().toLowerCase());
  const out = [];
  for(let i=cursor+1;i<lines.length;i++){
    const cols = lines[i].split(',').map(c => c.trim());
    const obj = {};
    headers.forEach((h,idx) => {
      const val = cols[idx] ?? '';
      obj[h] = isNaN(parseInt(val,10)) ? val : parseInt(val,10);
    });
    out.push({
      year: obj.year || obj.y || '',
      races: Number(obj.races || 0),
      wins: Number(obj.wins || 0),
      poles: Number(obj.poles || 0),
      podiums: Number(obj.podiums || 0),
      points: Number(obj.points || 0),
      place: obj.place ?? ''
    });
  }
  return { rows: out, driverName };
}

// History 
function pushHistory() {
  history.push(JSON.stringify(rows));
  if(history.length > 50) history.shift();
  saveState(false);
}

// Wiring
addRowBtn.addEventListener('click', addRow);
exportBtn.addEventListener('click', exportCsv);
importBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if(f) importCsvFile(f);
  fileInput.value = '';
});
//undoBtn.addEventListener('click', undo);
driverNameInput.addEventListener('change', () => saveState(false));
if(resetBtn){
  resetBtn.addEventListener('click', () => {
    driverNameInput.value = '';
    rows = [];
    history = [];
    saveState(false);
    render();
  });
}

// init
loadState();
render();