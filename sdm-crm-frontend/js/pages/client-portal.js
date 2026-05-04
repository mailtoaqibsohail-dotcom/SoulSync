const ClientPortalPage = {
  page: 1,

  async render(container) {
    const user = getCurrentUser();
    container.innerHTML = `
      <div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
        <div class="stat-card">
          <div class="stat-icon blue"><i class="fas fa-file-alt"></i></div>
          <div><div class="stat-value" id="cp-total">—</div><div class="stat-label">My Documents</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green"><i class="fas fa-check-circle"></i></div>
          <div><div class="stat-value" id="cp-issued">—</div><div class="stat-label">Issued</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon orange"><i class="fas fa-clock"></i></div>
          <div><div class="stat-value" id="cp-pending">—</div><div class="stat-label">In Progress</div></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-file-alt" style="color:var(--sky);margin-right:8px"></i>My Documents</h3>
        </div>
        <div class="filters">
          <input class="filter-input filter-search" id="cp-search" placeholder="Search by serial or title…">
          <select class="filter-input" id="cp-status">
            <option value="">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="issued">Issued</option>
            <option value="under_review">Under Review</option>
          </select>
          <button class="btn btn-outline btn-sm" onclick="ClientPortalPage.load()"><i class="fas fa-search"></i></button>
        </div>
        <div id="cp-table">${loaderHtml()}</div>
        <div id="cp-pagination"></div>
      </div>`;

    document.getElementById('cp-search').addEventListener('keydown', e => { if (e.key === 'Enter') this.load(); });
    await this.load();
  },

  async load() {
    const tableDiv = document.getElementById('cp-table');
    if (!tableDiv) return;
    tableDiv.innerHTML = loaderHtml();

    const search = document.getElementById('cp-search')?.value.trim() || '';
    const status = document.getElementById('cp-status')?.value || '';
    const params = new URLSearchParams({ page: this.page, limit: 15 });
    if (search) params.set('search', search);
    if (status) params.set('status', status);

    try {
      const res = await Api.get('/documents?' + params.toString());
      const docs = res.documents || [];

      // Update stats
      const statEl = id => document.getElementById(id);
      if (statEl('cp-total'))   statEl('cp-total').textContent   = res.total || 0;
      if (statEl('cp-issued'))  statEl('cp-issued').textContent  = docs.filter(d=>d.status==='issued').length;
      if (statEl('cp-pending')) statEl('cp-pending').textContent = docs.filter(d=>['draft','under_review'].includes(d.status)).length;

      if (!docs.length) {
        tableDiv.innerHTML = emptyHtml('fa-file-alt','No documents found.');
        document.getElementById('cp-pagination').innerHTML = '';
        return;
      }

      tableDiv.innerHTML = `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Serial Number</th><th>Title</th><th>Type</th><th>Status</th><th>Date</th><th></th></tr></thead>
            <tbody>
              ${docs.map(d=>`
                <tr onclick="DocumentsPage.openDetail(${d.id})">
                  <td>${serialBadge(d.serial_number)}</td>
                  <td style="font-weight:500;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(d.title)}</td>
                  <td><span class="badge" style="background:var(--light)">${esc(d.doc_type_code)}</span></td>
                  <td>${statusBadge(d.status)}</td>
                  <td class="text-muted text-sm">${fmtDate(d.createdAt || d.created_at)}</td>
                  <td onclick="event.stopPropagation()">
                    ${d.status === 'issued' ? `<button class="btn btn-sm btn-primary" onclick="Api.download(${d.id},'${esc(d.serial_number)}')"><i class="fas fa-download"></i> PDF</button>` : ''}
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;

      const pages = res.pages || 1;
      const total = res.total || 0;
      document.getElementById('cp-pagination').innerHTML = pages > 1 ? `
        <div class="pagination">
          <div class="pagination-info">Showing ${(this.page-1)*15+1}–${Math.min(this.page*15,total)} of ${total}</div>
          <div class="pagination-btns">
            <button class="page-btn" ${this.page===1?'disabled':''} onclick="ClientPortalPage.goPage(${this.page-1})"><i class="fas fa-chevron-left"></i></button>
            <button class="page-btn" ${this.page>=pages?'disabled':''} onclick="ClientPortalPage.goPage(${this.page+1})"><i class="fas fa-chevron-right"></i></button>
          </div>
        </div>` : '';
    } catch(err) {
      tableDiv.innerHTML = emptyHtml('fa-exclamation-triangle', err.message);
    }
  },

  goPage(p) { this.page = p; this.load(); }
};
