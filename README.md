# Chuka Premier League — Site

A static site (no build step) for the Chuka Premier League, backed entirely
by a Google Sheet (data) and a Google Apps Script web app (writes/uploads).
Pair this with the `chuka-premier-league-apps-script` project.

## How it works

- **Reads** (standings, fixtures, teams, players, news, gallery, equipment,
  referees) come straight from the Sheet's published CSV export — fast,
  free, no auth. See `data.js` → `CPL.get()`.
- **Writes** (registrations, enquiries, login, profile edits, image
  uploads) go through the Apps Script `/exec` endpoint as a POST. See
  `data.js` → `CPL.post()`.
- Every registration lands as a `Pending` row — an admin reviews and
  activates it directly in the Sheet. Nothing self-approves except CPL
  number assignment, which is a semi-automatic trigger (admin sets
  `Status = Paid`, the script does the rest).

## One-time setup

1. **Create the Google Sheet** that will hold all data (or use an
   existing one) and copy its ID from the URL — the long string between
   `/d/` and `/edit`.
2. **Set up the Apps Script backend** — see the `apps-script` project's
   README/comments. Run `runFullSetup()` once, then
   **Deploy → New deployment → Web app** (Execute as: Me, Who has
   access: Anyone). Copy the resulting `/exec` URL.
3. **Configure this site** — open `data.js` and set:
   ```js
   SHEET_ID: 'your-sheet-id-here',
   APPS_SCRIPT_URL: 'https://script.google.com/macros/s/.../exec',
   ```
4. **Publish the Sheet to the web** (File → Share → Publish to web), or
   at minimum share it as "Anyone with the link — Viewer", so the CSV
   read endpoints work.
5. Host the `site/` folder anywhere that serves static files (GitHub
   Pages, Netlify, Cloudflare Pages, a plain web server — no build step
   needed).

## Uploads (player photos, team logos)

Two flows upload an image to Google Drive via the Apps Script backend:

- **Team logo**, on `register-team.html` (optional, at registration time)
- **Player photo**, on `player.html` (via the bio/photo edit panel a
  signed-in player sees on their own profile)

Both now go through `cplCompressImage()` in `data.js` before upload:
the image is downscaled to fit within ~800px and re-encoded as a
JPEG in the browser using a `<canvas>`, *before* it's base64-encoded and
POSTed. This matters because:

- Raw phone-camera photos are routinely 5–12MB. Base64 inflates that by
  ~33%. Posting a 15MB+ text body to an Apps Script web app is the most
  common reason an upload silently hangs, times out, or fails on a slow
  connection — compressing first keeps every upload well under ~1MB.
- The backend (`saveImageToDrive_` in `code.gs`) now also detects the
  real image type from the data URL instead of assuming JPEG, and
  rejects oversized payloads with a clear error instead of failing
  silently.

**If an upload still doesn't work**, check, in order:
1. Did you run `runFullSetup()` in the Apps Script project? It creates
   the `CPL-Player-Photos` / `CPL-Team-Logos` Drive folders and stores
   their IDs in Script Properties — uploads fail with "Drive folder not
   configured" without this.
2. Did you **redeploy** the web app after any script change? Apps Script
   web app URLs are pinned to a specific deployment version — editing
   `code.gs` does nothing to the live `/exec` URL until you deploy a new
   version (or update the existing deployment).
3. Is `APPS_SCRIPT_URL` in `data.js` the exact `/exec` URL from that
   deployment?
4. Open the browser console on submit — `CPL.post()` failures (network
   errors, non-JSON responses) show up there, and the Apps Script
   project's **Executions** log (in the Apps Script editor) shows any
   server-side error with a stack trace.

## File map

| File | Purpose |
|---|---|
| `data.js` | Config, CSV reader, `CPL.get`/`CPL.post`, `cplCompressImage`, shared helpers |
| `layout.js` | Shared header/nav/footer |
| `auth.js` | Player login (email + password), session in `sessionStorage` |
| `registrations.js` | Player / team / referee registration forms |
| `profile-edit.js` | Signed-in player's bio + photo edit panel |
| `standings.js`, `fixtures.js`, `teams.js` | League A/B tables, fixtures, team pages |
| `players-directory.js`, `player.js`, `card.js` | Player list, profile page, downloadable QR player card |
| `verify.js` | Public `/verify.html?cpl=...` QR scan lookup |
| `referees.js`, `equipment.js`, `gallery.js`, `enquiries.js` | Referees list, equipment list, media gallery, enquiries form |

## Known, intentional limits

- No server-side sessions — the player's password is re-sent (from
  `sessionStorage`) on every write. Fine for a small community site over
  HTTPS; not bank-grade.
- Passwords are salted SHA-256, not a slow KDF (Apps Script has no
  bcrypt/scrypt available).
- Team and referee registrations never self-activate — an admin always
  does the final step by hand in the Sheet.
