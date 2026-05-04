const ProjectsPage = {
  async render(container) {
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-folder-open" style="color:var(--accent);margin-right:8px"></i>Projects</h3>
          ${hasPermission('projects:create') ? `<button class="btn btn-primary" onclick="ProjectsPage.openCreate()"><i class="fas fa-plus"></i> New Project</button>` : ''}
        </div>
        <div id="projects-body">${loaderHtml()}</div>
      </div>`;
    await this.load();
  },

  async load() {
    const body = document.getElementById('projects-body');
    if (!body) return;
    try {
      const res = await Api.get('/projects');
      const list = res.projects || [];
      if (!list.length) { body.innerHTML = emptyHtml('fa-folder-open','No projects yet.'); return; }

      body.innerHTML = `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Code</th><th>Name</th><th>Client</th><th>Status</th><th>Start</th><th>End</th><th></th></tr></thead>
            <tbody>
              ${list.map(p=>`
                <tr onclick="ProjectsPage.openDetail(${p.id})">
                  <td><span class="serial-badge">${esc(p.code)}</span></td>
                  <td style="font-weight:500;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.name)}</td>
                  <td class="text-muted text-sm">${esc(p.client?.company_name||'—')}</td>
                  <td>${statusBadge(p.status)}</td>
                  <td class="text-muted text-sm">${p.start_date||'—'}</td>
                  <td class="text-muted text-sm">${p.end_date||'—'}</td>
                  <td onclick="event.stopPropagation()">
                    ${hasPermission('projects:update') ? `<button class="btn btn-sm btn-outline btn-icon" onclick="ProjectsPage.openEdit(${p.id})"><i class="fas fa-edit"></i></button>` : ''}
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    } catch(err) {
      body.innerHTML = emptyHtml('fa-exclamation-triangle', err.message);
    }
  },

  async _clientOptions() {
    try {
      const res = await Api.get('/clients');
      return (res.clients||[]).map(c=>`<option value="${c.id}">${esc(c.code)} — ${esc(c.company_name)}</option>`).join('');
    } catch { return ''; }
  },

  async openCreate() { this._openForm(); },

  async openEdit(id) {
    const res = await Api.get(`/projects/${id}`);
    this._openForm(res.project);
  },

  async _openForm(proj = null) {
    const clientOpts = await this._clientOptions();
    const editing = !!proj;
    document.getElementById('modal-overlay').innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>${editing ? 'Edit Project' : 'New Project'}</h3>
          <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>Project Code *</label>
              <input id="p-code" placeholder="e.g. PROJ-001" value="${esc(proj?.code||'')}" ${editing?'readonly':''}>
            </div>
            <div class="form-group">
              <label>Client *</label>
              <select id="p-client"><option value="">— Select —</option>${clientOpts}</select>
            </div>
          </div>
          <div class="form-group">
            <label>Project Name *</label>
            <input id="p-name" placeholder="Full project name" value="${esc(proj?.name||'')}">
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea id="p-desc" rows="2">${esc(proj?.description||'')}</textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Status</label>
              <select id="p-status">
                <option value="active" ${proj?.status==='active'?'selected':''}>Active</option>
                <option value="on_hold" ${proj?.status==='on_hold'?'selected':''}>On Hold</option>
                <option value="completed" ${proj?.status==='completed'?'selected':''}>Completed</option>
                <option value="cancelled" ${proj?.status==='cancelled'?'selected':''}>Cancelled</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Start Date</label>
              <input id="p-start" type="date" value="${esc(proj?.start_date||'')}">
            </div>
            <div class="form-group">
              <label>End Date</label>
              <input id="p-end" type="date" value="${esc(proj?.end_date||'')}">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="ProjectsPage.submit(${proj?.id||'null'})">
            <i class="fas fa-save"></i> ${editing ? 'Save Changes' : 'Create Project'}
          </button>
        </div>
      </div>`;
    showModal();
    if (proj?.client_id) document.getElementById('p-client').value = proj.client_id;
  },

  async submit(id) {
    const body = {
      code: document.getElementById('p-code').value.trim().toUpperCase(),
      name: document.getElementById('p-name').value.trim(),
      client_id: parseInt(document.getElementById('p-client').value),
      description: document.getElementById('p-desc').value.trim() || undefined,
      status: document.getElementById('p-status').value,
      start_date: document.getElementById('p-start').value || undefined,
      end_date: document.getElementById('p-end').value || undefined
    };
    try {
      if (id) { await Api.put(`/projects/${id}`, body); toast('Project updated','success'); }
      else { await Api.post('/projects', body); toast('Project created','success'); }
      closeModal();
      this.load();
    } catch(err) { toast(err.message,'error'); }
  },

  async openDetail(id) {
    document.getElementById('modal-overlay').innerHTML = `<div class="modal"><div class="modal-body">${loaderHtml()}</div></div>`;
    showModal();
    try {
      const res = await Api.get(`/projects/${id}`);
      const p = res.project;
      document.getElementById('modal-overlay').innerHTML = `
        <div class="modal">
          <div class="modal-header">
            <div>
              <h3>${esc(p.name)}</h3>
              <span class="serial-badge" style="display:inline-block;margin-top:4px">${esc(p.code)}</span>
              ${statusBadge(p.status)}
            </div>
            <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
          </div>
          <div class="modal-body">
            <div class="doc-meta-grid">
              <div class="doc-meta-item"><div class="label">Client</div><div class="value">${esc(p.client?.company_name||'—')}</div></div>
              <div class="doc-meta-item"><div class="label">Status</div><div class="value">${statusBadge(p.status)}</div></div>
              <div class="doc-meta-item"><div class="label">Start Date</div><div class="value">${p.start_date||'—'}</div></div>
              <div class="doc-meta-item"><div class="label">End Date</div><div class="value">${p.end_date||'—'}</div></div>
            </div>
            ${p.description ? `<p style="color:var(--muted);font-size:13.5px">${esc(p.description)}</p>` : ''}
          </div>
        </div>`;
    } catch(err) {
      document.getElementById('modal-overlay').innerHTML = `<div class="modal"><div class="modal-body">${emptyHtml('fa-exclamation-triangle',err.message)}</div></div>`;
    }
  }
};
