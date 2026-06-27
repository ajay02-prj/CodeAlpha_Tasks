/* ─────────────────────────────────────────
   auth.js — Login & Register page logic
   ───────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  // Redirect logged-in users to feed
  redirectIfLoggedIn();

  // ── Determine which page we're on ──
  const loginForm    = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  if (loginForm)    initLoginPage();
  if (registerForm) initRegisterPage();
});

// ─────────────────────────────────────────
//  LOGIN PAGE
// ─────────────────────────────────────────
function initLoginPage() {
  const form     = document.getElementById('login-form');
  const errorBox = document.getElementById('login-error');
  const submitBtn = document.getElementById('login-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
      showError(errorBox, 'Please fill in all fields');
      return;
    }

    setButtonLoading(submitBtn, true);
    hideError(errorBox);

    try {
      const data = await Auth.login({ username, password });
      setToken(data.token);
      setUser(data.user);
      showToast('Welcome back, ' + data.user.username + '! 🎉', 'success');
      setTimeout(() => { window.location.href = '/feed.html'; }, 600);
    } catch (err) {
      showError(errorBox, err.message);
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });
}

// ─────────────────────────────────────────
//  REGISTER PAGE
// ─────────────────────────────────────────
function initRegisterPage() {
  const form     = document.getElementById('register-form');
  const errorBox = document.getElementById('register-error');
  const submitBtn = document.getElementById('register-btn');
  const passwordInput = document.getElementById('reg-password');

  // Password strength indicator
  if (passwordInput) {
    passwordInput.addEventListener('input', () => {
      updatePasswordStrength(passwordInput.value);
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('reg-username').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm  = document.getElementById('reg-confirm').value;

    if (!username || !email || !password || !confirm) {
      showError(errorBox, 'Please fill in all fields');
      return;
    }

    if (password !== confirm) {
      showError(errorBox, 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      showError(errorBox, 'Password must be at least 6 characters');
      return;
    }

    setButtonLoading(submitBtn, true);
    hideError(errorBox);

    try {
      const data = await Auth.register({ username, email, password });
      setToken(data.token);
      setUser(data.user);
      showToast('Account created! Welcome, ' + data.user.username + '! 🚀', 'success');
      setTimeout(() => { window.location.href = '/feed.html'; }, 700);
    } catch (err) {
      showError(errorBox, err.message);
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });
}

// ── Helpers ────────────────────────────────
function showError(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
}

function hideError(el) {
  if (!el) return;
  el.classList.remove('show');
}

function setButtonLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = `<span class="btn-spinner"></span> Please wait...`;
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.originalText || 'Submit';
  }
}

function updatePasswordStrength(password) {
  const bars = document.querySelectorAll('.strength-bar');
  if (!bars.length) return;

  bars.forEach(b => b.className = 'strength-bar');

  const score = getPasswordScore(password);

  if (score >= 1) bars[0].classList.add('active-weak');
  if (score >= 2) bars[1].classList.add('active-medium');
  if (score >= 3) {
    bars[0].classList.add('active-strong');
    bars[1].classList.add('active-strong');
    bars[2].classList.add('active-strong');
  }
}

function getPasswordScore(pwd) {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) score++;
  return Math.min(score, 3);
}
