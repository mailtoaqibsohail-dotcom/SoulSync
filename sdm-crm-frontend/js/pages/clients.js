const ClientsPage = {
  async render(container) {
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-building" style="color:var(--accent);margin-right:8px"></i>Clients</h3>
          ${hasPermission('clients:create') ? `<button class="btn btn-primary" onclick="ClientsPage.openCreate()"><i class="fas fa-plus"></i> Add Client</button>` : ''}
        </div>
        <div id="clients-body">${loaderHtml()}</div>
      </div>`;
    await this.load();
  },

  async load() {
    const body = document.getElementById('clients-body');
    if (!body) return;
    try {
      const res = await Api.get('/clients');
      const list = res.clients || [];
      if (!list.length) { body.innerHTML = emptyHtml('fa-building','No clients yet.'); return; }

      body.innerHTML = `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Code</th><th>Company</th><th>Contact</th><th>Email</th><th>Phone</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${list.map(c=>`
                <tr onclick="ClientsPage.openDetail(${c.id})">
                  <td><span class="serial-badge">${esc(c.code)}</span></td>
                  <td style="font-weight:600">${esc(c.company_name)}</td>
                  <td class="text-muted">${esc(c.contact_name||'—')}</td>
                  <td class="text-muted text-sm">${esc(c.contact_email||'—')}</td>
                  <td class="text-muted text-sm">${esc(c.contact_phone||'—')}</td>
                  <td>${c.is_active ? '<span class="badge badge-active">Active</span>' : '<span class="badge badge-cancelled">Inactive</span>'}</td>
                  <td onclick="event.stopPropagation()" style="white-space:nowrap">
                    ${hasPermission('users:create') ? `<button class="btn btn-sm btn-outline btn-icon" title="Create / manage client login" onclick="ClientsPage.openLogins(${c.id},'${esc(c.company_name)}','${esc(c.contact_email||'')}')"><i class="fas fa-user-shield"></i></button>` : ''}
                    ${hasPermission('clients:update') ? `<button class="btn btn-sm btn-outline btn-icon" title="Edit" onclick="ClientsPage.openEdit(${c.id})"><i class="fas fa-edit"></i></button>` : ''}
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    } catch(err) {
      body.innerHTML = emptyHtml('fa-exclamation-triangle', err.message);
    }
  },

  openCreate() {
    this._openForm();
  },

  async openEdit(id) {
    try {
      const res = await Api.get(`/clients/${id}`);
      this._openForm(res.client);
    } catch(err) { toast(err.message,'error'); }
  },

  _openForm(client = null) {
    const editing = !!client;
    document.getElementById('modal-overlay').innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>${editing ? 'Edit Client' : 'Add New Client'}</h3>
          <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>Client Code *</label>
              <input id="c-code" placeholder="e.g. ARAMCO" value="${esc(client?.code||'')}" ${editing?'readonly':''}>
            </div>
            <div class="form-group">
              <label>Company Name *</label>
              <input id="c-name" placeholder="Full company name" value="${esc(client?.company_name||'')}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Contact Person</label>
              <input id="c-contact" placeholder="Name" value="${esc(client?.contact_name||'')}">
            </div>
            <div class="form-group">
              <label>Email</label>
              <input id="c-email" type="email" placeholder="contact@company.com" value="${esc(client?.contact_email||'')}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Phone</label>
              <input id="c-phone" placeholder="+966 xx xxx xxxx" value="${esc(client?.contact_phone||'')}">
            </div>
          </div>
          <div class="form-group">
            <label>Address</label>
            <textarea id="c-address" rows="2">${esc(client?.address||'')}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="ClientsPage.submit(${client?.id||'null'})">
            <i class="fas fa-save"></i> ${editing ? 'Save Changes' : 'Add Client'}
          </button>
        </div>
      </div>`;
    showModal();
  },

  async submit(id) {
    const body = {
      code: document.getElementById('c-code').value.trim().toUpperCase(),
      company_name: document.getElementById('c-name').value.trim(),
      contact_name: document.getElementById('c-contact').value.trim() || undefined,
      contact_email: document.getElementById('c-email').value.trim() || undefined,
      contact_phone: document.getElementById('c-phone').value.trim() || undefined,
      address: document.getElementById('c-address').value.trim() || undefined
    };
    try {
      if (id) { await Api.put(`/clients/${id}`, body); toast('Client updated','success'); }
      else { await Api.post('/clients', body); toast('Client added','success'); }
      closeModal();
      this.load();
    } catch(err) { toast(err.message,'error'); }
  },

  async openLogins(id, companyName, defaultEmail) {
    const overlay = document.getElementById('modal-overlay');
    overlay.innerHTML = `
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3><i class="fas fa-user-shield" style="color:var(--accent);margin-right:8px"></i>Client Logins — ${esc(companyName)}</h3>
          <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <p class="section-title" style="margin-top:0">Existing Portal Users</p>
          <div id="cl-existing">${loaderHtml()}</div>

          <p class="section-title">Create New Login</p>
          <div class="form-row">
            <div class="form-group"><label>First Name *</label><input id="cl-fname"></div>
            <div class="form-group"><label>Last Name *</label><input id="cl-lname"></div>
          </div>
          <div class="form-group">
            <label>Email *</label>
            <input id="cl-email" type="email" value="${esc(defaultEmail||'')}" placeholder="user@${esc((companyName||'company').toLowerCase().replace(/\s+/g,''))}.com">
          </div>
          <div class="form-group">
            <label>Temporary Password *</label>
            <input id="cl-pass" type="text" placeholder="Min 8 characters">
            <p class="text-muted text-sm" style="margin-top:6px">Share this with the client securely. They can change it after first login.</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closeModal()">Close</button>
          <button class="btn btn-primary" onclick="ClientsPage.submitLogin(${id})">
            <i class="fas fa-user-plus"></i> Create Login
          </button>
        </div>
      </div>`;
    showModal();

    try {
      const res = await Api.get(`/clients/${id}/logins`);
      const list = res.users || [];
      document.getElementById('cl-existing').innerHTML = list.length ? `
        <div class="table-wrap"><table>
          <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Last Login</th></tr></thead>
          <tbody>${list.map(u=>`
            <tr>
              <td style="font-weight:500">${esc(u.first_name)} ${esc(u.last_name)}</td>
              <td class="text-muted text-sm">${esc(u.email)}</td>
              <td>${u.is_active ? '<span class="badge badge-active">Active</span>' : '<span class="badge badge-cancelled">Inactive</span>'}</td>
              <td class="text-muted text-sm">${u.last_login_at ? fmtDate(u.last_login_at) : 'Never'}</td>
            </tr>`).join('')}</tbody>
        </table></div>` : `<p class="text-muted text-sm" style="margin:0">No portal logins yet for this client.</p>`;
    } catch (err) {
      document.getElementById('cl-existing').innerHTML = `<p class="text-muted text-sm">${esc(err.message)}</p>`;
    }
  },

  async submitLogin(clientId) {
    const body = {
      first_name: document.getElementById('cl-fname').value.trim(),
      last_name:  document.getElementById('cl-lname').value.trim(),
      email:      document.getElementById('cl-email').value.trim(),
      password:   document.getElementById('cl-pass').value
    };
    if (!body.first_name || !body.last_name || !body.email || !body.password) {
      toast('All fields are required','error'); return;
    }
    if (body.password.length < 8) {
      toast('Password must be at least 8 characters','error'); return;
    }
    try {
      await Api.post(`/clients/${clientId}/login`, body);
      toast(`Login created for ${body.email}`,'success');
      closeModal();
    } catch (err) { toast(err.message,'error'); }
  },

  async openDetail(id) {
    document.getElementById('modal-overlay').innerHTML = `<div class="modal modal-lg"><div class="modal-body">${loaderHtml()}</div></div>`;
    showModal();
    try {
      const res = await Api.get(`/clients/${id}`);
      const c = res.client;
      document.getElementById('modal-overlay').innerHTML = `
        <div class="modal modal-lg">
          <div class="modal-header">
            <div>
              <h3>${esc(c.company_name)}</h3>
              <span class="serial-badge" style="margin-top:4px;display:inline-block">${esc(c.code)}</span>
            </div>
            <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
          </div>
          <div class="modal-body">
            <div class="doc-meta-grid">
              <div class="doc-meta-item"><div class="label">Contact</div><div class="value">${esc(c.contact_name||'—')}</div></div>
              <div class="doc-meta-item"><div class="label">Email</div><div class="value">${esc(c.contact_email||'—')}</div></div>
              <div class="doc-meta-item"><div class="label">Phone</div><div class="value">${esc(c.contact_phone||'—')}</div></div>
              <div class="doc-meta-item"><div class="label">Status</div><div class="value">${c.is_active?'Active':'Inactive'}</div></div>
            </div>
            ${c.address ? `<div style="background:var(--light);border-radius:8px;padding:12px 14px;font-size:13.5px;margin-bottom:16px">${esc(c.address)}</div>` : ''}
            ${c.projects?.length ? `
              <p class="section-title">Projects (${c.projects.length})</p>
              ${c.projects.map(p=>`
                <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
                  <span class="serial-badge">${esc(p.code)}</span>
                  <span style="font-weight:500">${esc(p.name)}</span>
                  ${statusBadge(p.status)}
                </div>`).join('')}` : ''}
          </div>
        </div>`;
    } catch(err) {
      document.getElementById('modal-overlay').innerHTML = `<div class="modal"><div class="modal-body">${emptyHtml('fa-exclamation-triangle',err.message)}</div></div>`;
    }
  }
};
