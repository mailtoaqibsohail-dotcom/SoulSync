const App = {
  currentPage: null,

  init() {
    // Check if already logged in
    const token = Api.getToken();
    const user  = getCurrentUser();

    if (token && user?.id) {
      this.showApp(user);
      const page = location.hash.replace('#/','') || (user.role?.name === 'client' ? 'client-dashboard' : 'dashboard');
      this.gotoPage(page);
    } else {
      this.showLogin();
    }

    LoginPage.init();

    window.addEventListener('hashchange', () => {
      const page = location.hash.replace('#/','');
      if (page) this.gotoPage(page);
    });
  },

  showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-screen').style.display  = 'none';
  },

  showApp(user) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-screen').style.display  = 'flex';

    const isClientRole = user?.role?.name === 'client';

    // Populate sidebar user info
    document.getElementById('sidebar-user-name').textContent = `${user.first_name} ${user.last_name}`;
    document.getElementById('sidebar-user-role').textContent = user.role?.name || '';
    document.getElementById('sidebar-user-avatar').textContent = initials(user.first_name, user.last_name);

    // Build nav based on role
    const nav = document.getElementById('sidebar-nav');
    nav.innerHTML = isClientRole ? this._clientNav() : this._staffNav(user);
  },

  _staffNav(user) {
    const admin = user?.role?.name === 'admin';
    return `
      <div class="nav-section-label">Main</div>
      <button class="nav-item" data-page="dashboard" onclick="App.gotoPage('dashboard')">
        <i class="fas fa-tachometer-alt"></i> Dashboard
      </button>
      <button class="nav-item" data-page="mocs" onclick="App.gotoPage('mocs')">
        <i class="fas fa-exchange-alt"></i> MOC Register
      </button>
      <button class="nav-item" data-page="mocs-audit" onclick="App.gotoPage('mocs-audit')">
        <i class="fas fa-clipboard-list"></i> MOC Audit
      </button>
      <div class="nav-section-label">Projects</div>
      <button class="nav-item" data-page="projects" onclick="App.gotoPage('projects')">
        <i class="fas fa-folder-open"></i> Projects
      </button>
      ${admin ? `
        <div class="nav-section-label">Admin</div>
        <button class="nav-item" data-page="users" onclick="App.gotoPage('users')">
          <i class="fas fa-users"></i> Users
        </button>` : ''}`;
  },

  _clientNav() {
    return `
      <div class="nav-section-label">My Portal</div>
      <button class="nav-item" data-page="client-dashboard" onclick="App.gotoPage('client-dashboard')">
        <i class="fas fa-tachometer-alt"></i> My Dashboard
      </button>
      <button class="nav-item" data-page="client-documents" onclick="App.gotoPage('client-documents')">
        <i class="fas fa-file-alt"></i> My Documents
      </button>`;
  },

  gotoPage(page) {
    const token = Api.getToken();
    if (!token) { this.showLogin(); return; }

    // Prevent double-fire from hashchange listener
    if (location.hash !== '#/' + page) location.hash = '#/' + page;
    this.currentPage = page;
    this._setActiveNav(page);
    this._setPageTitle(page);

    const content = document.getElementById('page-content');
    content.innerHTML = loaderHtml();
    this._renderPage(page, content);
  },

  _renderPage(page, content) {
    switch (page) {
      case 'dashboard':        DashboardPage.render(content);    break;
      case 'documents':        DocumentsPage.render(content);    break;
      case 'mocs':             MOCPage.render(content);          break;
      case 'mocs-audit':       MOCAuditPage.render(content);     break;
      case 'clients':          ClientsPage.render(content);      break;
      case 'projects':         ProjectsPage.render(content);     break;
      case 'users':            UsersPage.render(content);        break;
      case 'client-dashboard': ClientPortalPage.render(content); break;
      case 'client-documents': ClientPortalPage.render(content); break;
      default:                 DashboardPage.render(content);
    }
  },

  _setActiveNav(page) {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });
  },

  _setPageTitle(page) {
    const titles = {
      dashboard: 'Dashboard', documents: 'Documents', mocs: 'MOC Register', 'mocs-audit': 'MOC Audit', clients: 'Clients',
      projects: 'Projects', users: 'Users',
      'client-dashboard': 'My Dashboard', 'client-documents': 'My Documents'
    };
    const t = titles[page] || page;
    const el  = document.getElementById('page-title');         if (el)  el.textContent  = t;
    const mel = document.getElementById('mobile-page-title');  if (mel) mel.textContent = t;
    // Close mobile sidebar on navigation
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('show');
  },

  logout() {
    Api.clearToken();
    location.href = '/';
  }
};

// ── Modal helpers ──────────────────────────────
function showModal()  { document.getElementById('modal-overlay').classList.remove('hidden'); }
function closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); document.getElementById('modal-overlay').innerHTML = ''; }

// Close on backdrop click
document.addEventListener('click', (e) => {
  if (e.target.id === 'modal-overlay') closeModal();
});

document.addEventListener('DOMContentLoaded', () => {
  App.init();
  document.getElementById('btn-logout').addEventListener('click', () => App.logout());
});
