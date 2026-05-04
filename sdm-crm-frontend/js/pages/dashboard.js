const DashboardPage = {
  _range: 'month',

  async render(container) {
    container.innerHTML = loaderHtml();
    try {
      const hasMoc = hasPermission('moc:view');
      const user = JSON.parse(localStorage.getItem('sdm_user') || '{}');
      const userName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'there';

      const [docsRes, clientsRes, projectsRes, mocKpi, mocsRes, myActionsRes] = await Promise.all([
        Api.get('/documents?limit=5').catch(()=>({documents:[],total:0})),
        Api.get('/clients').catch(()=>({clients:[]})),
        Api.get('/projects').catch(()=>({projects:[]})),
        hasMoc ? Api.get('/mocs/kpi').catch(()=>null) : Promise.resolve(null),
        hasMoc ? Api.get('/mocs').catch(()=>({mocs:[]})) : Promise.resolve({mocs:[]}),
        hasMoc ? Api.get('/mocs/my-actions').catch(()=>({actions:[]})) : Promise.resolve({actions:[]})
      ]);

      const docs     = docsRes.documents || [];
      const total    = docsRes.total || 0;
      const clients  = clientsRes.clients || [];
      const projects = projectsRes.projects || [];
      const allMocs  = mocsRes.mocs || [];
      const mocs     = allMocs.slice(0, 5);
      const actions  = myActionsRes.actions || [];

      const pending  = docs.filter(d => d.status === 'under_review').length;
      const issued   = docs.filter(d => d.status === 'issued').length;

      const k = mocKpi || {};
      const byStatus = k.by_status || {};
      const openMocs = (k.total||0) - (byStatus.closed||0) - (byStatus.cancelled||0) - (byStatus.expired||0);
      const majorHigh = (k.by_classification?.major||0) + (k.by_risk_level?.high||0);
      const tempRisk = (k.overdue_temp||0) + (k.expiring_within_30d||0);

      // Stage / classification / department breakdowns from full MOC list
      const byStage = { 1:0, 2:0, 3:0, 4:0 };
      const byClass = {};
      const byDept = {};
      allMocs.forEach(m => {
        if (m.stage && byStage[m.stage] !== undefined) byStage[m.stage]++;
        const c = m.classification || 'pending';
        byClass[c] = (byClass[c]||0) + 1;
        const d = m.department_code || 'Others';
        byDept[d] = (byDept[d]||0) + 1;
      });

      container.innerHTML = `
        <style>
          .dash-wrap { padding: 4px 2px; }
          .dash-head { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:22px; flex-wrap:wrap; gap:14px; }
          .dash-title { font-size: 26px; font-weight: 700; color: #0f172a; margin:0; }
          .dash-sub { color:#64748b; font-size:14px; margin-top:4px; }
          .dash-controls { display:flex; gap:10px; align-items:center; }
          .dash-select {
            padding:9px 14px; border-radius:10px; border:1px solid #e2e8f0;
            background:#fff; font-size:13px; color:#0f172a; font-weight:500;
            min-width:140px; cursor:pointer;
          }
          .dash-iconbtn {
            width:42px; height:42px; border-radius:10px; border:1px solid #e2e8f0;
            background:#fff; display:flex; align-items:center; justify-content:center;
            cursor:pointer; color:#475569;
          }
          .dash-iconbtn:hover { background:#f8fafc; }
          .kpi-grid {
            display:grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 14px;
            margin-bottom: 22px;
          }
          @media (max-width: 1400px) { .kpi-grid { grid-template-columns: repeat(4, 1fr); } }
          @media (max-width: 900px)  { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
          .kpi-card {
            background:#fff; border:1px solid #f1f5f9; border-radius:16px;
            padding:18px 16px; transition: transform .15s, box-shadow .15s;
          }
          .kpi-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(15,23,42,.06); }
          .kpi-icon {
            width:46px; height:46px; border-radius:12px;
            display:flex; align-items:center; justify-content:center;
            font-size:18px; margin-bottom:14px;
          }
          .kpi-value { font-size: 30px; font-weight: 700; color:#0f172a; line-height:1; margin-bottom:6px; }
          .kpi-label { font-size: 12px; color:#64748b; font-weight:500; margin-bottom:10px; }
          .kpi-trend { font-size: 11px; color:#64748b; display:flex; align-items:center; gap:4px; }
          .kpi-trend.up { color:#16a34a; }
          .kpi-trend.down { color:#dc2626; }
          .kpi-trend.flat { color:#94a3b8; }

          .row-2 {
            display:grid; grid-template-columns: 1fr 2fr; gap:16px; margin-bottom:22px;
          }
          @media (max-width: 1100px) { .row-2 { grid-template-columns: 1fr; } }
          .panel {
            background:#fff; border:1px solid #f1f5f9; border-radius:16px; padding:18px;
          }
          .panel-head {
            display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;
          }
          .panel-title { font-size:15px; font-weight:600; color:#0f172a; display:flex; align-items:center; gap:8px; }
          .btn-soft {
            padding:7px 14px; border-radius:8px; background:#fff; border:1px solid #e2e8f0;
            font-size:12px; font-weight:500; color:#475569; cursor:pointer;
          }
          .btn-soft:hover { background:#f8fafc; }

          .proj-item {
            padding:14px 0; border-bottom:1px solid #f1f5f9;
          }
          .proj-item:last-child { border-bottom: none; }
          .proj-row { display:flex; justify-content:space-between; align-items:center; }
          .proj-name { display:flex; align-items:center; gap:10px; min-width:0; }
          .proj-dot { width:8px; height:8px; border-radius:50%; background:#16a34a; flex-shrink:0; }
          .proj-name-text { font-weight:600; font-size:14px; color:#0f172a; }
          .proj-client { font-size:12px; color:#64748b; }
          .proj-pill {
            padding:3px 10px; border-radius:12px; font-size:11px; font-weight:600;
            background:#dcfce7; color:#166534;
          }
          .proj-stats { display:flex; gap:24px; margin-top:12px; padding-left:18px; }
          .proj-stat-num { font-size:20px; font-weight:700; color:#0f172a; }
          .proj-stat-label { font-size:11px; color:#64748b; }

          .moc-table { width:100%; border-collapse:collapse; }
          .moc-table th {
            text-align:left; padding:10px 12px; font-size:11px; color:#64748b;
            font-weight:600; text-transform:uppercase; letter-spacing:.05em;
            border-bottom:1px solid #f1f5f9; background:#fafbfc;
          }
          .moc-table td {
            padding:14px 12px; font-size:13px; color:#0f172a;
            border-bottom:1px solid #f8fafc;
          }
          .moc-table tr:last-child td { border-bottom:none; }
          .moc-table tr { cursor:pointer; }
          .moc-table tr:hover td { background:#fafbfc; }
          .moc-link { color:#6366f1; font-weight:600; }

          .pill {
            padding:4px 10px; border-radius:12px; font-size:11px; font-weight:600;
            display:inline-block;
          }
          .pill-major    { background:#fee2e2; color:#991b1b; }
          .pill-minor    { background:#dbeafe; color:#1e40af; }
          .pill-pending  { background:#fef3c7; color:#92400e; }
          .pill-field    { background:#e0e7ff; color:#3730a3; }
          .pill-revrequired { background:#fee2e2; color:#991b1b; }
          .pill-in-review   { background:#fef3c7; color:#92400e; }
          .pill-draft       { background:#e2e8f0; color:#475569; }
          .pill-approved    { background:#dcfce7; color:#166534; }
          .pill-closed      { background:#dbeafe; color:#1e40af; }
          .pill-rejected    { background:#fee2e2; color:#991b1b; }
          .pill-expired     { background:#ffedd5; color:#9a3412; }

          .insights-grid {
            display:grid; grid-template-columns: repeat(4, 1fr); gap:16px;
          }
          @media (max-width: 1100px) { .insights-grid { grid-template-columns: repeat(2, 1fr); } }
          @media (max-width: 600px) { .insights-grid { grid-template-columns: 1fr; } }
          .insight-card {
            background:#fff; border:1px solid #f1f5f9; border-radius:16px; padding:18px;
          }
          .insight-title { font-size:13px; font-weight:600; color:#0f172a; margin-bottom:14px; }
          .donut-row { display:flex; align-items:center; gap:14px; }
          .donut-svg { flex-shrink:0; }
          .donut-legend { flex:1; display:flex; flex-direction:column; gap:7px; min-width:0; font-size:12px; }
          .donut-leg-row { display:flex; align-items:center; gap:6px; }
          .donut-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
          .donut-leg-name { color:#475569; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
          .donut-leg-val { color:#0f172a; font-weight:600; font-size:11px; }
          .bar-row { display:flex; align-items:center; gap:10px; margin-bottom:10px; font-size:12px; }
          .bar-name { width:55px; color:#475569; flex-shrink:0; font-size:11px; }
          .bar-track { flex:1; height:8px; background:#f1f5f9; border-radius:4px; overflow:hidden; }
          .bar-fill { height:100%; background:#6366f1; border-radius:4px; }
          .bar-val { width:24px; text-align:right; color:#0f172a; font-weight:600; }
          .risk-tile { display:flex; align-items:center; gap:14px; }
          .risk-icon-wrap {
            width:54px; height:54px; border-radius:14px; background:#fee2e2;
            display:flex; align-items:center; justify-content:center; color:#dc2626; font-size:22px;
          }
          .risk-num { font-size:32px; font-weight:700; color:#0f172a; line-height:1; }
          .risk-label { font-size:12px; color:#64748b; margin-top:4px; }

          .actions-banner {
            background: linear-gradient(90deg,#fff7ed,#fff);
            border:1px solid #fed7aa; border-left:4px solid #f59e0b;
            border-radius:14px; padding:14px 18px; margin-bottom:22px;
          }
        </style>

        <div class="dash-wrap">
          <div class="dash-head">
            <div>
              <h1 class="dash-title">Dashboard</h1>
              <div class="dash-sub">Welcome back, ${esc(userName)}</div>
            </div>
            <div class="dash-controls">
              <select class="dash-select" onchange="DashboardPage._range=this.value;DashboardPage.render(document.getElementById('page-content'))">
                <option value="month" ${this._range==='month'?'selected':''}>This Month</option>
                <option value="week"  ${this._range==='week' ?'selected':''}>This Week</option>
                <option value="quarter" ${this._range==='quarter'?'selected':''}>This Quarter</option>
                <option value="year"  ${this._range==='year' ?'selected':''}>This Year</option>
                <option value="all"   ${this._range==='all'  ?'selected':''}>All Time</option>
              </select>
              <button class="dash-iconbtn" title="Filters"><i class="fas fa-filter"></i></button>
              <button class="dash-iconbtn" onclick="App.gotoPage('dashboard')" title="Refresh" style="width:auto;padding:0 14px;gap:6px;font-size:13px;font-weight:500">
                <i class="fas fa-sync-alt"></i> Refresh
              </button>
            </div>
          </div>

          <div class="kpi-grid">
            ${this._kpi('fa-file-alt', '#dbeafe', '#2563eb', total, 'Total Documents', this._trend(total))}
            ${this._kpi('fa-clock', '#ffedd5', '#ea580c', pending, 'Pending Approval', this._trend(pending, true))}
            ${this._kpi('fa-check-circle', '#dcfce7', '#16a34a', issued, 'Issued', this._trend(issued))}
            ${hasMoc ? `
              ${this._kpi('fa-exchange-alt', '#fef3c7', '#a16207', openMocs, 'Open MOCs', this._trend(openMocs))}
              ${this._kpi('fa-fire', '#fee2e2', '#dc2626', majorHigh, 'Major / High-Risk', this._trend(majorHigh, true))}
              ${this._kpi('fa-hourglass-half', '#fef3c7', '#92400e', tempRisk, 'Temp Expiry Risk', this._trend(tempRisk, true))}
            ` : ''}
            ${this._kpi('fa-building', '#ede9fe', '#7c3aed', clients.length, 'Clients', this._trend(clients.length))}
          </div>

          ${hasMoc && actions.length ? `
            <div class="actions-banner">
              <div class="panel-head" style="margin-bottom:8px">
                <div class="panel-title"><i class="fas fa-gavel" style="color:#f59e0b"></i> MOCs Awaiting Your Action (${actions.length})</div>
              </div>
              <table class="moc-table">
                <thead><tr><th>MOC #</th><th>Title</th><th>Step</th><th>Stage</th></tr></thead>
                <tbody>
                  ${actions.map(a => `
                    <tr onclick="App.gotoPage('mocs');setTimeout(()=>MOCPage.openDetail(${a.moc.id}),200)">
                      <td><span class="moc-link">${esc(a.moc.moc_number)}</span></td>
                      <td>${esc(a.moc.title)}</td>
                      <td>${esc(a.step_type)}</td>
                      <td>Stage ${esc(a.moc.stage)}</td>
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          <div class="row-2">
            <div class="panel">
              <div class="panel-head">
                <div class="panel-title"><i class="fas fa-folder-open" style="color:#f59e0b"></i> Active Projects</div>
                <button class="btn-soft" onclick="App.gotoPage('projects')">View All</button>
              </div>
              ${this._renderProjects(projects, allMocs)}
            </div>

            <div class="panel">
              <div class="panel-head">
                <div class="panel-title"><i class="fas fa-exchange-alt" style="color:#6366f1"></i> Recent MOCs</div>
                <button class="btn-soft" onclick="App.gotoPage('mocs')">View Register</button>
              </div>
              ${mocs.length ? `
                <table class="moc-table">
                  <thead>
                    <tr>
                      <th>MOC #</th><th>Title</th><th>Dept</th><th>Class</th><th>Stage</th><th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${mocs.map(m => `
                      <tr onclick="App.gotoPage('mocs');setTimeout(()=>MOCPage.openDetail(${m.id}),200)">
                        <td><span class="moc-link">${esc(m.moc_number)}</span></td>
                        <td>${esc(m.title)}</td>
                        <td style="color:#64748b">${esc(m.department_code)}/${esc(m.field_name||'')}</td>
                        <td>${this._classPill(m.classification)}</td>
                        <td>Stage ${esc(m.stage)}</td>
                        <td>${this._statusPill(m.status)}</td>
                      </tr>`).join('')}
                  </tbody>
                </table>
              ` : `<div style="padding:30px;text-align:center;color:#94a3b8;font-size:13px">No MOCs yet</div>`}
            </div>
          </div>

          <div class="panel" style="margin-top:0">
            <div class="panel-head">
              <div class="panel-title"><i class="fas fa-chart-pie" style="color:#6366f1"></i> Insights</div>
            </div>
            <div class="insights-grid">
              <div class="insight-card">
                <div class="insight-title">MOC by Stage</div>
                ${this._donutCard([
                  { label: 'Stage 1', value: byStage[1], color: '#6366f1' },
                  { label: 'Stage 2', value: byStage[2], color: '#f59e0b' },
                  { label: 'Stage 3', value: byStage[3], color: '#dc2626' },
                  { label: 'Stage 4', value: byStage[4], color: '#16a34a' },
                ])}
              </div>
              <div class="insight-card">
                <div class="insight-title">MOC by Classification</div>
                ${this._donutCard([
                  { label: 'Major',   value: byClass.major||0,   color: '#dc2626' },
                  { label: 'Pending', value: byClass.pending||0, color: '#f59e0b' },
                  { label: 'Minor',   value: byClass.minor||0,   color: '#fbbf24' },
                  { label: 'Field',   value: byClass.field_package||0, color: '#6366f1' },
                ])}
              </div>
              <div class="insight-card">
                <div class="insight-title">MOC by Department</div>
                ${this._barCard(byDept)}
              </div>
              <div class="insight-card">
                <div class="insight-title">Risk Overview</div>
                <div class="risk-tile">
                  <div class="risk-icon-wrap"><i class="fas fa-shield-alt"></i></div>
                  <div>
                    <div class="risk-num">${majorHigh}</div>
                    <div class="risk-label">High Risk MOCs</div>
                  </div>
                </div>
                <div class="kpi-trend ${majorHigh>0?'up':'flat'}" style="margin-top:14px">
                  ${majorHigh>0 ? '<i class="fas fa-arrow-up"></i> Track closely' : '<i class="fas fa-minus"></i> No change'}
                </div>
              </div>
            </div>
          </div>
        </div>`;
    } catch(err) {
      container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>${esc(err.message)}</p></div>`;
    }
  },

  _kpi(icon, bg, color, value, label, trendHtml) {
    return `
      <div class="kpi-card">
        <div class="kpi-icon" style="background:${bg};color:${color}"><i class="fas ${icon}"></i></div>
        <div class="kpi-value">${value}</div>
        <div class="kpi-label">${label}</div>
        ${trendHtml}
      </div>`;
  },

  _trend(value, inverse=false) {
    // Without historical data, render a soft placeholder. Inverse = higher is bad.
    if (!value || value === 0) return `<div class="kpi-trend flat"><i class="fas fa-minus"></i> No change</div>`;
    const cls = inverse ? 'down' : 'up';
    const ic  = inverse ? 'fa-arrow-down' : 'fa-arrow-up';
    return `<div class="kpi-trend ${cls}"><i class="fas ${ic}"></i> Active <span style="color:#94a3b8;margin-left:2px">vs last month</span></div>`;
  },

  _renderProjects(projects, allMocs) {
    const active = projects.filter(p => p.status === 'active');
    if (!active.length) {
      return `<div style="padding:30px;text-align:center;color:#94a3b8;font-size:13px">No active projects</div>`;
    }
    return active.slice(0, 4).map(p => {
      const projMocs = allMocs.filter(m => m.project_id === p.id);
      const high = projMocs.filter(m => m.classification === 'major' || m.risk_level === 'high').length;
      const pend = projMocs.filter(m => ['draft','in_review','revision_required'].includes(m.status)).length;
      return `
        <div class="proj-item">
          <div class="proj-row">
            <div class="proj-name">
              <div class="proj-dot"></div>
              <div>
                <div class="proj-name-text">${esc(p.name)}</div>
                <div class="proj-client">${esc(p.client?.company_name || '—')}</div>
              </div>
            </div>
            <span class="proj-pill">Active</span>
          </div>
          <div class="proj-stats">
            <div><div class="proj-stat-num">${projMocs.length}</div><div class="proj-stat-label">MOCs</div></div>
            <div><div class="proj-stat-num">${high}</div><div class="proj-stat-label">High Risk</div></div>
            <div><div class="proj-stat-num">${pend}</div><div class="proj-stat-label">Pending</div></div>
          </div>
        </div>`;
    }).join('');
  },

  _classPill(c) {
    const map = { major: 'pill-major', minor: 'pill-minor', pending: 'pill-pending', field_package: 'pill-field' };
    const lbl = { major: 'Major', minor: 'Minor', pending: 'Pending', field_package: 'Field' };
    const cls = map[c] || 'pill-pending';
    return `<span class="pill ${cls}">${lbl[c] || c || '—'}</span>`;
  },

  _statusPill(s) {
    const map = {
      draft: 'pill-draft', in_review: 'pill-in-review', revision_required: 'pill-revrequired',
      approved: 'pill-approved', closed: 'pill-closed', rejected: 'pill-rejected', expired: 'pill-expired'
    };
    const lbl = {
      draft: 'Draft', in_review: 'In Review', revision_required: 'Revision Required',
      approved: 'Approved', closed: 'Closed', rejected: 'Rejected', expired: 'Expired'
    };
    return `<span class="pill ${map[s]||'pill-draft'}">${lbl[s] || s || '—'}</span>`;
  },

  _donutCard(slices) {
    const total = slices.reduce((s, x) => s + (x.value||0), 0);
    if (!total) {
      return `<div style="padding:20px 0;text-align:center;color:#94a3b8;font-size:12px">No data</div>`;
    }
    const cx = 50, cy = 50, r = 35, C = 2 * Math.PI * r;
    let offset = 0;
    const segs = slices.map(s => {
      const v = s.value || 0;
      const len = (v / total) * C;
      const dash = `${len} ${C - len}`;
      const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.color}" stroke-width="14" stroke-dasharray="${dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})"/>`;
      offset += len;
      return seg;
    }).join('');
    const legend = slices.map(s => {
      const v = s.value || 0;
      const pct = total ? Math.round((v / total) * 100) : 0;
      return `
        <div class="donut-leg-row">
          <div class="donut-dot" style="background:${s.color}"></div>
          <div class="donut-leg-name">${s.label}</div>
          <div class="donut-leg-val">${v} (${pct}%)</div>
        </div>`;
    }).join('');
    return `
      <div class="donut-row">
        <svg class="donut-svg" width="100" height="100" viewBox="0 0 100 100">${segs}</svg>
        <div class="donut-legend">${legend}</div>
      </div>`;
  },

  _barCard(byDept) {
    const entries = Object.entries(byDept).sort((a,b) => b[1]-a[1]).slice(0, 5);
    if (!entries.length) {
      return `<div style="padding:20px 0;text-align:center;color:#94a3b8;font-size:12px">No data</div>`;
    }
    const max = Math.max(...entries.map(e => e[1]), 1);
    return entries.map(([dept, val]) => {
      const pct = (val / max) * 100;
      return `
        <div class="bar-row">
          <div class="bar-name">${esc(dept)}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
          <div class="bar-val">${val}</div>
        </div>`;
    }).join('');
  }
};
