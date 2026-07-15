/* ==========================================================
   player.js — /player.html?id=CPL-2026-0001 (or ?id=Player+Name
   as a fallback while a player hasn't been assigned a number yet)
   ========================================================== */

async function loadPlayerPage() {
  const id = cplQs('id');
  const root = document.getElementById('player-root');
  if (!id) { root.innerHTML = '<p class="empty">No player specified.</p>'; return; }

  try {
    const [profiles, statsA, statsB] = await Promise.all([
      CPL.get('Player_Profiles'), CPL.get('PlayerStats_A'), CPL.get('PlayerStats_B')
    ]);

    const player = profiles.find(p => p.CPL_Number === id) || profiles.find(p => p.Player === id);
    if (!player) { root.innerHTML = '<p class="empty">Player not found.</p>'; return; }

    const stats = [...statsA, ...statsB].find(s => s.Player === player.Player && s.Team === player.Team) || {};

    root.innerHTML = `
      <div class="panel player-header">
        ${player['Photo URL']
          ? `<img class="photo" src="${cplEscape(player['Photo URL'])}" alt="${cplEscape(player.Player)}">`
          : `<div class="avatar-fallback">${cplEscape((player.Player || '?').slice(0, 2).toUpperCase())}</div>`}
        <div class="meta">
          <h1>${cplEscape(player.Player)}</h1>
          <p>${cplEscape(player.Team)} ${player.Position ? '&middot; ' + cplEscape(player.Position) : ''}</p>
          <p class="cpl-number">${cplEscape(player.CPL_Number || 'Pending assignment')}</p>
        </div>
      </div>

      <div class="panel">
        <span class="eyebrow">Season Stats</span>
        <table class="data">
          <thead><tr><th class="num">Goals</th><th class="num">Assists</th><th class="num">Clean Sheets</th><th class="num">Yellow</th><th class="num">Red</th></tr></thead>
          <tbody><tr>
            <td class="num">${cplEscape(stats.Goals || '0')}</td>
            <td class="num">${cplEscape(stats.Assists || '0')}</td>
            <td class="num">${cplEscape(stats['Clean Sheets'] || '0')}</td>
            <td class="num">${cplEscape(stats.Yellow || '0')}</td>
            <td class="num">${cplEscape(stats.Red || '0')}</td>
          </tr></tbody>
        </table>
      </div>

      <div class="panel">
        <span class="eyebrow">Bio</span>
        <p>${cplEscape(player.Bio || 'No bio yet.')}</p>
      </div>

      <div class="panel">
        <span class="eyebrow">Player Card</span>
        <div id="playerCardTemplate"></div>
        <button id="download-card-btn">Download My Card</button>
      </div>

      <div class="panel" id="player-edit-panel" style="display:none;"></div>
    `;

    initCardGenerator(player);

    const session = cplGetSession();
    if (session.email && player.Email && session.email.toLowerCase() === player.Email.toLowerCase()) {
      const editPanel = document.getElementById('player-edit-panel');
      editPanel.style.display = 'block';
      initProfileEdit(editPanel, player.Bio);
    }
  } catch (err) {
    console.error(err);
    root.innerHTML = `<p class="empty">Could not load player. ${cplEscape(err.message)}</p>`;
  }
}
