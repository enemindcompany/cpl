/* ==========================================================
   card.js — client-side player card generator + QR code.
   Requires html2canvas and qrcode.js (loaded via CDN in player.html).
   Everything runs in the browser from data already on the page —
   no server round-trip at generation time.
   ========================================================== */

function initCardGenerator(player) {
  const template = document.getElementById('playerCardTemplate');

  template.innerHTML = `
    <div class="cardTop">
      ${player['Photo URL']
        ? `<img class="cardPhoto" src="${cplEscape(player['Photo URL'])}" crossorigin="anonymous" alt="">`
        : ''}
      <div>
        <div style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:1.2rem;">${cplEscape(player.Player)}</div>
        <div style="color:var(--muted);font-size:0.85rem;">${cplEscape(player.Team)}</div>
        <div class="cpl-number">${cplEscape(player.CPL_Number || 'Pending')}</div>
      </div>
    </div>
    <div class="cardQr" id="cardQrHolder"></div>
    <div style="text-align:center;font-family:'IBM Plex Mono',monospace;font-size:0.7rem;color:var(--muted);margin-top:8px;">
      Season ${CPL_CONFIG.SEASON}
    </div>`;

  const qrHolder = document.getElementById('cardQrHolder');
  if (player.CPL_Number && typeof QRCode !== 'undefined') {
    const verifyUrl = `${window.location.origin}${window.location.pathname.replace('player.html', 'verify.html')}?cpl=${encodeURIComponent(player.CPL_Number)}`;
    new QRCode(qrHolder, { text: verifyUrl, width: 96, height: 96 });
  } else {
    qrHolder.innerHTML = '<p class="empty" style="text-align:center;">QR code available once a CPL number is assigned.</p>';
  }

  const downloadBtn = document.getElementById('download-card-btn');
  downloadBtn.addEventListener('click', async () => {
    if (typeof html2canvas === 'undefined') {
      alert('Card generator library failed to load — check your connection and try again.');
      return;
    }
    downloadBtn.disabled = true;
    downloadBtn.textContent = 'Generating…';
    try {
      const canvas = await html2canvas(template, { backgroundColor: '#0B1B2B', scale: 2 });
      const link = document.createElement('a');
      link.download = `${player.CPL_Number || player.Player}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      downloadBtn.disabled = false;
      downloadBtn.textContent = 'Download My Card';
    }
  });
}
