/* ==========================================================
   standings.js — league table + top scorers / top clean sheets.
   Used by league-a.html, league-b.html, team.html, index.html.
   ========================================================== */

const STANDINGS_COLS = [
  ['Played', 'Played', 'num'],
  ['W', 'W', 'num'],
  ['D', 'D', 'num'],
  ['L', 'L', 'num'],
  ['GF', 'GF', 'num'],
  ['GA', 'GA', 'num'],
  ['GD', 'GD', 'num'],
  ['Clean Sheets', 'CS', 'num'],
  ['Points', 'Pts', 'num']
];

/** rows: Standings_A/B objects. Renders into containerEl. */
function renderStandingsTable(containerEl, rows, opts = {}) {
  const sorted = [...rows].sort((a, b) => (Number(b.Points) || 0) - (Number(a.Points) || 0));

  const head = `<tr><th>#</th><th>Team</th>${STANDINGS_COLS.map(c => `<th class="${c[2]}">${c[1]}</th>`).join('')}</tr>`;

  const body = sorted.map((r, i) => {
    const topRow = i === 0 ? ' top-row' : '';
    const teamLink = opts.linkTeams
      ? `<a href="team.html?team=${encodeURIComponent(r.Team)}">${cplEscape(r.Team)}</a>`
      : cplEscape(r.Team);
    const cells = STANDINGS_COLS.map(c => `<td class="${c[2]}">${cplEscape(r[c[0]] || '0')}</td>`).join('');
    return `<tr class="${topRow.trim()}"><td class="num">${i + 1}</td><td>${teamLink}</td>${cells}</tr>`;
  }).join('');

  containerEl.innerHTML = `<table class="data"><thead>${head}</thead><tbody>${body || '<tr><td colspan="11" class="empty">No standings yet.</td></tr>'}</tbody></table>`;
}

/** Renders a "Top N" list (scorers or clean sheets) from PlayerStats rows. */
function renderTopList(containerEl, rows, statField, opts = {}) {
  const limit = opts.limit || 5;
  const sorted = [...rows]
    .filter(r => Number(r[statField]) > 0)
    .sort((a, b) => (Number(b[statField]) || 0) - (Number(a[statField]) || 0))
    .slice(0, limit);

  if (!sorted.length) {
    containerEl.innerHTML = '<p class="empty">No data yet.</p>';
    return;
  }

  const rowsHtml = sorted.map((r, i) => `
    <tr class="${i === 0 ? 'top-row' : ''}">
      <td class="num">${i + 1}</td>
      <td><a href="players.html?search=${encodeURIComponent(r.Player)}">${cplEscape(r.Player)}</a></td>
      <td>${cplEscape(r.Team)}</td>
      <td class="num">${cplEscape(r[statField])}</td>
    </tr>`).join('');

  containerEl.innerHTML = `
    <table class="data">
      <thead><tr><th>#</th><th>Player</th><th>Team</th><th class="num">${opts.label || statField}</th></tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>`;
}
