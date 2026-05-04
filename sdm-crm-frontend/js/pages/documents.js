const DocumentsPage = {
  page: 1,
  filters: {},

  async render(container) {
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-file-alt" style="color:var(--sky);margin-right:8px"></i>Documents</h3>
          ${hasPermission('documents:create') ? `<button class="btn btn-primary" onclick="DocumentsPage.openCreate()"><i class="fas fa-plus"></i> New Document</button>` : ''}
        </div>
        <div class="filters">
          <input class="filter-input filter-search" placeholder="Search serial or title…" id="f-search" value="${esc(this.filters.search||'')}">
          <select class="filter-input" id="f-status">
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="issued">Issued</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select class="filter-input" id="f-type">
            <option value="">All Types</option>
            <option value="PFE">PFE</option>
            <option value="MOM">MOM</option>
            <option value="RPT">RPT</option>
            <option value="LTR">LTR</option>
            <option value="DWG">DWG</option>
          </select>
          <select class="filter-input" id="f-dept">
            <option value="">All Departments</option>
            <option value="ENG">Engineering</option>
            <option value="HSE">HSE</option>
            <option value="PROC">Procurement</option>
            <option value="MGMT">Management</option>
          </select>
          <button class="btn btn-outline btn-sm" onclick="DocumentsPage.applyFilters()"><i class="fas fa-search"></i> Filter</button>
        </div>
        <div class="table-wrap" id="docs-table">${loaderHtml()}</div>
        <div id="docs-pagination"></div>
      </div>`;

    // Restore filter values
    if (this.filters.status) document.getElementById('f-status').value = this.filters.status;
    if (this.filters.doc_type_code) document.getElementById('f-type').value = this.filters.doc_type_code;
    if (this.filters.department_code) document.getElementById('f-dept').value = this.filters.department_code;

    document.getElementById('f-search').addEventListener('keydown', e => { if (e.key === 'Enter') this.applyFilters(); });

    await this.loadTable();
  },

  applyFilters() {
    this.page = 1;
    this.filters = {
      search: document.getElementById('f-search').value.trim(),
      status: document.getElementById('f-status').value,
      doc_type_code: document.getElementById('f-type').value,
      department_code: document.getElementById('f-dept').value
    };
    this.loadTable();
  },

  async loadTable() {
    const tableDiv = document.getElementById('docs-table');
    if (!tableDiv) return;
    tableDiv.innerHTML = loaderHtml();

    const params = new URLSearchParams({ page: this.page, limit: 15, ...this.filters });
    // Remove empty
    for (const [k, v] of [...params.entries()]) { if (!v) params.delete(k); }

    try {
      const res = await Api.get('/documents?' + params.toString());
      const docs = res.documents || [];

      if (!docs.length) {
        tableDiv.innerHTML = emptyHtml('fa-file-alt', 'No documents found. Adjust filters or create one.');
        document.getElementById('docs-pagination').innerHTML = '';
        return;
      }

      tableDiv.innerHTML = `
        <table>
          <thead><tr>
            <th>Serial Number</th><th>Title</th><th>Type</th><th>Dept</th>
            <th>Client</th><th>Status</th><th>Created</th><th></th>
          </tr></thead>
          <tbody>
            ${docs.map(d => `
              <tr onclick="DocumentsPage.openDetail(${d.id})">
                <td>${serialBadge(d.serial_number)}</td>
                <td style="max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500">${esc(d.title)}</td>
                <td><span class="badge" style="background:var(--light)">${esc(d.doc_type_code)}</span></td>
                <td class="text-muted">${esc(d.department_code)}</td>
                <td class="text-muted text-sm">${esc(d.client?.company_name || '—')}</td>
                <td>${statusBadge(d.status)}</td>
                <td class="text-muted text-sm">${fmtDate(d.createdAt || d.created_at)}</td>
                <td onclick="event.stopPropagation()">
                  <button class="btn btn-sm btn-outline btn-icon" onclick="Api.download(${d.id},'${esc(d.serial_number)}')" title="Download PDF"><i class="fas fa-download"></i></button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>`;

      // Pagination
      const pages = res.pages || 1;
      const total = res.total || 0;
      document.getElementById('docs-pagination').innerHTML = `
        <div class="pagination">
          <div class="pagination-info">Showing ${(this.page-1)*15+1}–${Math.min(this.page*15,total)} of ${total}</div>
          <div class="pagination-btns">
            <button class="page-btn" ${this.page===1?'disabled':''} onclick="DocumentsPage.goPage(${this.page-1})"><i class="fas fa-chevron-left"></i></button>
            ${Array.from({length:Math.min(pages,5)},(_,i)=>`<button class="page-btn ${i+1===this.page?'active':''}" onclick="DocumentsPage.goPage(${i+1})">${i+1}</button>`).join('')}
            <button class="page-btn" ${this.page>=pages?'disabled':''} onclick="DocumentsPage.goPage(${this.page+1})"><i class="fas fa-chevron-right"></i></button>
          </div>
        </div>`;
    } catch(err) {
      tableDiv.innerHTML = emptyHtml('fa-exclamation-triangle', err.message);
    }
  },

  goPage(p) { this.page = p; this.loadTable(); },

  // ── Create Document Modal ──────────────────────
  async openCreate() {
    let clientsHtml = '<option value="">— None —</option>';
    let projectsHtml = '<option value="">— None —</option>';
    try {
      const [cr, pr] = await Promise.all([Api.get('/clients'), Api.get('/projects')]);
      clientsHtml += (cr.clients||[]).map(c=>`<option value="${c.id}">${esc(c.code)} — ${esc(c.company_name)}</option>`).join('');
      projectsHtml += (pr.projects||[]).map(p=>`<option value="${p.id}">${esc(p.code)} — ${esc(p.name)}</option>`).join('');
    } catch {}

    const user = getCurrentUser();

    document.getElementById('modal-overlay').innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3><i class="fas fa-file-plus" style="color:var(--sky);margin-right:8px"></i>New Document</h3>
          <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Title *</label>
            <input id="d-title" placeholder="e.g. Wellhead Inspection Report — Block 7">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Document Type *</label>
              <select id="d-type">
                <option value="PFE">PFE — Proposal for Engineering</option>
                <option value="MOM">MOM — Minutes of Meeting</option>
                <option value="RPT">RPT — Report</option>
                <option value="LTR">LTR — Letter</option>
                <option value="DWG">DWG — Drawing</option>
                <option value="PRC">PRC — Procedure</option>
                <option value="ITP">ITP — Inspection Test Plan</option>
                <option value="MDR">MDR — Material Document Register</option>
              </select>
            </div>
            <div class="form-group">
              <label>Department *</label>
              <select id="d-dept">
                <option value="ENG">Engineering</option>
                <option value="HSE">HSE</option>
                <option value="PROC">Procurement</option>
                <option value="MGMT">Management</option>
                <option value="QA">Quality Assurance</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Client</label>
              <select id="d-client">${clientsHtml}</select>
            </div>
            <div class="form-group">
              <label>Project</label>
              <select id="d-project">${projectsHtml}</select>
            </div>
          </div>
          <p class="section-title">Document Content Fields</p>
          <div class="form-row">
            <div class="form-group">
              <label>Subject</label>
              <input id="d-subject" placeholder="Document subject">
            </div>
            <div class="form-group">
              <label>Reference No.</label>
              <input id="d-ref" placeholder="Client reference / PO number">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Location / Site</label>
              <input id="d-location" placeholder="e.g. Block 7 Field">
            </div>
            <div class="form-group">
              <label>Revision</label>
              <input id="d-rev" placeholder="e.g. Rev 0" value="Rev 0">
            </div>
          </div>
          <div class="form-group">
            <label>Description / Scope of Work</label>
            <textarea id="d-desc" rows="3" placeholder="Brief description…"></textarea>
          </div>
          <div class="form-group">
            <label>Notes (internal)</label>
            <textarea id="d-notes" rows="2" placeholder="Internal notes…"></textarea>
          </div>
          <div class="form-group">
            <label>Attach Source File (optional)</label>
            <input id="d-file" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg">
            <p class="text-muted text-sm" style="margin-top:6px">PDF, Word, Excel, image or text · max 25 MB</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" id="btn-create-doc" onclick="DocumentsPage.submitCreate()">
            <i class="fas fa-file-plus"></i> Create & Generate Serial
          </button>
        </div>
      </div>`;
    showModal();
  },

  async submitCreate() {
    const btn = document.getElementById('btn-create-doc');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating…';

    const content = {};
    const subj = document.getElementById('d-subject').value; if (subj) content.subject = subj;
    const ref  = document.getElementById('d-ref').value;     if (ref)  content.reference_no = ref;
    const loc  = document.getElementById('d-location').value;if (loc)  content.location = loc;
    const rev  = document.getElementById('d-rev').value;     if (rev)  content.revision = rev;
    const desc = document.getElementById('d-desc').value;    if (desc) content.description = desc;
    const user = getCurrentUser();
    content.prepared_by = `${user.first_name} ${user.last_name}`;

    const body = {
      title: document.getElementById('d-title').value,
      doc_type_code: document.getElementById('d-type').value,
      department_code: document.getElementById('d-dept').value,
      client_id: document.getElementById('d-client').value || undefined,
      project_id: document.getElementById('d-project').value || undefined,
      content,
      notes: document.getElementById('d-notes').value || undefined
    };

    try {
      const res = await Api.post('/documents', body);
      const docId = res.document.id;

      const fileInput = document.getElementById('d-file');
      const file = fileInput?.files?.[0];
      if (file) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading file…';
        try {
          const fd = new FormData();
          fd.append('file', file);
          await Api.upload(`/documents/${docId}/attachment`, fd);
        } catch (upErr) {
          toast('Document created, but attachment upload failed: ' + upErr.message, 'warning');
        }
      }

      closeModal();
      toast(`Document ${res.document.serial_number} created!`, 'success');
      this.page = 1;
      await this.loadTable();
    } catch(err) {
      toast(err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-file-plus"></i> Create & Generate Serial';
    }
  },

  // ── Document Detail Modal ──────────────────────
  async openDetail(id) {
    try {
    document.getElementById('modal-overlay').innerHTML = `<div class="modal modal-lg"><div class="modal-body">${loaderHtml()}</div></div>`;
    showModal();

    try {
      const res = await Api.get(`/documents/${id}`);
      const d   = res.document;
      const statusOrder = ['draft','under_review','approved','issued'];
      const curIdx = statusOrder.indexOf(d.status);

      const transitions = {
        draft:        [{ status:'under_review', label:'Submit for Review', icon:'fa-paper-plane', cls:'btn-primary' }, { status:'cancelled', label:'Cancel', icon:'fa-ban', cls:'btn-danger' }],
        under_review: [{ status:'approved', label:'Approve', icon:'fa-check', cls:'btn-accent' }, { status:'draft', label:'Return to Draft', icon:'fa-undo', cls:'btn-outline' }, { status:'cancelled', label:'Reject', icon:'fa-ban', cls:'btn-danger' }],
        approved:     [{ status:'issued', label:'Issue Document', icon:'fa-stamp', cls:'btn-primary' }, { status:'cancelled', label:'Cancel', icon:'fa-ban', cls:'btn-danger' }],
        issued:       [],
        cancelled:    []
      };

      const actions = (transitions[d.status] || []);
      const canTransition = hasPermission('documents:update_status');

      document.getElementById('modal-overlay').innerHTML = `
        <div class="modal modal-lg">
          <div class="modal-header">
            <div>
              <h3>${esc(d.title)}</h3>
              <div style="margin-top:5px;display:flex;gap:8px;align-items:center">
                ${serialBadge(d.serial_number)}
                ${statusBadge(d.status)}
              </div>
            </div>
            <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
          </div>
          <div class="modal-body">

            <!-- Workflow -->
            <div class="workflow-steps">
              ${statusOrder.map((s,i)=>`
                <div class="workflow-step">
                  <div class="step-circle ${i<curIdx?'done':i===curIdx?'active':''}">
                    ${i<curIdx?'<i class="fas fa-check"></i>':i+1}
                  </div>
                  <div class="step-label">${s.replace('_',' ').replace(/\b\w/g,l=>l.toUpperCase())}</div>
                </div>`).join('')}
            </div>

            <!-- Meta -->
            <div class="doc-meta-grid">
              <div class="doc-meta-item"><div class="label">Document Type</div><div class="value">${esc(d.doc_type_code)}</div></div>
              <div class="doc-meta-item"><div class="label">Department</div><div class="value">${esc(d.department_code)}</div></div>
              <div class="doc-meta-item"><div class="label">Client</div><div class="value">${esc(d.client?.company_name||'—')}</div></div>
              <div class="doc-meta-item"><div class="label">Project</div><div class="value">${esc(d.project?.name||'—')}</div></div>
              <div class="doc-meta-item"><div class="label">Prepared By</div><div class="value">${esc((d.creator?.first_name||'')+' '+(d.creator?.last_name||''))}</div></div>
              <div class="doc-meta-item"><div class="label">Version</div><div class="value">v${d.version}</div></div>
              <div class="doc-meta-item"><div class="label">Created</div><div class="value">${fmtDateTime(d.createdAt || d.created_at)}</div></div>
              <div class="doc-meta-item"><div class="label">Issued</div><div class="value">${d.issued_at ? fmtDateTime(d.issued_at) : '—'}</div></div>
            </div>

            ${(() => {
              let c = d.content;
              if (typeof c === 'string') { try { c = JSON.parse(c); } catch { c = null; } }
              if (!c || typeof c !== 'object' || !Object.keys(c).length) return '';
              return `<p class="section-title">Content</p>
                <div class="doc-meta-grid">
                  ${Object.entries(c).map(([k,v])=>`
                    <div class="doc-meta-item">
                      <div class="label">${esc(k.replace(/_/g,' '))}</div>
                      <div class="value">${esc(v == null ? '' : String(v))}</div>
                    </div>`).join('')}
                </div>`;
            })()}

            ${d.notes ? `<p class="section-title">Notes</p><div style="background:var(--light);border-radius:8px;padding:12px 14px;font-size:13.5px">${esc(d.notes)}</div>` : ''}

            <!-- Actions -->
            ${d.attachment_path ? `
              <p class="section-title">Attached Source File</p>
              <div style="background:var(--light);border-radius:8px;padding:12px 14px;display:flex;align-items:center;gap:12px;font-size:13.5px">
                <i class="fas fa-paperclip" style="color:var(--sky)"></i>
                <div style="flex:1">
                  <div style="font-weight:500">${esc(d.attachment_original_name || 'attachment')}</div>
                  <div class="text-muted text-sm">${d.attachment_mime || ''} · ${d.attachment_size ? Math.round(d.attachment_size/1024)+' KB' : ''}</div>
                </div>
                <button class="btn btn-sm btn-outline" onclick="DocumentsPage.openAttachment(${d.id})"><i class="fas fa-eye"></i> Preview</button>
                <button class="btn btn-sm btn-outline" onclick="DocumentsPage.downloadAttachment(${d.id})"><i class="fas fa-download"></i> Download</button>
              </div>` : ''}

            ${canTransition && actions.length ? `
              <p class="section-title">Actions</p>
              <div class="status-actions">
                ${actions.map(a=>`<button class="btn ${a.cls}" onclick="DocumentsPage.changeStatus(${d.id},'${a.status}')"><i class="fas ${a.icon}"></i> ${a.label}</button>`).join('')}
                <button class="btn btn-outline" onclick="Api.download(${d.id},'${esc(d.serial_number)}')"><i class="fas fa-download"></i> Download PDF</button>
              </div>` : `
              <div class="status-actions" style="margin-top:12px">
                <button class="btn btn-outline" onclick="Api.download(${d.id},'${esc(d.serial_number)}')"><i class="fas fa-download"></i> Download PDF</button>
              </div>`}

            <!-- Audit Trail -->
            ${d.audit_trail?.length ? `
              <p class="section-title">Audit Trail</p>
              <div class="audit-log">
                ${d.audit_trail.map(a=>`
                  <div class="audit-item">
                    <div class="audit-dot"></div>
                    <div>
                      <div class="audit-action">${esc(a.action.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase()))}</div>
                      <div class="audit-meta">${esc(a.actor ? a.actor.first_name+' '+a.actor.last_name : 'System')} · ${fmtDateTime(a.createdAt || a.created_at)}</div>
                    </div>
                  </div>`).join('')}
              </div>` : ''}
          </div>
        </div>`;
    } catch(err) {
      document.getElementById('modal-overlay').innerHTML = `<div class="modal"><div class="modal-body">${emptyHtml('fa-exclamation-triangle',err.message)}<div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">Close</button></div></div></div>`;
    }
    } catch(outerErr) {
      closeModal();
      toast('Could not open document: ' + outerErr.message, 'error');
    }
  },

  async _fetchAttachmentBlob(id) {
    const token = Api.getToken();
    const res = await fetch(`https://mari.proflowenergy.org/api/documents/${id}/attachment?inline=1`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Could not load attachment');
    return res.blob();
  },

  async openAttachment(id) {
    const overlay = document.getElementById('modal-overlay');
    overlay.innerHTML = `
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3><i class="fas fa-eye" style="color:var(--sky);margin-right:8px"></i>Preview</h3>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="btn btn-sm btn-outline" onclick="DocumentsPage.downloadAttachment(${id})"><i class="fas fa-download"></i> Download</button>
            <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
          </div>
        </div>
        <div class="modal-body" id="preview-body" style="padding:0;height:75vh;overflow:hidden;background:#f4f6fa">
          ${loaderHtml()}
        </div>
      </div>`;
    showModal();

    const body = document.getElementById('preview-body');
    try {
      const token = Api.getToken();
      const res = await fetch(`https://mari.proflowenergy.org/api/documents/${id}/preview`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Preview failed (${res.status})`);
      }
      const ctype = (res.headers.get('content-type') || '').toLowerCase();

      if (ctype.includes('pdf')) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        body.innerHTML = `<iframe src="${url}#toolbar=0" style="width:100%;height:100%;border:0;background:#fff" sandbox="allow-same-origin"></iframe>`;
      } else if (ctype.startsWith('image/')) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        body.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:auto"><img src="${url}" style="max-width:100%;max-height:100%;user-select:none;-webkit-user-drag:none" oncontextmenu="return false"></div>`;
      } else if (ctype.includes('application/json')) {
        const data = await res.json();
        if (data.type === 'html') {
          // Wrap mammoth output with read-only styling; sandbox blocks scripts/forms.
          const wrapped = `<!doctype html><html><head><meta charset="utf-8"><style>
            body{font-family:Inter,system-ui,sans-serif;color:#222;background:#fff;padding:32px 48px;line-height:1.55;max-width:900px;margin:0 auto}
            h1,h2,h3{color:#0f2545} table{border-collapse:collapse} td,th{border:1px solid #ccc;padding:6px 10px}
            img{max-width:100%} *{user-select:text} body{-webkit-user-select:text}
          </style></head><body>${data.html}</body></html>`;
          body.innerHTML = `<iframe srcdoc="${wrapped.replace(/"/g,'&quot;')}" sandbox="allow-same-origin" style="width:100%;height:100%;border:0;background:#fff"></iframe>`;
        } else if (data.type === 'text') {
          const safe = (data.text || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
          body.innerHTML = `<pre style="margin:0;padding:24px;height:100%;overflow:auto;background:#fff;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap;word-break:break-word">${safe}</pre>`;
        } else {
          body.innerHTML = emptyHtml('fa-file', 'Preview not available — please download.');
        }
      } else {
        body.innerHTML = emptyHtml('fa-file', 'Preview not available for this file type — please download.');
      }
    } catch (err) {
      body.innerHTML = emptyHtml('fa-exclamation-triangle', err.message);
    }
  },

  async downloadAttachment(id) {
    try {
      const blob = await this._fetchAttachmentBlob(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = ''; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { toast(err.message, 'error'); }
  },

  async changeStatus(id, status) {
    try {
      await Api.patch(`/documents/${id}/status`, { status });
      toast('Status updated', 'success');
      closeModal();
      this.loadTable();
    } catch(err) {
      toast(err.message, 'error');
    }
  }
};
