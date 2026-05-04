// User admin — supports MOC hierarchy position + reporting manager
const MOC_POSITIONS = [
  ['',                       '— None (not in MOC chain) —'],
  ['field_in_charge',        'Field In Charge / Plant Manager / RMS'],
  ['manager_production',     'Manager Production'],
  ['moc_interface',          'MOC Interface (HO Operations – Process)'],
  ['manager_mai',            'Manager MAI'],
  ['engineering_manager',    'Engineering Manager'],
  ['manager_hse',            'Manager HSE'],
  ['manager_process_ops',    'Manager Process Operations'],
  ['director_hse',           'Director HSE'],
  ['director_ops',           'Director Operations'],
  ['head_edp',               'Head EDP']
];

const UsersPage = {
  _users: [],

  async render(container) {
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-users" style="color:var(--purple);margin-right:8px"></i>Users</h3>
          <button class="btn btn-primary" onclick="UsersPage.openCreate()"><i class="fas fa-user-plus"></i> Add User</button>
        </div>
        <div id="users-body">${loaderHtml()}</div>
      </div>`;
    await this.load();
  },

  _positionLabel(code) {
    const row = MOC_POSITIONS.find(p => p[0] === (code || ''));
    return row ? row[1] : code;
  },

  _managerName(id) {
    const u = this._users.find(x => x.id === id);
    return u ? `${u.first_name} ${u.last_name}` : '—';
  },

  async load() {
    const body = document.getElementById('users-body');
    if (!body) return;
    try {
      const res = await Api.get('/users');
      this._users = res.users || [];
      if (!this._users.length) { body.innerHTML = emptyHtml('fa-users','No users yet.'); return; }
      body.innerHTML = `
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>User</th><th>Email</th><th>Dept</th><th>MOC Position</th><th>Reports To</th>
              <th>Role</th><th>Status</th><th></th>
            </tr></thead>
            <tbody>
              ${this._users.map(u=>`
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px">
                      <div class="user-avatar" style="background:var(--navy);width:32px;height:32px;font-size:11px">${initials(u.first_name,u.last_name)}</div>
                      <div style="font-weight:600">${esc(u.first_name)} ${esc(u.last_name)}</div>
                    </div>
                  </td>
                  <td class="text-muted text-sm">${esc(u.email)}</td>
                  <td><span class="badge" style="background:var(--light)">${esc(u.department_code)}</span></td>
                  <td class="text-sm">${u.moc_position ? `<span class="badge" style="background:#dbeafe;color:#1e40af">${esc(this._positionLabel(u.moc_position))}</span>` : '<span class="text-muted">—</span>'}</td>
                  <td class="text-sm text-muted">${u.manager_user_id ? esc(this._managerName(u.manager_user_id)) : '—'}</td>
                  <td><span class="badge badge-approved">${esc(u.role?.name||'—')}</span></td>
                  <td>${u.is_active ? '<span class="badge badge-active">Active</span>' : '<span class="badge badge-cancelled">Inactive</span>'}</td>
                  <td style="white-space:nowrap">
                    <button class="btn btn-sm btn-outline btn-icon" onclick="UsersPage.openEdit(${u.id})" title="Edit"><i class="fas fa-pen"></i></button>
                    ${u.is_active ? `<button class="btn btn-sm btn-danger btn-icon" onclick="UsersPage.deactivate(${u.id})" title="Deactivate"><i class="fas fa-user-slash"></i></button>` : ''}
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    } catch(err) {
      body.innerHTML = emptyHtml('fa-exclamation-triangle', err.message);
    }
  },

  _positionOptions(selected = '') {
    return MOC_POSITIONS.map(([v, l]) =>
      `<option value="${v}" ${v === (selected || '') ? 'selected' : ''}>${l}</option>`
    ).join('');
  },

  _managerOptions(selected, excludeId) {
    const opts = ['<option value="">— None —</option>'];
    for (const u of this._users) {
      if (excludeId && u.id === excludeId) continue;
      if (!u.is_active || u.client_id) continue;
      const sel = Number(selected) === u.id ? 'selected' : '';
      opts.push(`<option value="${u.id}" ${sel}>${esc(u.first_name)} ${esc(u.last_name)} — ${esc(u.department_code || '')}${u.moc_position ? ' · ' + esc(this._positionLabel(u.moc_position)) : ''}</option>`);
    }
    return opts.join('');
  },

  openCreate() {
    document.getElementById('modal-overlay').innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>Add New User</h3>
          <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group"><label>First Name *</label><input id="u-fname"></div>
            <div class="form-group"><label>Last Name *</label><input id="u-lname"></div>
          </div>
          <div class="form-group"><label>Email *</label><input id="u-email" type="email" placeholder="user@company.com"></div>
          <div class="form-row">
            <div class="form-group"><label>Password *</label><input id="u-pass" type="password" placeholder="Min 8 characters"></div>
            <div class="form-group">
              <label>Department</label>
              <select id="u-dept">
                <option value="ENG">Engineering</option>
                <option value="HSE">HSE</option>
                <option value="PROC">Procurement</option>
                <option value="MGMT">Management</option>
                <option value="OPS">Operations</option>
                <option value="MAI">MAI</option>
                <option value="EDP">EDP</option>
                <option value="QA">QA</option>
                <option value="GEN">General</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Role *</label>
            <select id="u-role">
              <option value="2">Engineer — Can create &amp; submit MOCs</option>
              <option value="3">Approver — Can approve MOCs</option>
              <option value="4">Viewer — Read-only</option>
              <option value="1">Admin — Full access</option>
              <option value="5">Client — Client portal</option>
            </select>
          </div>
          <div class="form-group">
            <label>MOC Position <span class="text-muted text-sm">(slot in the MSP-HSE-08 approval chain)</span></label>
            <select id="u-position">${this._positionOptions('')}</select>
          </div>
          <div class="form-group">
            <label>Reports To <span class="text-muted text-sm">(used for delegation; assignee can re-route to people under them)</span></label>
            <select id="u-mgr">${this._managerOptions('', null)}</select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="UsersPage.submitCreate()"><i class="fas fa-user-plus"></i> Create User</button>
        </div>
      </div>`;
    showModal();
  },

  openEdit(id) {
    const u = this._users.find(x => x.id === id);
    if (!u) return;
    document.getElementById('modal-overlay').innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>Edit User — ${esc(u.first_name)} ${esc(u.last_name)}</h3>
          <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group"><label>First Name</label><input id="u-fname" value="${esc(u.first_name)}"></div>
            <div class="form-group"><label>Last Name</label><input id="u-lname" value="${esc(u.last_name)}"></div>
          </div>
          <div class="form-group">
            <label>Department</label>
            <select id="u-dept">
              ${['ENG','HSE','PROC','MGMT','OPS','MAI','EDP','QA','GEN'].map(d =>
                `<option value="${d}" ${u.department_code === d ? 'selected' : ''}>${d}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>MOC Position</label>
            <select id="u-position">${this._positionOptions(u.moc_position)}</select>
          </div>
          <div class="form-group">
            <label>Reports To</label>
            <select id="u-mgr">${this._managerOptions(u.manager_user_id, u.id)}</select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="UsersPage.submitEdit(${u.id})"><i class="fas fa-save"></i> Save</button>
        </div>
      </div>`;
    showModal();
  },

  async submitCreate() {
    const body = {
      first_name: document.getElementById('u-fname').value.trim(),
      last_name:  document.getElementById('u-lname').value.trim(),
      email:      document.getElementById('u-email').value.trim(),
      password:   document.getElementById('u-pass').value,
      department_code: document.getElementById('u-dept').value,
      role_id:    parseInt(document.getElementById('u-role').value),
      moc_position:   document.getElementById('u-position').value || null,
      manager_user_id: document.getElementById('u-mgr').value ? Number(document.getElementById('u-mgr').value) : null
    };
    try {
      await Api.post('/users', body);
      toast('User created','success');
      closeModal();
      this.load();
    } catch(err) { toast(err.message,'error'); }
  },

  async submitEdit(id) {
    const body = {
      first_name: document.getElementById('u-fname').value.trim(),
      last_name:  document.getElementById('u-lname').value.trim(),
      department_code: document.getElementById('u-dept').value,
      moc_position:   document.getElementById('u-position').value || null,
      manager_user_id: document.getElementById('u-mgr').value ? Number(document.getElementById('u-mgr').value) : null
    };
    try {
      await Api.patch(`/users/${id}`, body);
      toast('User updated','success');
      closeModal();
      this.load();
    } catch(err) { toast(err.message,'error'); }
  },

  async deactivate(id) {
    if (!confirm('Deactivate this user? They will no longer be able to log in.')) return;
    try {
      await Api.patch(`/users/${id}/deactivate`, {});
      toast('User deactivated','warning');
      this.load();
    } catch(err) { toast(err.message,'error'); }
  }
};
