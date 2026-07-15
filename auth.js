/* ==========================================================
   auth.js — email + password sign-in for players.
   No Google Sign-In: a player sets a password when they register
   (see register-player.html / registrations.js). On login we send
   email + password to the Apps Script backend, which checks it
   against the salted hash stored in Player_Profiles.

   There's no server-side session token — the browser just remembers
   the email + password in sessionStorage for this tab and resends
   both on every write (e.g. saving a bio/photo in profile-edit.js),
   the same way the old Google ID token was resent on every write.
   That keeps things simple, but it does mean the password sits in
   sessionStorage in plaintext for the session, so this is "good
   enough for a small league site over HTTPS", not bank-grade.
   ========================================================== */

function cplSaveSession(email, password, name, team, cplNumber) {
  sessionStorage.setItem('cpl_email', email || '');
  sessionStorage.setItem('cpl_password', password || '');
  sessionStorage.setItem('cpl_name', name || '');
  sessionStorage.setItem('cpl_team', team || '');
  sessionStorage.setItem('cpl_number', cplNumber || '');
}

function cplGetSession() {
  return {
    email: sessionStorage.getItem('cpl_email') || '',
    password: sessionStorage.getItem('cpl_password') || '',
    name: sessionStorage.getItem('cpl_name') || '',
    team: sessionStorage.getItem('cpl_team') || '',
    cplNumber: sessionStorage.getItem('cpl_number') || ''
  };
}

function cplLogout() {
  sessionStorage.removeItem('cpl_email');
  sessionStorage.removeItem('cpl_password');
  sessionStorage.removeItem('cpl_name');
  sessionStorage.removeItem('cpl_team');
  sessionStorage.removeItem('cpl_number');
  window.location.href = 'index.html';
}

/**
 * Renders a login form (or a "signed in as" panel if already signed in)
 * into the given container element.
 */
function initLoginForm(containerId) {
  const container = document.getElementById(containerId);
  const session = cplGetSession();

  if (session.email) {
    container.innerHTML = `
      <p>Signed in as <strong>${cplEscape(session.name || session.email)}</strong> (${cplEscape(session.email)}).</p>
      <button class="btn secondary" id="cpl-logout-btn">Sign out</button>`;
    document.getElementById('cpl-logout-btn').addEventListener('click', cplLogout);
    return;
  }

  container.innerHTML = `
    <form id="cpl-login-form">
      <label for="cpl-login-email">Email</label>
      <input id="cpl-login-email" type="email" required autocomplete="email">

      <label for="cpl-login-password">Password</label>
      <input id="cpl-login-password" type="password" required autocomplete="current-password">

      <button id="cpl-login-submit" type="submit" class="button">Sign In</button>
      <div class="msg" id="cpl-login-msg"></div>
    </form>`;

  const form = container.querySelector('#cpl-login-form');
  const msg = container.querySelector('#cpl-login-msg');
  const submitBtn = container.querySelector('#cpl-login-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = container.querySelector('#cpl-login-email').value.trim();
    const password = container.querySelector('#cpl-login-password').value;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in…';

    try {
      const result = await CPL.post({ action: 'login', email, password });
      if (result && result.ok) {
        cplSaveSession(result.email, password, result.name, result.team, result.cplNumber);
        const redirect = cplQs('redirect');
        window.location.href = redirect || 'players.html';
      } else {
        cplShowMsg(msg, (result && result.error) || 'Sign in failed.', 'err');
      }
    } catch (err) {
      cplShowMsg(msg, 'Could not reach the server. Check your connection and try again.', 'err');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  });
}
