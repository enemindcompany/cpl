/* ==========================================================
   data.js — single source of shared config + data access for the
   whole site. Every page includes this before its own page script.
   ========================================================== */

const CPL_CONFIG = {
  // Replace with your Google Sheet's ID — the long string in its URL
  // between /d/ and /edit, e.g. https://docs.google.com/spreadsheets/d/THIS_PART/edit
  SHEET_ID: '1rLuEFCH1pXp5r0PQkVwLbfrurG8kLVUrUm0QwaVC9E8',

  // Apps Script web app /exec URL (from Deploy > New deployment > Web app)
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxyFOAk9ISfMmI245kP6invc77NBhRg2euHz6k7Alf26K5S8mkstbap2mTG3q1UWpuzsg/exec',

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

/** Reads a File (e.g. from a file input) as a base64 data URL. Shared by
 * player photo upload (profile-edit.js) and team logo upload (registrations.js). */
function cplFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Reads an image File, downscales it to fit within maxDimension on its
 * longest side, and re-encodes as JPEG at the given quality — returned
 * as a base64 data URL ready to POST to the Apps Script backend.
 *
 * This exists because raw phone-camera photos are routinely 5-12MB.
 * Base64 encoding inflates that by ~33%, and posting that much text to
 * an Apps Script web app is the single most common reason uploads on
 * this site "hang" or silently fail (slow connections time out, and
 * Apps Script itself has execution/payload limits). Shrinking the image
 * client-side, before it's ever base64'd, keeps uploads fast and
 * reliable and keeps photos/logos a consistent size.
 *
 * Rejects if the file isn't an image or is implausibly large (>25MB)
 * before even trying to decode it, so the caller can show a clear error
 * instead of the browser hanging on a huge image decode.
 */
function cplCompressImage(file, opts = {}) {
  const maxDimension = opts.maxDimension || 1000;
  const quality = opts.quality || 0.82;
  const maxSourceBytes = 25 * 1024 * 1024; // 25MB sanity cap on the *original* file

  return new Promise((resolve, reject) => {
    if (!file.type || !file.type.startsWith('image/')) {
      reject(new Error('Please choose an image file (JPG, PNG, etc).'));
      return;
    }
    if (file.size > maxSourceBytes) {
      reject(new Error('That image is too large (max 25MB). Try a smaller photo.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not read that image — try a different file.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round(height * (maxDimension / width));
            width = maxDimension;
          } else {
            width = Math.round(width * (maxDimension / height));
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        // Flatten transparency onto white so PNG logos with alpha don't
        // turn black when re-encoded as JPEG.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
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
