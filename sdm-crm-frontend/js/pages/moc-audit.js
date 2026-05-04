// MOC Audit — date-range aggregates + PDF export
const MOCAuditPage = {
  _data: null,

  async render(container) {
    const today = new Date();
    const yearAgo = new Date(today.getTime() - 365 * 86400000);
    const fmt = d => d.toISOString().slice(0, 10);

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-clipboard-list" style="color:var(--accent);margin-right:8px"></i>MOC Audit Report</h3>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <label class="text-sm text-muted">From</label>
            <input type="date" id="audit-from" class="form-control" style="max-width:160px" value="${fmt(yearAgo)}">
            <label class="text-sm text-muted">To</label>
            <input type="date" id="audit-to" class="form-control" style="max-width:160px" value="${fmt(today)}">
            <button class="btn btn-outline" onclick="MOCAuditPage.load()"><i class="fas fa-sync"></i> Apply</button>
            <button class="btn btn-primary" onclick="MOCAuditPage.exportPdf()"><i class="fas fa-file-pdf"></i> Export PDF</button>
          </div>
        </div>
        <div id="audit-body" style="padding:16px">${loaderHtml()}</div>
      </div>`;
    await this.load();
  },

  _range() {
    const from = document.getElementById('audit-from')?.value || '';
    const to   = document.getElementById('audit-to')?.value   || '';
    return { from, to };
  },

  async load() {
    const body = document.getElementById('audit-body');
    if (!body) return;
    body.innerHTML = loaderHtml();
    try {
      const { from, to } = this._range();
      const data = await Api.get(`/mocs/audit?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      this._data = data;
      body.innerHTML = this._render(data);
    } catch (err) {
      body.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>${esc(err.message)}</p></div>`;
    }
  },

  _pretty(s) {
    if (s === null || s === undefined || s === '') return '—';
    return String(s).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  },

  _stageLabel(n) {
    const names = { 1: 'Stage 1 — Initiate', 2: 'Stage 2 — Classify / Approve', 3: 'Stage 3 — Execute', 4: 'Stage 4 — Close / PSSR' };
    return names[n] || `Stage ${n}`;
  },

  _kindLabel(k) {
    if (k === 'moc') return 'MOC';
    if (k === 'dispensation') return 'Dispensation';
    return this._pretty(k);
  },

  _statusBadge(s) {
    const map = {
      draft:             ['#e2e8f0', '#475569'],
      in_review:         ['#fef3c7', '#92400e'],
      revision_required: ['#fee2e2', '#991b1b'],
      approved:          ['#dcfce7', '#166534'],
      rejected:          ['#fee2e2', '#991b1b'],
      in_execution:      ['#dbeafe', '#1e40af'],
      pssr:              ['#ede9fe', '#5b21b6'],
      closed:            ['#f1f5f9', '#0f172a'],
      cancelled:         ['#fee2e2', '#991b1b'],
      expired:           ['#fef3c7', '#9a3412']
    };
    const [bg, fg] = map[s] || ['#e2e8f0', '#475569'];
    return `<span class="badge" style="background:${bg};color:${fg}">${esc(this._pretty(s))}</span>`;
  },

  _classBadge(v) {
    if (v === 'major')   return '<span class="badge" style="background:#fee2e2;color:#991b1b">Major</span>';
    if (v === 'minor')   return '<span class="badge" style="background:#dcfce7;color:#166534">Minor</span>';
    if (v === 'pending') return '<span class="badge" style="background:#fef3c7;color:#92400e">Pending</span>';
    return `<span class="badge">${esc(this._pretty(v))}</span>`;
  },

  _riskBadge(v) {
    if (v === 'high')    return '<span class="badge" style="background:#fee2e2;color:#991b1b">High</span>';
    if (v === 'low')     return '<span class="badge" style="background:#dcfce7;color:#166534">Low</span>';
    if (v === 'pending') return '<span class="badge" style="background:#fef3c7;color:#92400e">Pending</span>';
    return `<span class="badge">${esc(this._pretty(v))}</span>`;
  },

  _tile(label, value, opts = {}) {
    const { icon = 'fa-chart-bar', tone = 'slate', suffix = '' } = opts;
    const tones = {
      slate:  ['#0f172a', '#f1f5f9', '#475569'],
      blue:   ['#1e40af', '#dbeafe', '#1e40af'],
      green:  ['#166534', '#dcfce7', '#16a34a'],
      red:    ['#991b1b', '#fee2e2', '#dc2626'],
      orange: ['#9a3412', '#ffedd5', '#ea580c'],
      amber:  ['#92400e', '#fef3c7', '#d97706'],
      violet: ['#5b21b6', '#ede9fe', '#7c3aed']
    };
    const [textColor, bgColor, iconColor] = tones[tone] || tones.slate;
    const v = (value === null || value === undefined) ? 0 : value;
    return `
      <div style="background:#fff;border:1px solid var(--border);border-radius:12px;padding:14px 16px;min-width:150px;flex:1;display:flex;align-items:center;gap:12px">
        <div style="width:38px;height:38px;border-radius:10px;background:${bgColor};color:${iconColor};display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <i class="fas ${icon}"></i>
        </div>
        <div style="min-width:0">
          <div class="text-muted" style="font-size:11px;font-weight:600;letter-spacing:.4px;text-transform:uppercase">${esc(label)}</div>
          <div style="font-size:22px;font-weight:700;color:${textColor};line-height:1.1;margin-top:2px">${esc(v)}${suffix ? `<span style="font-size:12px;font-weight:500;color:var(--muted);margin-left:3px">${esc(suffix)}</span>` : ''}</div>
        </div>
      </div>`;
  },

  _timingTile(label, value) {
    const hasValue = value !== null && value !== undefined;
    return `
      <div style="background:#fff;border:1px solid var(--border);border-radius:12px;padding:14px 16px;min-width:150px;flex:1">
        <div class="text-muted" style="font-size:11px;font-weight:600;letter-spacing:.4px;text-transform:uppercase">${esc(label)}</div>
        <div style="font-size:22px;font-weight:700;line-height:1.1;margin-top:6px;color:${hasValue ? '#0f172a' : '#cbd5e1'}">
          ${hasValue ? esc(value) : '—'}<span style="font-size:12px;font-weight:500;color:var(--muted);margin-left:4px">${hasValue ? 'days' : 'no data'}</span>
        </div>
      </div>`;
  },

  _mapTable(title, icon, map, formatter) {
    const fmt = formatter || (k => esc(this._pretty(k)));
    const entries = Object.entries(map || {});
    const total = entries.reduce((a, [, v]) => a + (Number(v) || 0), 0);
    return `
      <div style="background:#fff;border:1px solid var(--border);border-radius:12px;padding:14px 16px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <i class="fas ${icon}" style="color:var(--accent)"></i>
          <h4 style="margin:0;font-size:14px">${esc(title)}</h4>
        </div>
        ${entries.length ? `
          <table style="width:100%;font-size:13px">
            <tbody>
              ${entries.map(([k, v]) => {
                const pct = total ? Math.round((Number(v) || 0) / total * 100) : 0;
                return `
                  <tr>
                    <td style="padding:6px 0;border-bottom:1px solid var(--border)">${fmt(k)}</td>
                    <td style="padding:6px 0;border-bottom:1px solid var(--border);width:90px">
                      <div style="height:6px;background:#f1f5f9;border-radius:3px;overflow:hidden">
                        <div style="height:100%;width:${pct}%;background:var(--accent)"></div>
                      </div>
                    </td>
                    <td style="padding:6px 0 6px 8px;border-bottom:1px solid var(--border);text-align:right;font-weight:700;width:40px">${esc(v)}</td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        ` : `<div class="text-muted text-sm" style="padding:8px 0">No data in this range</div>`}
      </div>`;
  },

  _render(d) {
    const t = d.totals || {};
    const ti = d.timing || {};

    return `
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px">
        ${this._tile('Raised',   t.raised,   { icon:'fa-flag',           tone:'blue'   })}
        ${this._tile('Closed',   t.closed,   { icon:'fa-flag-checkered', tone:'green'  })}
        ${this._tile('Rejected', t.rejected, { icon:'fa-ban',            tone:'red'    })}
        ${this._tile('Expired',  t.expired,  { icon:'fa-hourglass-end',  tone:'orange' })}
        ${this._tile('Open',     t.open,     { icon:'fa-folder-open',    tone:'violet' })}
      </div>

      <h3 style="margin:0 0 10px;font-size:15px"><i class="fas fa-stopwatch" style="color:var(--accent);margin-right:6px"></i>Average Cycle Times</h3>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:22px">
        ${this._timingTile('Initiate → Approve', ti.avg_days_to_approve)}
        ${this._timingTile('Approve → Execute',  ti.avg_days_approve_to_exec)}
        ${this._timingTile('Execute → Close',    ti.avg_days_exec_to_close)}
        ${this._timingTile('Total Cycle',        ti.avg_days_total_cycle)}
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;margin-bottom:24px">
        ${this._mapTable('By Status',         'fa-tag',          d.by_status,         k => this._statusBadge(k))}
        ${this._mapTable('By Stage',          'fa-stream',       d.by_stage,          k => esc(this._stageLabel(k)))}
        ${this._mapTable('By Classification', 'fa-layer-group',  d.by_classification, k => this._classBadge(k))}
        ${this._mapTable('By Risk Level',     'fa-triangle-exclamation', d.by_risk_level, k => this._riskBadge(k))}
        ${this._mapTable('By Department',     'fa-sitemap',      d.by_department)}
        ${this._mapTable('By Field',          'fa-map-marker-alt', d.by_field)}
        ${this._mapTable('By Kind',           'fa-file-alt',     d.by_kind,           k => esc(this._kindLabel(k)))}
      </div>

      <h3 style="margin:16px 0 10px;font-size:15px"><i class="fas fa-user-edit" style="color:var(--accent);margin-right:6px"></i>By Originator</h3>
      <div class="table-wrap" style="margin-bottom:24px">
        <table>
          <thead><tr>
            <th>Name</th><th>Dept</th><th style="text-align:right">Raised</th><th style="text-align:right">Closed</th><th style="text-align:right">Rejected</th><th style="text-align:right">Expired</th><th style="text-align:right">In Progress</th>
          </tr></thead>
          <tbody>
            ${(d.by_originator || []).map(r => `
              <tr>
                <td style="font-weight:600">${esc(r.name || '—')}</td>
                <td><span class="badge" style="background:var(--light)">${esc(r.dept || '—')}</span></td>
                <td style="text-align:right;font-weight:600">${esc(r.raised)}</td>
                <td style="text-align:right;color:#16a34a;font-weight:600">${esc(r.closed)}</td>
                <td style="text-align:right;color:#dc2626;font-weight:600">${esc(r.rejected)}</td>
                <td style="text-align:right;color:#9a3412;font-weight:600">${esc(r.expired)}</td>
                <td style="text-align:right;color:#1e40af;font-weight:600">${esc(r.in_progress)}</td>
              </tr>`).join('') || `<tr><td colspan="7" class="text-muted text-center">No MOCs in range</td></tr>`}
          </tbody>
        </table>
      </div>

      <h3 style="margin:16px 0 10px;font-size:15px"><i class="fas fa-hourglass-half" style="color:var(--accent);margin-right:6px"></i>Pending Approval Workload <span class="text-muted text-sm" style="font-weight:400">(current snapshot)</span></h3>
      <div class="table-wrap" style="margin-bottom:24px">
        <table>
          <thead><tr>
            <th>Name</th><th>Dept</th><th style="text-align:right">Pending Total</th><th style="text-align:right">Classify</th><th style="text-align:right">Approve</th><th style="text-align:right">SME</th>
          </tr></thead>
          <tbody>
            ${(d.pending_by_assignee || []).map(r => `
              <tr>
                <td style="font-weight:600">${esc(r.name || '—')}</td>
                <td><span class="badge" style="background:var(--light)">${esc(r.dept || '—')}</span></td>
                <td style="text-align:right"><strong style="color:#92400e">${esc(r.pending_steps)}</strong></td>
                <td style="text-align:right">${esc(r.pending_classify)}</td>
                <td style="text-align:right">${esc(r.pending_approve)}</td>
                <td style="text-align:right">${esc(r.pending_sme)}</td>
              </tr>`).join('') || `<tr><td colspan="6" class="text-muted text-center">Nothing pending</td></tr>`}
          </tbody>
        </table>
      </div>

      <h3 style="margin:16px 0 10px;font-size:15px"><i class="fas fa-list" style="color:var(--accent);margin-right:6px"></i>MOCs in Period <span class="text-muted text-sm" style="font-weight:400">(${(d.list || []).length} record${(d.list || []).length === 1 ? '' : 's'})</span></h3>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>MOC #</th><th>Title</th><th>Dept / Field</th><th>Class</th><th>Stage</th><th>Status</th><th>Originator</th><th>Initiated</th><th>Closed</th>
          </tr></thead>
          <tbody>
            ${(d.list || []).map(m => `
              <tr onclick="App.gotoPage('mocs');setTimeout(()=>MOCPage.openDetail(${m.id}),200)" style="cursor:pointer">
                <td><span class="serial-badge">${esc(m.moc_number)}</span></td>
                <td style="font-weight:600">${esc(m.title)}</td>
                <td class="text-sm text-muted">${esc(m.department_code)} · ${esc(m.field_name || '—')}</td>
                <td>${this._classBadge(m.classification)}</td>
                <td class="text-sm">Stage ${esc(m.stage)}</td>
                <td>${this._statusBadge(m.status)}</td>
                <td class="text-sm">${esc(m.originator || '—')}</td>
                <td class="text-sm text-muted">${esc((m.initiated_at || '').slice(0, 10) || '—')}</td>
                <td class="text-sm text-muted">${esc((m.closed_at || '').slice(0, 10) || '—')}</td>
              </tr>`).join('') || `<tr><td colspan="9" class="text-muted text-center">No MOCs in range</td></tr>`}
          </tbody>
        </table>
      </div>`;
  },

  async exportPdf() {
    const { from, to } = this._range();
    const token = Api.getToken();
    try {
      const res = await fetch(`/api/mocs/audit/pdf?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`PDF export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `moc-audit-${from || 'all'}-to-${to || 'now'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message);
    }
  }
};
