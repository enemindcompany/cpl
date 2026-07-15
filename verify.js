/* ==========================================================
   verify.js — /verify.html?cpl=CPL-2026-0001
   Read-only QR scan destination. Goes through the Apps Script
   endpoint (not the public CSV) so only photo/name/team/status
   are ever exposed — never email, bio, or anything else.
   ========================================================== */

async function initVerifyPage() {
  const cplNumber = cplQs('cpl');
  const root = document.getElementById('verify-root');

  if (!cplNumber) {
    root.innerHTML = '<p class="empty">No CPL number provided.</p>';
    return;
  }

  root.innerHTML = '<p class="loading">Verifying…</p>';

  try {
    const result = await CPL.post({ action: 'verifyCpl', cplNumber });

    if (!result.ok) {
      root.innerHTML = `
        <div class="panel" style="text-align:center;">
          <span class="pill warn">Not Found</span>
          <h1>Not a valid CPL number</h1>
          <p>${cplEscape(result.error || '')}</p>
        </div>`;
      return;
    }

    root.innerHTML = `
      <div class="panel" style="text-align:center;">
        ${result.photoUrl
          ? `<img class="photo" style="margin:0 auto 16px;display:block;" src="${cplEscape(result.photoUrl)}" alt="">`
          : `<div class="avatar-fallback" style="margin:0 auto 16px;">${cplEscape((result.name || '?').slice(0, 2).toUpperCase())}</div>`}
        <h1>${cplEscape(result.name)}</h1>
        <p>${cplEscape(result.team)}</p>
        <span class="pill ok">${cplEscape(result.status)}</span>
        <p class="cpl-number" style="margin-top:16px;">${cplEscape(cplNumber)}</p>
      </div>`;
  } catch (err) {
    console.error(err);
    root.innerHTML = `<p class="empty">Could not verify right now. ${cplEscape(err.message)}</p>`;
  }
}
