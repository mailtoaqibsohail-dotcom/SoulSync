const LoginPage = {
  portalType: 'staff',  // 'staff' | 'client'

  init() {
    // Tab switching
    document.querySelectorAll('.portal-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.portalType = btn.dataset.portal;
        document.querySelectorAll('.portal-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.updatePortalUI();
      });
    });

    document.getElementById('login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.doLogin();
    });
  },

  updatePortalUI() {
    const isClient = this.portalType === 'client';
    document.getElementById('login-heading').textContent    = isClient ? 'Client Portal' : 'Staff Login';
    document.getElementById('login-subtitle').textContent   = isClient ? 'Access your project documents' : 'Sign in to manage documents';
    document.getElementById('btn-login-text').textContent   = isClient ? 'Access Client Portal' : 'Sign In';
    document.body.classList.toggle('client-mode', isClient);
  },

  async doLogin() {
    const email    = document.getElementById('inp-email').value.trim();
    const password = document.getElementById('inp-password').value;
    const btn      = document.getElementById('btn-login');
    const errDiv   = document.getElementById('login-error');

    errDiv.style.display = 'none';
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in…';

    try {
      const data = await Api.post('/auth/login', { email, password });
      Api.setToken(data.token);
      localStorage.setItem('sdm_user', JSON.stringify(data.user));

      const role = data.user?.role?.name;

      // Client-role users forced into client portal regardless of tab
      if (role === 'client') {
        App.showApp(data.user);
        App.gotoPage('client-dashboard');
      } else if (this.portalType === 'client') {
        // Non-client user tried client tab
        errDiv.textContent = 'This portal is for clients only. Use Staff Login.';
        errDiv.style.display = 'block';
        Api.clearToken();
        return;
      } else {
        App.showApp(data.user);
        App.gotoPage('dashboard');
      }
    } catch (err) {
      errDiv.textContent = err.message || 'Login failed. Check credentials.';
      errDiv.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<span id="btn-login-text">${this.portalType === 'client' ? 'Access Client Portal' : 'Sign In'}</span>`;
    }
  }
};
