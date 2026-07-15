/* ==========================================================
   data.js — single source of shared config + data access for the
   whole site. Every page includes this before its own page script.
   ========================================================== */

const CPL_CONFIG = {
  // Replace with your Google Sheet's ID — the long string in its URL
  // between /d/ and /edit, e.g. https://docs.google.com/spreadsheets/d/THIS_PART/edit
  SHEET_ID: '1rLuEFCH1pXp5r0PQkVwLbfrurG8kLVUrUm0QwaVC9E8',

  // Apps Script web app /exec URL (from Deploy > New deployment > Web app)
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzDrp3xFjR6vCDZlQNP3T5woBLADp7Kf_63ZsmK3o7NskISUfprRpkyphNXGFABrIpjXA/exec',

  // Shown in the header and used for CPL number prefixes
  SEASON: '2026'
};

/**
 * Builds the published-CSV URL for a given tab name. The Sheet must be
 * published to the web (File > Share > Publish to web) for this to work,
 * or at minimum shared as "Anyone with the link — Viewer".
 */
function cplSheetCsvUrl(tabName) {
  return `https://docs.google.com/spreadsheets/d/${CPL_CONFIG.SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
}

/**
 * Minimal CSV parser that handles quoted fields (commas/newlines/escaped
 * quotes inside quotes) — good enough for Sheets' CSV export.
 */
function cplParseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (c === '"' && next === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"') { inQuotes = true; }
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* skip, \n handles the row break */ }
      else { field += c; }
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }

  return rows.filter(r => r.some(cell => cell !== ''));
}

function cplRowsToObjects(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (r[i] !== undefined ? r[i] : '').trim(); });
    return obj;
  });
}

async function cplFetchTab(tabName) {
  const res = await fetch(cplSheetCsvUrl(tabName));
  if (!res.ok) throw new Error('Could not load "' + tabName + '" from the Sheet.');
  const text = await res.text();
  return cplRowsToObjects(cplParseCsv(text));
}

const CPL = {
  _cache: {},

  /** Fetches and caches a tab's rows as an array of plain objects. */
  async get(tabName) {
    if (!this._cache[tabName]) {
      this._cache[tabName] = await cplFetchTab(tabName);
    }
    return this._cache[tabName];
  },

  /** Fetches several tabs in parallel. Returns { tabName: rows }. */
  async getMany(tabNames) {
    const results = await Promise.all(tabNames.map(t => this.get(t)));
    const out = {};
    tabNames.forEach((t, i) => { out[t] = results[i]; });
    return out;
  },

  /** Posts an action to the Apps Script backend and returns parsed JSON. */
  async post(payload) {
    const res = await fetch(CPL_CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      // text/plain avoids a CORS preflight against the Apps Script web app
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    return res.json();
  }
};

// ---------- small DOM / string helpers used across pages ----------

function cplQs(param) {
  return new URLSearchParams(window.location.search).get(param);
}

function cplEscape(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
  ));
}

function cplEl(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function cplShowMsg(el, text, kind) {
  el.textContent = text;
  el.className = 'msg show ' + (kind || 'ok');
}

/** Parses dates like "2026-08-15" or "15/08/2026" reasonably well for sorting. */
function cplParseDate(s) {
  if (!s) return new Date(0);
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  const parts = s.split(/[\/\-]/);
  if (parts.length === 3) {
    const [a, b, c] = parts.map(Number);
    // assume DD/MM/YYYY if first part > 12
    if (a > 12) return new Date(c, b - 1, a);
  }
  return new Date(0);
}
