/* ==========================================================
   referees.js — /referees.html
   ========================================================== */

let CPL_ALL_REFEREES = [];

async function initRefereesPage() {
  const root = document.getElementById('referees-table');
  root.innerHTML = '<p class="loading">Loading referees…</p>';
  try {
    const rows = await CPL.get('Referees');
    // Hide anyone still awaiting admin activation. Rows with no Status at
    // all (older entries, added before this column existed) stay visible.
    CPL_ALL_REFEREES = rows.filter(r => (r.Status || '').trim().toLowerCase() !== 'pending');
    renderRefereesTable(CPL_ALL_REFEREES);
    document.getElementById('referees-search').addEventListener('input', (e) => {
      const term = e.target.value.trim().toLowerCase();
      renderRefereesTable(CPL_ALL_REFEREES.filter(r => (r.Name || '').toLowerCase().includes(term)));
    });
  } catch (err) {
    console.error(err);
    root.innerHTML = `<p class="empty">Could not load referees. ${cplEscape(err.message)}</p>`;
  }
}

function renderRefereesTable(rows) {
  const root = document.getElementById('referees-table');
  if (!rows.length) {
    root.innerHTML = '<p class="empty">No referees found.</p>';
    return;
  }
  root.innerHTML = `
    <table class="data">
      <thead><tr><th>Name</th><th>Contact</th><th class="num">Matches Officiated</th></tr></thead>
      <tbody>
        ${rows.map(r => `<tr><td>${cplEscape(r.Name)}</td><td>${cplEscape(r.Contact)}</td><td class="num">${cplEscape(r['Matches Officiated'] || '0')}</td></tr>`).join('')}
      </tbody>
    </table>`;
}
