// ─── Toast Notification System ───────────────────────────────────────────────
const showToast = (message, type = 'info', duration = 4000) => {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  toast.onclick = () => toast.remove();

  container.appendChild(toast);
  setTimeout(() => toast.style.opacity = '0', duration - 300);
  setTimeout(() => toast.remove(), duration);
};

window.showToast = showToast;

// ─── Auth State Management ────────────────────────────────────────────────────
const Auth = {
  getToken: () => localStorage.getItem('codetracker_token'),
  getUser: () => {
    const u = localStorage.getItem('codetracker_user');
    return u ? JSON.parse(u) : null;
  },

  setSession: (token, user) => {
    localStorage.setItem('codetracker_token', token);
    localStorage.setItem('codetracker_user', JSON.stringify(user));
  },

  clearSession: () => {
    localStorage.removeItem('codetracker_token');
    localStorage.removeItem('codetracker_user');
  },

  isLoggedIn: () => !!localStorage.getItem('codetracker_token'),

  logout: () => {
    Auth.clearSession();
    window.location.href = 'index.html';
  },

  // Require auth — redirect to login if not logged in
  requireAuth: () => {
    if (!Auth.isLoggedIn()) {
      window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
      return false;
    }
    return true;
  },

  // Update navbar based on auth state
  updateNavbar: () => {
    const user = Auth.getUser();
    const authBtns = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');

    if (user && Auth.isLoggedIn()) {
      if (authBtns) authBtns.style.display = 'none';
      if (userMenu) userMenu.style.display = 'flex';
      if (userAvatar) {
        if (user.avatar) {
          userAvatar.src = user.avatar;
          userAvatar.style.display = 'block';
        } else {
          userAvatar.style.display = 'none';
          // Show initials
          const placeholder = document.getElementById('user-initials');
          if (placeholder) placeholder.textContent = user.name?.charAt(0).toUpperCase() || 'U';
        }
      }
      if (userName) userName.textContent = user.name?.split(' ')[0];
    } else {
      if (authBtns) authBtns.style.display = 'flex';
      if (userMenu) userMenu.style.display = 'none';
    }

    const adminLink = document.getElementById('admin-portal-link');
    if (adminLink) {
      if (user && user.role === 'admin') {
        adminLink.style.display = 'block';
      } else {
        adminLink.style.display = 'none';
      }
    }
  },
};

window.Auth = Auth;
window.showToast = showToast;

// ─── Login Form Handler ───────────────────────────────────────────────────────
const initLoginForm = () => {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const loginTab = document.getElementById('tab-login');
  const registerTab = document.getElementById('tab-register');
  const googleBtn = document.getElementById('btn-google');

  // Tab switching
  if (loginTab && registerTab) {
    loginTab.addEventListener('click', () => {
      loginTab.classList.add('active');
      registerTab.classList.remove('active');
      loginForm.style.display = 'flex';
      registerForm.style.display = 'none';
    });

    registerTab.addEventListener('click', () => {
      registerTab.classList.add('active');
      loginTab.classList.remove('active');
      registerForm.style.display = 'flex';
      loginForm.style.display = 'none';
    });
  }

  // Login
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = loginForm.querySelector('button[type="submit"]');
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Signing in...';

      try {
        const res = await API.authAPI.login(email, password);
        Auth.setSession(res.token, res.user);
        showToast('Welcome back! 🎉', 'success');
        const redirect = new URLSearchParams(window.location.search).get('redirect');
        setTimeout(() => {
          if (res.user.role === 'admin') {
            window.location.href = 'admin.html';
          } else {
            window.location.href = redirect || 'dashboard.html';
          }
        }, 800);
      } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = 'Sign In';
      }
    });
  }

  // Register
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = registerForm.querySelector('button[type="submit"]');
      const name = document.getElementById('reg-name').value;
      const email = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-password').value;

      if (password.length < 6) return showToast('Password must be at least 6 characters', 'warning');

      const role = document.getElementById('reg-role')?.checked ? 'admin' : 'user';

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Creating account...';

      try {
        const res = await API.authAPI.register(name, email, password, role);
        Auth.setSession(res.token, res.user);
        showToast('Account created! Welcome to CodeTracker 🚀', 'success');
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
      } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = 'Create Account';
      }
    });
  }

  // Google OAuth
  if (googleBtn) {
    googleBtn.addEventListener('click', () => API.authAPI.loginWithGoogle());
  }

  // Check URL params (error from OAuth)
  const error = new URLSearchParams(window.location.search).get('error');
  if (error === 'auth_failed') showToast('Google sign-in failed. Try again.', 'error');
};

const toggleTheme = () => {
  const currentTheme = localStorage.getItem('codetracker_theme') || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('codetracker_theme', newTheme);
  document.body.className = newTheme;
  
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    btn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
  });
  
  showToast(`Switched to ${newTheme === 'dark' ? 'Dark' : 'Light'} Mode!`, 'success');
};
window.toggleTheme = toggleTheme;

// ─── Auto-init ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Apply saved theme
  const theme = localStorage.getItem('codetracker_theme') || 'dark';
  document.body.className = theme;

  // Admin route guard: if user is admin and is on a student page, redirect them directly to admin.html
  if (Auth.isLoggedIn()) {
    const user = Auth.getUser();
    const isStudentPage = !window.location.pathname.includes('admin.html') && 
                          !window.location.pathname.includes('login.html') && 
                          !window.location.pathname.includes('index.html') &&
                          !window.location.pathname.includes('auth-callback.html');
    if (user && user.role === 'admin' && isStudentPage) {
      window.location.href = 'admin.html';
      return;
    }
  }

  // Initialize theme toggle buttons
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    btn.addEventListener('click', toggleTheme);
  });

  Auth.updateNavbar();

  // Logout button
  document.querySelectorAll('[data-logout]').forEach((btn) => {
    btn.addEventListener('click', Auth.logout);
  });

  // User dropdown toggle
  const userMenuTrigger = document.getElementById('user-menu-trigger');
  if (userMenuTrigger) {
    userMenuTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('user-dropdown')?.classList.toggle('open');
    });
    document.addEventListener('click', () => {
      document.getElementById('user-dropdown')?.classList.remove('open');
    });
  }

  // Mobile menu toggle
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const sidebar = document.getElementById('sidebar');
  const navLinks = document.getElementById('nav-links');
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (sidebar) sidebar.classList.toggle('open');
      if (navLinks) navLinks.classList.toggle('open');
    });
  }

  // Close sidebar/navLinks when clicking outside
  document.addEventListener('click', (e) => {
    if (sidebar && sidebar.classList.contains('open')) {
      if (!sidebar.contains(e.target) && !mobileMenuBtn?.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    }
    if (navLinks && navLinks.classList.contains('open')) {
      if (!navLinks.contains(e.target) && !mobileMenuBtn?.contains(e.target)) {
        navLinks.classList.remove('open');
      }
    }
  });

  // Init login page if on login.html
  if (document.getElementById('login-form') || document.getElementById('register-form')) {
    initLoginForm();
  }
});
