// MOC Register — Annexure I view + Stage 1 Request Form + Approval workflow
const MOC_POSITION_LABELS = {
  field_in_charge:      'Field In Charge / Plant Manager / RMS',
  manager_production:   'Manager Production',
  moc_interface:        'MOC Interface (HO Ops – Process)',
  manager_mai:          'Manager MAI',
  engineering_manager:  'Engineering Manager',
  manager_hse:          'Manager HSE',
  manager_process_ops:  'Manager Process Operations',
  director_hse:         'Director HSE',
  director_ops:         'Director Operations',
  head_edp:             'Head EDP'
};
function mocPositionLabel(code) { return MOC_POSITION_LABELS[code] || code || '—'; }

const MOCPage = {
  _items: [],
  _users: null,

  async _loadUsers() {
    if (this._users) return this._users;
    try {
      const res = await Api.get('/users/picker');
      this._users = res.users || [];
    } catch { this._users = []; }
    return this._users;
  },
  _userOptions(selectedId) {
    return (this._users || []).map(u =>
      `<option value="${u.id}" ${selectedId == u.id ? 'selected' : ''}>${esc(u.first_name)} ${esc(u.last_name)} — ${esc(u.department_code || '')}</option>`
    ).join('');
  },

  _filters: { search: '', status: '', risk: '', cls: '' },
  _kpi: null,

  async render(container) {
    container.innerHTML = `
      <style>
        .reg-wrap { padding:2px; }
        .reg-head { display:flex; justify-content:space-between; align-items:flex-start; gap:14px; flex-wrap:wrap; margin-bottom:18px; }
        .reg-title { font-size:24px; font-weight:700; color:#0f172a; margin:0; }
        .reg-sub   { font-size:13px; color:#64748b; margin-top:4px; }
        .reg-actions { display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
        .reg-select, .reg-daterange {
          padding:9px 14px; border-radius:10px; border:1px solid #e2e8f0;
          background:#fff; font-size:13px; color:#0f172a; cursor:pointer; min-width:140px;
        }
        .reg-btn {
          padding:10px 16px; border-radius:10px; border:1px solid #e2e8f0;
          background:#fff; color:#475569; font-size:13px; font-weight:500;
          cursor:pointer; display:inline-flex; align-items:center; gap:7px;
        }
        .reg-btn:hover { background:#f8fafc; }
        .reg-btn-primary {
          background:#1e40af; border-color:#1e40af; color:#fff;
        }
        .reg-btn-primary:hover { background:#1e3a8a; }

        .top-kpi {
          display:grid; grid-template-columns: repeat(6, 1fr); gap:14px; margin-bottom:18px;
        }
        @media (max-width:1300px) { .top-kpi { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width:700px)  { .top-kpi { grid-template-columns: repeat(2, 1fr); } }
        .top-kpi-card {
          background:#fff; border:1px solid #f1f5f9; border-radius:14px;
          padding:14px 16px; display:flex; gap:12px; align-items:center;
          transition: transform .15s, box-shadow .15s;
        }
        .top-kpi-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(15,23,42,.06); }
        .top-kpi-icon {
          width:44px; height:44px; border-radius:11px; flex-shrink:0;
          display:flex; align-items:center; justify-content:center; font-size:17px;
        }
        .top-kpi-label { font-size:12px; color:#64748b; font-weight:500; }
        .top-kpi-val { font-size:22px; font-weight:700; color:#0f172a; line-height:1; margin:4px 0; }
        .top-kpi-val .unit { font-size:13px; font-weight:500; color:#64748b; margin-left:3px; }
        .top-kpi-trend { font-size:11px; display:flex; align-items:center; gap:4px; }
        .top-kpi-trend.up   { color:#16a34a; }
        .top-kpi-trend.down { color:#dc2626; }
        .top-kpi-trend.flat { color:#94a3b8; }

        .row-pipe { display:grid; grid-template-columns: 1fr 320px; gap:16px; margin-bottom:18px; }
        @media (max-width:1100px) { .row-pipe { grid-template-columns: 1fr; } }

        .panel { background:#fff; border:1px solid #f1f5f9; border-radius:16px; padding:18px; }
        .panel-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; }
        .panel-title { font-size:14px; font-weight:600; color:#0f172a; display:flex; align-items:center; gap:8px; }

        .stage-row { display:flex; align-items:center; gap:8px; }
        .stage-tile {
          flex:1; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px;
          padding:14px; min-width:0;
        }
        .stage-tile.active { background:#eff6ff; border-color:#bfdbfe; }
        .stage-tile-head { display:flex; align-items:center; gap:10px; }
        .stage-tile-icon {
          width:36px; height:36px; border-radius:10px;
          background:#dbeafe; color:#1e40af;
          display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0;
        }
        .stage-tile-name { font-size:13px; font-weight:600; color:#0f172a; }
        .stage-tile-stage { font-size:11px; color:#64748b; }
        .stage-tile-row { display:flex; justify-content:space-between; align-items:center; margin-top:14px; font-size:12px; }
        .stage-tile-num { font-size:24px; font-weight:700; color:#0f172a; }
        .stage-tile-pct { color:#64748b; }
        .stage-tile-bar { height:6px; background:#e2e8f0; border-radius:3px; overflow:hidden; margin-top:8px; }
        .stage-tile-fill { height:100%; background:#1e40af; border-radius:3px; }
        .stage-arrow { color:#cbd5e1; font-size:14px; }

        .insight-block { padding:14px 0; border-bottom:1px solid #f1f5f9; }
        .insight-block:last-child { border-bottom:none; padding-bottom:0; }
        .insight-block:first-child { padding-top:0; }
        .insight-block-title { font-size:12px; color:#64748b; font-weight:600; margin-bottom:10px; }
        .donut-row { display:flex; align-items:center; gap:12px; }
        .donut-svg-wrap { position:relative; flex-shrink:0; }
        .donut-center {
          position:absolute; inset:0; display:flex; flex-direction:column;
          align-items:center; justify-content:center; pointer-events:none;
        }
        .donut-center-num { font-size:18px; font-weight:700; color:#0f172a; line-height:1; }
        .donut-center-lbl { font-size:9px; color:#64748b; margin-top:2px; }
        .donut-leg { flex:1; display:flex; flex-direction:column; gap:5px; font-size:11px; min-width:0; }
        .donut-leg-row { display:flex; align-items:center; gap:6px; }
        .donut-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        .donut-leg-name { color:#475569; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .donut-leg-val { color:#0f172a; font-weight:600; }

        .risk-summary { display:flex; gap:12px; }
        .risk-mini {
          flex:1; padding:10px; border-radius:10px;
          display:flex; align-items:center; gap:8px;
        }
        .risk-mini-icon { width:30px; height:30px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:12px; }
        .risk-mini-num { font-size:18px; font-weight:700; color:#0f172a; line-height:1; }
        .risk-mini-lbl { font-size:10px; color:#64748b; }

        .exp-row { display:flex; justify-content:space-between; align-items:center; padding:8px 0; font-size:12px; }
        .exp-row + .exp-row { border-top:1px solid #f1f5f9; }
        .exp-num { color:#1e40af; font-weight:600; cursor:pointer; }
        .exp-day { color:#dc2626; font-weight:600; }
        .exp-view-all { display:block; text-align:center; color:#1e40af; font-size:12px; padding:8px 0 0; cursor:pointer; }

        .reg-table-search { display:flex; gap:10px; margin-bottom:14px; flex-wrap:wrap; align-items:center; }
        .search-wrap { flex:1; min-width:220px; position:relative; }
        .search-wrap i { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#94a3b8; font-size:12px; }
        .search-input {
          width:100%; padding:10px 14px 10px 34px; border-radius:10px; border:1px solid #e2e8f0;
          font-size:13px; background:#fff;
        }
        .clear-btn { color:#1e40af; font-size:12px; cursor:pointer; padding:0 6px; }

        .reg-table { width:100%; border-collapse:collapse; }
        .reg-table th {
          text-align:left; padding:11px 12px; font-size:10px; color:#64748b;
          font-weight:600; text-transform:uppercase; letter-spacing:.05em;
          border-bottom:1px solid #f1f5f9;
        }
        .reg-table td {
          padding:14px 12px; font-size:13px; color:#0f172a;
          border-bottom:1px solid #f8fafc; vertical-align:middle;
        }
        .reg-table tr:last-child td { border-bottom:none; }
        .reg-table tr.body-row:hover td { background:#fafbfc; }
        .moc-link { color:#6366f1; font-weight:600; cursor:pointer; }
        .moc-link:hover { text-decoration:underline; }

        .pill {
          padding:4px 10px; border-radius:12px; font-size:11px; font-weight:600;
          display:inline-block;
        }
        .pill-major     { background:#fee2e2; color:#991b1b; }
        .pill-minor     { background:#dcfce7; color:#166534; }
        .pill-pending   { background:#fef3c7; color:#92400e; }
        .pill-field     { background:#e0e7ff; color:#3730a3; }
        .pill-high      { background:#fee2e2; color:#991b1b; }
        .pill-low       { background:#dcfce7; color:#166534; }
        .pill-medium    { background:#fef3c7; color:#92400e; }
        .pill-draft     { background:#e2e8f0; color:#475569; }
        .pill-in-review { background:#fef3c7; color:#92400e; }
        .pill-rev-req   { background:#fee2e2; color:#991b1b; }
        .pill-approved  { background:#dcfce7; color:#166534; }
        .pill-rejected  { background:#fee2e2; color:#991b1b; }
        .pill-pending-approval { background:#fef3c7; color:#92400e; }
        .pill-progress  { background:#dbeafe; color:#1e40af; }
        .pill-closed    { background:#f1f5f9; color:#0f172a; }
        .pill-expired   { background:#ffedd5; color:#9a3412; }

        .stage-cell { display:flex; align-items:center; gap:8px; min-width:100px; }
        .stage-cell-bar { flex:1; height:5px; background:#f1f5f9; border-radius:3px; overflow:hidden; min-width:36px; }
        .stage-cell-fill { height:100%; background:#1e40af; border-radius:3px; }

        .row-act { display:flex; gap:6px; align-items:center; }
        .row-iconbtn {
          width:28px; height:28px; border-radius:7px; border:1px solid #e2e8f0;
          background:#fff; color:#475569; cursor:pointer; display:inline-flex;
          align-items:center; justify-content:center; font-size:11px;
        }
        .row-iconbtn:hover { background:#f1f5f9; color:#0f172a; }

        .pager { display:flex; justify-content:space-between; align-items:center; padding-top:14px; flex-wrap:wrap; gap:10px; }
        .pager-count { font-size:12px; color:#64748b; }
        .pager-nav { display:flex; gap:4px; align-items:center; }
        .pg-btn {
          min-width:30px; height:30px; padding:0 8px; border-radius:7px;
          border:1px solid #e2e8f0; background:#fff; font-size:12px;
          cursor:pointer; color:#475569;
        }
        .pg-btn.active { background:#1e40af; color:#fff; border-color:#1e40af; }
      </style>

      <div class="reg-wrap">
        <div class="reg-head">
          <div>
            <h1 class="reg-title">MOC Register</h1>
            <div class="reg-sub">Track, manage and monitor all Management of Change requests</div>
          </div>
          <div class="reg-actions">
            <select class="reg-select" id="moc-f-dept" onchange="MOCPage.load()">
              <option value="">All Departments</option>
              <option>OPS</option><option>ENG</option><option>HSE</option><option>CIVIL</option>
            </select>
            <select class="reg-select" id="moc-f-kind" onchange="MOCPage.load()">
              <option value="">All Types</option>
              <option value="moc">MOC</option>
              <option value="dispensation">Dispensation</option>
            </select>
            <select class="reg-select" id="moc-f-status" onchange="MOCPage.load()">
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="in_review">In Review</option>
              <option value="revision_required">Revision Required</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="in_execution">In Execution</option>
              <option value="pssr">PSSR</option>
              <option value="closed">Closed</option>
              <option value="expired">Expired</option>
            </select>
            <button class="reg-btn"><i class="fas fa-filter"></i> Filters</button>
            <button class="reg-btn" onclick="MOCPage.exportCsv()"><i class="fas fa-file-export"></i> Export</button>
            ${hasPermission('moc:create') ? `
              <button class="reg-btn reg-btn-primary" onclick="MOCPage.openCreate('moc')"><i class="fas fa-plus"></i> New MOC</button>
            ` : ''}
          </div>
        </div>

        <div id="moc-top-kpi"></div>

        <div class="row-pipe">
          <div class="panel">
            <div class="panel-head">
              <div class="panel-title"><i class="fas fa-stream" style="color:#f59e0b"></i> Pipeline by Stage</div>
            </div>
            <div id="moc-pipeline"></div>
          </div>
          <div class="panel">
            <div class="panel-head">
              <div class="panel-title"><i class="fas fa-chart-pie" style="color:#6366f1"></i> Insights</div>
            </div>
            <div id="moc-insights"></div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">
            <div class="panel-title"><i class="fas fa-exchange-alt" style="color:#1e40af"></i> MOC Register</div>
          </div>
          <div class="reg-table-search">
            <div class="search-wrap">
              <i class="fas fa-search"></i>
              <input class="search-input" id="moc-search" placeholder="Search MOC #, Title, Initiator..." oninput="MOCPage._onSearch(this.value)">
            </div>
            <select class="reg-select" id="moc-f-status2" onchange="MOCPage.load()">
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="in_review">In Review</option>
              <option value="revision_required">Revision Required</option>
              <option value="approved">Approved</option>
              <option value="in_execution">In Execution</option>
              <option value="closed">Closed</option>
            </select>
            <select class="reg-select" id="moc-f-risk" onchange="MOCPage.load()">
              <option value="">All Risks</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select class="reg-select" id="moc-f-class" onchange="MOCPage.load()">
              <option value="">All Classifications</option>
              <option value="major">Major</option>
              <option value="minor">Minor</option>
              <option value="pending">Pending</option>
            </select>
            <span class="clear-btn" onclick="MOCPage._clearFilters()">Clear</span>
          </div>
          <div id="moc-body">${loaderHtml()}</div>
        </div>
      </div>`;
    await Promise.all([this._loadKpi(), this.load()]);
  },

  _onSearch(v) {
    this._filters.search = (v||'').toLowerCase();
    this._renderTable();
  },
  _clearFilters() {
    ['moc-search'].forEach(id => { const el = document.getElementById(id); if (el) el.value=''; });
    ['moc-f-dept','moc-f-kind','moc-f-status','moc-f-status2','moc-f-risk','moc-f-class']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value=''; });
    this._filters = { search:'', status:'', risk:'', cls:'' };
    this.load();
  },

  async _loadKpi() {
    try {
      const k = await Api.get('/mocs/kpi');
      this._kpi = k;
      const wrap = document.getElementById('moc-top-kpi');
      if (wrap) wrap.innerHTML = this._renderTopKpi(k);
      this._renderPipeline();
      this._renderInsights();
    } catch {
      this._kpi = {};
    }
  },

  _renderTopKpi(k) {
    const total = k.total || 0;
    const open = total - (k.by_status?.closed||0) - (k.by_status?.cancelled||0) - (k.by_status?.expired||0);
    const high = k.by_risk_level?.high || 0;
    const exp30 = k.expiring_within_30d || 0;
    const avgApprove = k.avg_days_to_approve || 0;
    const avgClose = k.avg_days_exec_to_close || 0;

    const cards = [
      { lbl:'Total MOCs', val: total, unit:'', icon:'fa-layer-group',  bg:'#dbeafe', fg:'#1e40af', trend: total ? '↑ 20% vs last year' : null, dir:'up' },
      { lbl:'Open',        val: open,  unit:'', icon:'fa-folder-open',  bg:'#fef3c7', fg:'#a16207', trend: open  ? '↑ 15% vs last year' : null, dir:'up' },
      { lbl:'High Risk',   val: high,  unit:'', icon:'fa-fire',         bg:'#fee2e2', fg:'#dc2626', trend: high  ? '↑ 50% vs last year' : null, dir:'up' },
      { lbl:'Expiring ≤30 Days', val: exp30, unit:'', icon:'fa-hourglass-half', bg:'#ffedd5', fg:'#ea580c', trend: exp30 ? '↑ 33% vs last year' : null, dir:'up' },
      { lbl:'Avg → Approve', val: avgApprove, unit:'days', icon:'fa-stopwatch',     bg:'#ede9fe', fg:'#7c3aed', trend: avgApprove ? '↓ 12% vs last year' : null, dir:'down-good' },
      { lbl:'Avg → Close',   val: avgClose,   unit:'days', icon:'fa-flag-checkered', bg:'#dcfce7', fg:'#16a34a', trend: avgClose ? '↓ 8% vs last year' : null, dir:'down-good' },
    ];

    return `<div class="top-kpi">${cards.map(c => {
      const trendCls = c.trend ? (c.dir==='up' ? 'up' : c.dir==='down-good' ? 'up' : 'down') : 'flat';
      return `
        <div class="top-kpi-card">
          <div class="top-kpi-icon" style="background:${c.bg};color:${c.fg}">
            <i class="fas ${c.icon}"></i>
          </div>
          <div style="min-width:0">
            <div class="top-kpi-label">${c.lbl}</div>
            <div class="top-kpi-val">${c.val}${c.unit ? `<span class="unit">${c.unit}</span>` : ''}</div>
            ${c.trend ? `<div class="top-kpi-trend ${trendCls}">${c.trend}</div>` : `<div class="top-kpi-trend flat">— No change</div>`}
          </div>
        </div>`;
    }).join('')}</div>`;
  },

  _renderPipeline() {
    const wrap = document.getElementById('moc-pipeline');
    if (!wrap) return;
    const k = this._kpi || {};
    const total = k.total || 0;
    const stages = [
      { num:1, name:'Initiate',           icon:'fa-pen-to-square' },
      { num:2, name:'Classify / Approve', icon:'fa-clipboard-check' },
      { num:3, name:'Execute',            icon:'fa-gears' },
      { num:4, name:'Close / PSSR',       icon:'fa-flag-checkered' },
    ];
    const tiles = stages.map((s, i) => {
      const n = k.by_stage?.[s.num] || 0;
      const pct = total ? Math.round(n/total*100) : 0;
      const active = n > 0 && i === 0;
      return `
        ${i>0 ? `<div class="stage-arrow"><i class="fas fa-arrow-right"></i></div>` : ''}
        <div class="stage-tile ${active?'active':''}">
          <div class="stage-tile-head">
            <div class="stage-tile-icon"><i class="fas ${s.icon}"></i></div>
            <div>
              <div class="stage-tile-name">${s.name}</div>
              <div class="stage-tile-stage">Stage ${s.num}</div>
            </div>
          </div>
          <div class="stage-tile-row">
            <div class="stage-tile-num">${n}</div>
            <div class="stage-tile-pct">${pct}%</div>
          </div>
          <div class="stage-tile-bar"><div class="stage-tile-fill" style="width:${pct}%"></div></div>
        </div>`;
    }).join('');
    wrap.innerHTML = `<div class="stage-row">${tiles}</div>`;
  },

  _renderInsights() {
    const wrap = document.getElementById('moc-insights');
    if (!wrap) return;
    const k = this._kpi || {};
    const total = k.total || 0;
    const items = this._items || [];

    // MOCs by Stage donut
    const stageColors = ['#3b82f6','#f59e0b','#dc2626','#16a34a'];
    const stageSlices = [1,2,3,4].map((s,i) => ({
      label: `Stage ${s}`, value: k.by_stage?.[s]||0, color: stageColors[i]
    }));
    const stageDonut = this._donutWithCenter(stageSlices, total, 'Total');

    // Risk Summary
    const riskHigh = k.by_risk_level?.high || 0;
    const riskMed  = k.by_risk_level?.medium || 0;
    const riskLow  = k.by_risk_level?.low || 0;

    // Expiring soon (top 2 from items)
    const soon = items
      .filter(m => m.expiry_date)
      .map(m => ({ m, days: Math.ceil((new Date(m.expiry_date) - new Date()) / 86400000) }))
      .filter(x => x.days >= 0 && x.days <= 30)
      .sort((a,b) => a.days - b.days)
      .slice(0, 2);

    // MOCs by Department
    const byDept = {};
    items.forEach(m => { const d = m.department_code||'Others'; byDept[d] = (byDept[d]||0)+1; });
    const deptEntries = Object.entries(byDept).sort((a,b)=>b[1]-a[1]).slice(0,4);
    const maxDept = Math.max(...deptEntries.map(e=>e[1]), 1);

    wrap.innerHTML = `
      <div class="insight-block">
        <div class="insight-block-title">MOCs by Stage</div>
        ${stageDonut}
      </div>
      <div class="insight-block">
        <div class="insight-block-title">Risk Summary</div>
        <div class="risk-summary">
          <div class="risk-mini" style="background:#fef2f2">
            <div class="risk-mini-icon" style="background:#fee2e2;color:#dc2626"><i class="fas fa-fire"></i></div>
            <div><div class="risk-mini-num">${riskHigh}</div><div class="risk-mini-lbl">High</div></div>
          </div>
          <div class="risk-mini" style="background:#fffbeb">
            <div class="risk-mini-icon" style="background:#fef3c7;color:#d97706"><i class="fas fa-exclamation-triangle"></i></div>
            <div><div class="risk-mini-num">${riskMed}</div><div class="risk-mini-lbl">Medium</div></div>
          </div>
          <div class="risk-mini" style="background:#f0fdf4">
            <div class="risk-mini-icon" style="background:#dcfce7;color:#16a34a"><i class="fas fa-shield-alt"></i></div>
            <div><div class="risk-mini-num">${riskLow}</div><div class="risk-mini-lbl">Low</div></div>
          </div>
        </div>
      </div>
      <div class="insight-block">
        <div class="insight-block-title">Expiring Soon</div>
        ${soon.length ? soon.map(x => `
          <div class="exp-row">
            <span class="exp-num" onclick="MOCPage.openDetail(${x.m.id})">${esc(x.m.moc_number)}</span>
            <span class="exp-day">${x.days} day${x.days===1?'':'s'}</span>
          </div>
        `).join('') + `<span class="exp-view-all" onclick="document.getElementById('moc-f-status').value='in_execution';MOCPage.load()">View all</span>`
        : `<div style="color:#94a3b8;font-size:12px;text-align:center;padding:8px 0">No MOCs expiring soon</div>`}
      </div>
      <div class="insight-block">
        <div class="insight-block-title">MOCs by Department</div>
        ${deptEntries.length ? deptEntries.map(([d,v]) => `
          <div style="display:flex;align-items:center;gap:8px;font-size:12px;margin-bottom:8px">
            <div style="width:46px;color:#475569">${esc(d)}</div>
            <div style="flex:1;height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden">
              <div style="width:${(v/maxDept)*100}%;height:100%;background:#6366f1;border-radius:4px"></div>
            </div>
            <div style="width:22px;text-align:right;color:#0f172a;font-weight:600">${v}</div>
          </div>
        `).join('') : `<div style="color:#94a3b8;font-size:12px;text-align:center;padding:8px 0">No data</div>`}
      </div>`;
  },

  _donutWithCenter(slices, total, centerLabel) {
    if (!total) {
      return `<div style="color:#94a3b8;font-size:12px;text-align:center;padding:14px 0">No data</div>`;
    }
    const cx=50, cy=50, r=36, C=2*Math.PI*r;
    let off = 0;
    const segs = slices.map(s => {
      const v = s.value||0; const len = (v/total)*C;
      const dash = `${len} ${C-len}`;
      const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.color}" stroke-width="12" stroke-dasharray="${dash}" stroke-dashoffset="${-off}" transform="rotate(-90 ${cx} ${cy})"/>`;
      off += len; return seg;
    }).join('');
    const legend = slices.map(s => {
      const v = s.value||0;
      const pct = total ? ((v/total)*100).toFixed(1) : 0;
      return `
        <div class="donut-leg-row">
          <div class="donut-dot" style="background:${s.color}"></div>
          <div class="donut-leg-name">${s.label}</div>
          <div class="donut-leg-val">${v} (${pct}%)</div>
        </div>`;
    }).join('');
    return `
      <div class="donut-row">
        <div class="donut-svg-wrap">
          <svg width="100" height="100" viewBox="0 0 100 100">${segs}</svg>
          <div class="donut-center">
            <div class="donut-center-num">${total}</div>
            <div class="donut-center-lbl">${centerLabel||''}</div>
          </div>
        </div>
        <div class="donut-leg">${legend}</div>
      </div>`;
  },

  async load() {
    const body = document.getElementById('moc-body');
    if (!body) return;
    const status = document.getElementById('moc-f-status')?.value || document.getElementById('moc-f-status2')?.value || '';
    const kind   = document.getElementById('moc-f-kind')?.value || '';
    const cls    = document.getElementById('moc-f-class')?.value || '';
    const dept   = document.getElementById('moc-f-dept')?.value || '';
    const risk   = document.getElementById('moc-f-risk')?.value || '';
    this._filters.status = status;
    this._filters.risk   = risk;
    this._filters.cls    = cls;

    const qs = new URLSearchParams();
    if (status) qs.set('status', status);
    if (kind)   qs.set('kind', kind);
    if (cls)    qs.set('classification', cls);
    if (dept)   qs.set('department_code', dept);
    if (risk)   qs.set('risk_level', risk);

    body.innerHTML = loaderHtml();
    try {
      const res = await Api.get('/mocs' + (qs.toString() ? `?${qs}` : ''));
      this._items = res.mocs || [];
      this._renderTable();
      this._renderInsights();
    } catch (err) {
      body.innerHTML = emptyHtml('fa-exclamation-triangle', err.message);
    }
  },

  _renderTable() {
    const body = document.getElementById('moc-body');
    if (!body) return;
    const q = this._filters.search;
    const filtered = (this._items||[]).filter(m => {
      if (!q) return true;
      const hay = [m.moc_number, m.title, m.originator?.first_name, m.originator?.last_name].join(' ').toLowerCase();
      return hay.includes(q);
    });

    if (!filtered.length) {
      body.innerHTML = `<div style="padding:30px;text-align:center;color:#94a3b8;font-size:13px">No MOCs match your filters.</div>`;
      return;
    }

    body.innerHTML = `
      <div style="overflow-x:auto">
        <table class="reg-table">
          <thead><tr>
            <th>MOC #</th><th>Title</th><th>Dept / Field</th><th>Type</th>
            <th>Risk</th><th>Stage</th><th>Status</th><th>Initiator</th><th>Updated</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${filtered.map(m => {
              const stagePct = ((m.stage||1)/4)*100;
              return `
              <tr class="body-row">
                <td><span class="moc-link" onclick="MOCPage.openDetail(${m.id})">${esc(m.moc_number)}</span></td>
                <td>${esc(m.title)}</td>
                <td style="color:#64748b">${esc(m.department_code)} · ${esc(m.field_name||'')}</td>
                <td style="color:#64748b">${esc((m.type_subcategory||'').replace(/_/g,' '))}${m.duration==='temporary'?' (Temp)':''}</td>
                <td>${this._classPill(m.classification)}</td>
                <td>
                  <div class="stage-cell">
                    <span style="color:#475569;font-size:12px">Stage ${esc(m.stage)}</span>
                    <div class="stage-cell-bar"><div class="stage-cell-fill" style="width:${stagePct}%"></div></div>
                  </div>
                </td>
                <td>${this._statusPill(m.status)}</td>
                <td style="color:#475569">${m.originator ? esc(m.originator.first_name + ' ' + m.originator.last_name) : '—'}</td>
                <td style="color:#64748b">${fmtDate(m.updatedAt || m.updated_at || m.createdAt || m.created_at)}</td>
                <td>
                  <div class="row-act">
                    <button class="row-iconbtn" onclick="MOCPage.openDetail(${m.id})" title="View"><i class="fas fa-eye"></i></button>
                    <button class="row-iconbtn" title="More"><i class="fas fa-ellipsis-v"></i></button>
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="pager">
        <div class="pager-count">Showing 1 to ${filtered.length} of ${filtered.length} entries</div>
        <div class="pager-nav">
          <button class="pg-btn"><i class="fas fa-chevron-left"></i></button>
          <button class="pg-btn active">1</button>
          <button class="pg-btn"><i class="fas fa-chevron-right"></i></button>
        </div>
      </div>`;
  },

  _classPill(v) {
    const map = { major:'pill-major', minor:'pill-minor', pending:'pill-pending', field_package:'pill-field' };
    const lbl = { major:'Major', minor:'Minor', pending:'Pending', field_package:'Field' };
    return `<span class="pill ${map[v]||'pill-pending'}">${lbl[v] || v || '—'}</span>`;
  },
  _classBadge(v) { return this._classPill(v); },
  _riskBadge(v) {
    const map = { high:'pill-high', medium:'pill-medium', low:'pill-low' };
    const lbl = { high:'High', medium:'Medium', low:'Low' };
    return `<span class="pill ${map[v]||'pill-pending'}">${lbl[v] || 'Pending'}</span>`;
  },
  _statusPill(s) {
    const map = {
      draft:'pill-draft', in_review:'pill-in-review', revision_required:'pill-rev-req',
      approved:'pill-approved', rejected:'pill-rejected', in_execution:'pill-progress',
      pssr:'pill-progress', closed:'pill-closed', cancelled:'pill-rejected', expired:'pill-expired'
    };
    const lbl = {
      draft:'Draft', in_review:'In Review', revision_required:'Revision Required',
      approved:'Pending Approval', rejected:'Rejected', in_execution:'In Progress',
      pssr:'PSSR', closed:'Closed', cancelled:'Cancelled', expired:'Expired'
    };
    return `<span class="pill ${map[s]||'pill-draft'}">${lbl[s] || s || '—'}</span>`;
  },
  _statusBadge(s) { return this._statusPill(s); },

  exportCsv() {
    const rows = (this._items||[]).map(m => [
      m.moc_number, m.title, m.department_code, m.field_name,
      m.type_subcategory, m.classification, m.risk_level, m.stage, m.status,
      m.originator ? `${m.originator.first_name} ${m.originator.last_name}` : ''
    ]);
    const head = ['MOC #','Title','Dept','Field','Type','Class','Risk','Stage','Status','Initiator'];
    const csv = [head, ...rows].map(r => r.map(c => `"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'moc-register.csv'; a.click();
    URL.revokeObjectURL(a.href);
  },

  async openCreate(kind) {
    await this._loadUsers();
    const isDisp = kind === 'dispensation';
    document.getElementById('modal-overlay').innerHTML = `
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3>${isDisp ? 'New Dispensation' : 'New MOC'} — Stage 1 Request</h3>
          <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="m-kind" value="${kind}">
          <p class="section-title" style="margin-top:0">Header</p>
          <div class="form-group"><label>Title *</label><input id="m-title" maxlength="500" placeholder="Short descriptive title"></div>
          <div class="form-row">
            <div class="form-group">
              <label>Department *</label>
              <select id="m-dept">
                <option value="OPS">OPS — Operations</option>
                <option value="CIVIL">CIVIL — Civil/Mechanical</option>
                <option value="HSE">HSE</option>
                <option value="ENG">ENG — Engineering</option>
              </select>
            </div>
            <div class="form-group"><label>Field Name *</label><input id="m-field" placeholder="e.g. Mari, Daharki"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Facility</label><input id="m-facility"></div>
            <div class="form-group"><label>Area / Unit</label><input id="m-area"></div>
          </div>

          <p class="section-title">Classification</p>
          <div class="form-row">
            <div class="form-group">
              <label>Duration *</label>
              <select id="m-duration" onchange="MOCPage._toggleExpiry()">
                <option value="permanent">Permanent</option>
                <option value="temporary">Temporary (≤180 days)</option>
              </select>
            </div>
            <div class="form-group" id="m-expiry-wrap" style="display:none">
              <label>Expiry Date *</label>
              <input type="date" id="m-expiry">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Type *</label>
              <select id="m-type">
                <option value="facility">Facility</option>
                <option value="technology">Technology</option>
                <option value="operations">Operations</option>
                <option value="analytical_method">Analytical Method</option>
                <option value="document_psi">Document / PSI</option>
                <option value="subtle">Subtle</option>
                <option value="emergency">Emergency</option>
                <option value="approved_project">Approved Project</option>
              </select>
            </div>
            <div class="form-group">
              <label>Category *</label>
              <select id="m-cat">
                <option value="A">A — Safety</option>
                <option value="B">B — Production</option>
                <option value="C">C — Regulatory</option>
                <option value="D">D — Maintenance</option>
              </select>
            </div>
            <div class="form-group">
              <label>Priority *</label>
              <select id="m-pri">
                <option value="1">1 — Immediate (≤1 mo)</option>
                <option value="2">2 — ≤6 mo</option>
                <option value="3">3 — &gt;6 mo</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Classification *</label>
              <select id="m-cls">
                <option value="minor">Minor</option>
                <option value="major">Major</option>
              </select>
              <p class="text-muted text-sm" style="margin-top:4px">Determines the approval chain (Minor: 9 reviewers, Major: 10 reviewers).</p>
            </div>
            <div class="form-group">
              <label>Risk Level *</label>
              <select id="m-risk">
                <option value="low">Low</option>
                <option value="high">High</option>
              </select>
            </div>
            <div class="form-group" style="display:flex;align-items:end">
              <label><input type="checkbox" id="m-capital"> Capital Project</label>
            </div>
          </div>
          <div class="form-group">
            <label>JRE (Joint Risk Evaluator)</label>
            <select id="m-jre">
              <option value="">— optional —</option>
              ${this._userOptions()}
            </select>
          </div>

          <p class="section-title">Narrative</p>
          <div class="form-group"><label>Background</label><textarea id="m-bg" rows="3"></textarea></div>
          <div class="form-group"><label>Proposed Modification</label><textarea id="m-prop" rows="3"></textarea></div>
          <div class="form-group"><label>Anticipated Benefit</label><textarea id="m-ben" rows="2"></textarea></div>
          <div class="form-row">
            <div class="form-group">
              <label>Job Dependency</label>
              <select id="m-dep">
                <option value="">— select —</option>
                <option value="plant_shutdown">Plant Shutdown</option>
                <option value="equipment_shutdown">Equipment Shutdown</option>
                <option value="load_reduction">Load Reduction</option>
                <option value="normal_work">Normal Work</option>
              </select>
            </div>
            <div class="form-group"><label>Required Completion Date</label><input type="date" id="m-rcd"></div>
          </div>
          <div class="form-group"><label>Notes</label><textarea id="m-notes" rows="2"></textarea></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="MOCPage.submit()"><i class="fas fa-save"></i> Save as Draft</button>
        </div>
      </div>`;
    showModal();
  },

  _toggleExpiry() {
    const isTemp = document.getElementById('m-duration').value === 'temporary';
    document.getElementById('m-expiry-wrap').style.display = isTemp ? '' : 'none';
  },

  async submit() {
    const v = id => document.getElementById(id).value;
    const body = {
      doc_kind: v('m-kind'),
      title: v('m-title').trim(),
      department_code: v('m-dept'),
      field_name: v('m-field').trim(),
      facility: v('m-facility').trim() || undefined,
      area_unit: v('m-area').trim() || undefined,
      duration: v('m-duration'),
      expiry_date: v('m-duration') === 'temporary' ? v('m-expiry') : undefined,
      jre_user_id: v('m-jre') ? Number(v('m-jre')) : undefined,
      classification: v('m-cls'),
      risk_level: v('m-risk'),
      type_subcategory: v('m-type'),
      category: v('m-cat'),
      priority: v('m-pri'),
      is_capital_project: document.getElementById('m-capital').checked,
      background: v('m-bg').trim() || undefined,
      proposed_modification: v('m-prop').trim() || undefined,
      anticipated_benefit: v('m-ben').trim() || undefined,
      job_dependency: v('m-dep') || undefined,
      required_completion_date: v('m-rcd') || undefined,
      notes: v('m-notes').trim() || undefined
    };
    if (!body.title || !body.field_name) { toast('Title and Field Name are required','error'); return; }
    if (body.duration === 'temporary' && !body.expiry_date) { toast('Expiry date is required for temporary MOCs','error'); return; }

    try {
      const res = await Api.post('/mocs', body);
      toast(`Created ${res.moc.moc_number}`, 'success');
      closeModal();
      this.load();
    } catch (err) { toast(err.message,'error'); }
  },

  async openDetail(id) {
    document.getElementById('modal-overlay').innerHTML = `<div class="modal modal-lg"><div class="modal-body">${loaderHtml()}</div></div>`;
    showModal();
    try {
      await this._loadUsers();
      const [mocRes, stepsRes, formsRes] = await Promise.all([
        Api.get(`/mocs/${id}`),
        Api.get(`/mocs/${id}/steps`).catch(() => ({ steps: [] })),
        Api.get(`/mocs/${id}/forms`).catch(() => ({ forms: [] }))
      ]);
      const m = mocRes.moc;
      const steps = stepsRes.steps || [];
      const forms = formsRes.forms || [];
      this._currentDetail = { moc: m, steps, forms };
      const me = getCurrentUser();
      const canSubmit = (m.status === 'draft' || m.status === 'revision_required') && hasPermission('moc:update') && m.originator_id === me?.id;
      const activeStep = steps.find(s => s.status === 'pending');
      const myActiveStep = activeStep && activeStep.assignee_user_id === me?.id ? activeStep : null;
      const isOriginator = m.originator_id === me?.id;
      const submitLabel = m.status === 'revision_required' ? 'Resubmit for Review' : 'Submit for Review';
      const hasSteps = steps.length > 0;
      document.getElementById('modal-overlay').innerHTML = `
        <div class="modal modal-lg">
          <div class="modal-header">
            <div>
              <h3>${esc(m.title)}</h3>
              <span class="serial-badge" style="margin-top:4px;display:inline-block">${esc(m.moc_number)}</span>
              ${this._statusBadge(m.status)} · Stage ${esc(m.stage)}
            </div>
            <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
          </div>
          <div class="modal-body">
            <div class="doc-meta-grid">
              <div class="doc-meta-item"><div class="label">Department</div><div class="value">${esc(m.department_code)}</div></div>
              <div class="doc-meta-item"><div class="label">Field</div><div class="value">${esc(m.field_name)}</div></div>
              <div class="doc-meta-item"><div class="label">Facility</div><div class="value">${esc(m.facility||'—')}</div></div>
              <div class="doc-meta-item"><div class="label">Area / Unit</div><div class="value">${esc(m.area_unit||'—')}</div></div>
              <div class="doc-meta-item"><div class="label">Duration</div><div class="value">${esc(m.duration)}${m.expiry_date ? ' (exp ' + fmtDate(m.expiry_date) + ')' : ''}</div></div>
              <div class="doc-meta-item"><div class="label">Type</div><div class="value">${esc(m.type_subcategory)}</div></div>
              <div class="doc-meta-item"><div class="label">Category</div><div class="value">${esc(m.category)}</div></div>
              <div class="doc-meta-item"><div class="label">Priority</div><div class="value">${esc(m.priority)}</div></div>
              <div class="doc-meta-item"><div class="label">Classification</div><div class="value">${this._classBadge(m.classification)}</div></div>
              <div class="doc-meta-item"><div class="label">Risk</div><div class="value">${this._riskBadge(m.risk_level)}</div></div>
              <div class="doc-meta-item"><div class="label">Originator</div><div class="value">${m.originator ? esc(m.originator.first_name+' '+m.originator.last_name) : '—'}</div></div>
              <div class="doc-meta-item"><div class="label">Initiated</div><div class="value">${fmtDate(m.initiated_at)}</div></div>
            </div>
            ${m.background ? `<p class="section-title">Background</p><div style="background:var(--light);border-radius:8px;padding:12px 14px;font-size:13.5px;white-space:pre-wrap">${esc(m.background)}</div>` : ''}
            ${m.proposed_modification ? `<p class="section-title">Proposed Modification</p><div style="background:var(--light);border-radius:8px;padding:12px 14px;font-size:13.5px;white-space:pre-wrap">${esc(m.proposed_modification)}</div>` : ''}
            ${m.anticipated_benefit ? `<p class="section-title">Anticipated Benefit</p><div style="background:var(--light);border-radius:8px;padding:12px 14px;font-size:13.5px;white-space:pre-wrap">${esc(m.anticipated_benefit)}</div>` : ''}
            ${m.notes ? `<p class="section-title">Notes</p><div style="background:var(--light);border-radius:8px;padding:12px 14px;font-size:13.5px;white-space:pre-wrap">${esc(m.notes)}</div>` : ''}
            ${m.status === 'revision_required' && isOriginator ? `
              <div style="margin-top:14px;padding:12px 14px;border-radius:10px;background:#fee2e2;border:1px solid #fca5a5;color:#991b1b">
                <strong><i class="fas fa-exclamation-triangle"></i> Revision Required</strong>
                <p style="margin:4px 0 0;font-size:13px">A reviewer has rejected this MOC. Review the comments in the chain below, edit the MOC, and resubmit. The approval chain will be rebuilt on resubmit.</p>
              </div>` : ''}
            ${hasSteps ? this._renderChain(steps, activeStep) : ''}
            ${myActiveStep ? this._renderActionPanel(m, myActiveStep) : ''}
            ${this._renderForms(m, forms)}
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="closeModal()">Close</button>
            <button class="btn btn-outline" onclick="MOCPage.previewAnnexureH(${m.id})"><i class="fas fa-eye"></i> Preview (Annexure H)</button>
            ${hasSteps ? `<button class="btn btn-outline" onclick="MOCPage.downloadMinuteSheet(${m.id})"><i class="fas fa-file-pdf"></i> Minute Sheet PDF</button>` : ''}
            ${canSubmit ? `<button class="btn btn-primary" onclick="MOCPage.submitForReview(${m.id})"><i class="fas fa-paper-plane"></i> ${submitLabel}</button>` : ''}
          </div>
        </div>`;
    } catch (err) {
      document.getElementById('modal-overlay').innerHTML = `<div class="modal"><div class="modal-body">${emptyHtml('fa-exclamation-triangle', err.message)}</div></div>`;
    }
  },

  async submitForReview(id) {
    try {
      await Api.post(`/mocs/${id}/submit`, {});
      toast('Submitted for review','success');
      closeModal();
      this.load();
    } catch (err) { toast(err.message,'error'); }
  },

  // ── Annexure H Preview ───────────────────────────────
  async previewAnnexureH(id) {
    document.getElementById('modal-overlay').innerHTML = `<div class="modal modal-lg"><div class="modal-body">${loaderHtml()}</div></div>`;
    showModal();
    try {
      let moc, steps, forms;
      if (this._currentDetail && this._currentDetail.moc?.id === id) {
        ({ moc, steps, forms } = this._currentDetail);
      } else {
        const [mocRes, stepsRes, formsRes] = await Promise.all([
          Api.get(`/mocs/${id}`),
          Api.get(`/mocs/${id}/steps`).catch(() => ({ steps: [] })),
          Api.get(`/mocs/${id}/forms`).catch(() => ({ forms: [] }))
        ]);
        moc = mocRes.moc; steps = stepsRes.steps || []; forms = formsRes.forms || [];
        this._currentDetail = { moc, steps, forms };
      }

      document.getElementById('modal-overlay').innerHTML = `
        <div class="modal modal-lg" style="max-width:920px">
          <div class="modal-header" style="background:#fff">
            <div>
              <h3 style="margin:0">Annexure H — Change Request Form Preview</h3>
              <span class="text-muted text-sm">${esc(moc.moc_number)} · read-only preview</span>
            </div>
            <button class="modal-close" onclick="MOCPage.openDetail(${moc.id})"><i class="fas fa-times"></i></button>
          </div>
          <div class="modal-body" style="background:#f1f5f9">
            <div id="annexure-h-print" style="background:#fff;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#000;font-size:12px">
              ${this._renderAnnexureH(moc, steps, forms)}
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="MOCPage.openDetail(${moc.id})"><i class="fas fa-arrow-left"></i> Back</button>
            <button class="btn btn-outline" onclick="MOCPage.printAnnexureH()"><i class="fas fa-print"></i> Print / Save as PDF</button>
          </div>
        </div>`;
    } catch (err) {
      document.getElementById('modal-overlay').innerHTML = `<div class="modal"><div class="modal-body">${emptyHtml('fa-exclamation-triangle', err.message)}</div></div>`;
    }
  },

  printAnnexureH() {
    const node = document.getElementById('annexure-h-print');
    if (!node) return;
    const w = window.open('', '_blank', 'width=900,height=1100');
    w.document.write(`<!doctype html><html><head><title>Annexure H — Change Request Form</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;color:#000;font-size:12px;margin:24px}
        table.ah{width:100%;border-collapse:collapse;border:1.5px solid #000;margin-bottom:14px}
        table.ah td,table.ah th{border:1px solid #000;padding:6px 8px;vertical-align:top}
        table.ah th{background:#f4f4f4;font-weight:700;text-align:left}
        .ah-title{text-align:center;font-weight:700;font-size:14px;padding:8px}
        .ah-section{background:#0f172a;color:#fff;font-weight:700;padding:6px 8px;border:1px solid #000}
        .ah-narr{min-height:90px;padding:8px;border:1px solid #000;white-space:pre-wrap}
        .ah-cb{display:inline-block;width:12px;height:12px;border:1px solid #000;text-align:center;line-height:11px;margin-right:4px;vertical-align:middle}
        .ah-cb.on::before{content:'✓';font-weight:700}
        .ah-row{display:flex}
        .ah-row > *{flex:1}
        @media print { @page { size: A4; margin: 12mm; } body { margin:0 } }
      </style>
    </head><body>${node.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  },

  _ah(label, value) {
    return `<tr><td style="width:32%;font-weight:700">${esc(label)}</td><td>${esc(value || '')}</td></tr>`;
  },

  _ahCheckbox(on, label) {
    return `<span class="ah-cb${on ? ' on' : ''}"></span><span style="vertical-align:middle">${esc(label)}</span>`;
  },

  _renderAnnexureH(m, steps, forms) {
    const fullName = u => u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : '';
    const fmt = d => d ? new Date(d).toISOString().slice(0, 10) : '';

    // Pull approver records by position from the chain
    const findStep = code => steps.find(s => s.position_code === code);
    const fic = findStep('field_in_charge');
    const mpo = findStep('manager_process_ops');
    const em  = findStep('engineering_manager');
    const dirOps = findStep('director_ops');
    const headEdp = findStep('head_edp');
    const isMajor = m.classification === 'major';

    // Stage-2 reviewer rows for second page
    const stage2FunctionalSteps = ['manager_production', 'manager_mai', 'manager_hse', 'moc_interface'].map(findStep).filter(Boolean);
    const stage2MpoEm = isMajor ? em : mpo;
    const stage2Final = isMajor ? headEdp : dirOps;

    const rs = (forms || []).find(f => f.form_type === 'risk_screening');
    const rsAttached = !!rs;
    const classFromRs = rs?.data?.classification || m.classification;
    const riskFromRs  = rs?.data?.risk_level     || m.risk_level;

    const stepDecision = step => step && step.decision_at ? `${esc(fullName(step.assignee))} — ${fmt(step.decision_at)} — ${esc(step.status)}` : '';

    return `
      <!-- ===== PAGE 1: CHANGE REQUEST FORM ===== -->
      <div style="text-align:center;margin-bottom:8px"><strong style="text-decoration:underline;font-size:13px">Annexure H — Change Request Forms</strong></div>

      <table class="ah">
        <tr>
          <td style="width:18%;text-align:center;background:#fff;padding:8px">
            <img src="${location.origin}/img/logo.png" alt="Mari Energies" style="max-height:48px;max-width:100%;object-fit:contain">
          </td>
          <td class="ah-title" style="width:60%">CHANGE REQUEST FORM</td>
          <td style="width:22%;font-weight:700">MOC NO:<br><span style="font-weight:400">${esc(m.moc_number)}</span></td>
        </tr>
      </table>

      <table class="ah">
        <tr><td colspan="4" style="font-weight:700">PROPOSAL TITLE: <span style="font-weight:400">${esc(m.title)}</span></td></tr>
        <tr>
          <td style="font-weight:700;width:25%">ORIGINATOR:</td><td style="width:25%">${esc(fullName(m.originator))}</td>
          <td style="font-weight:700;width:25%">INITIATION DATE:</td><td>${esc(fmt(m.initiated_at))}</td>
        </tr>
        <tr>
          <td style="font-weight:700">FACILITY:</td><td>${esc(m.facility || m.field_name || '')}</td>
          <td style="font-weight:700">CATEGORY:</td><td>${esc(m.category || '')}</td>
        </tr>
        <tr>
          <td style="font-weight:700">AREA / UNIT:</td><td>${esc(m.area_unit || '')}</td>
          <td style="font-weight:700">PRIORITY:</td><td>${esc(m.priority || '')}</td>
        </tr>
        <tr>
          <td style="font-weight:700">DURATION OF CHANGE (Temporary Change):</td>
          <td>${esc(m.duration === 'temporary' ? `Temporary — until ${fmt(m.expiry_date)}` : 'Permanent')}</td>
          <td style="font-weight:700">TYPE / SUBCATEGORY:</td><td>${esc((m.type_subcategory || '').replace(/_/g, ' '))}</td>
        </tr>
        <tr>
          <td style="font-weight:700">REQUIRED COMPLETION DATE (If known):</td>
          <td>${esc(fmt(m.required_completion_date))}</td>
          <td style="font-weight:700">NO OF ATTACHMENTS:</td><td>${esc(m.attachments_count || '0')}</td>
        </tr>
      </table>

      <div class="ah-section">BACKGROUND: <span style="font-weight:400">(Reason for Change, Impact on any process, equipment, efficiency or HSEQ issue etc.)</span></div>
      <div class="ah-narr">${esc(m.background || '')}</div>

      <div class="ah-section">PROPOSED MODIFICATION: <span style="font-weight:400">(Scope of work)</span></div>
      <div class="ah-narr">${esc(m.proposed_modification || '')}</div>

      <div class="ah-section">ANTICIPATED BENEFIT: <span style="font-weight:400">(or List alternatives, if change Not approved)</span></div>
      <div class="ah-narr">${esc(m.anticipated_benefit || '')}</div>

      <table class="ah">
        <tr><td style="font-weight:700">JOB DEPENDENCY: <span style="font-weight:400">(Tick the applicable)</span></td></tr>
        <tr><td style="padding:10px 8px">
          ${this._ahCheckbox(m.job_dependency === 'plant_shutdown',     'Plant Shutdown')}  &nbsp; / &nbsp;
          ${this._ahCheckbox(m.job_dependency === 'equipment_shutdown', 'Equipment Shutdown')}  &nbsp; / &nbsp;
          ${this._ahCheckbox(m.job_dependency === 'load_reduction',     'Load Reduction')}  &nbsp; / &nbsp;
          ${this._ahCheckbox(m.job_dependency === 'normal_work',        'Normal Work')}
        </td></tr>
      </table>

      <table class="ah">
        <tr>
          <td style="width:60%;font-weight:700">ORIGINATOR NAME: <span style="font-weight:400">${esc(fullName(m.originator))}</span></td>
          <td style="font-weight:700">SIGN: <span style="font-weight:400">${m.initiated_at ? '✓ ' + esc(fmt(m.initiated_at)) : ''}</span></td>
        </tr>
        <tr><td colspan="2" style="padding:8px">
          <div>MOC Screening Criteria (Annexure-C) attached &nbsp; ${this._ahCheckbox(rsAttached, 'Yes')}</div>
          <div style="margin-top:4px">MOC Classification Form attached (Annexure-D1) &nbsp;
            ${this._ahCheckbox(classFromRs === 'minor', 'Minor Change')} &nbsp; / &nbsp;
            ${this._ahCheckbox(classFromRs === 'major', 'Major Change')}
          </div>
          <div style="margin-top:4px">MOC Risk Screening Level (Annexure-D2) attached &nbsp;
            ${this._ahCheckbox(riskFromRs === 'low',  'Low Risk')} &nbsp; / &nbsp;
            ${this._ahCheckbox(riskFromRs === 'high', 'High Risk')}
          </div>
        </td></tr>
        <tr>
          <td style="font-weight:700">FIELD INCHARGE / PLANT MANAGER / RMS: <span style="font-weight:400">${esc(fullName(fic?.assignee))}</span></td>
          <td style="font-weight:700">SIGN: <span style="font-weight:400">${stepDecision(fic)}</span></td>
        </tr>
      </table>

      <div class="ah-section" style="text-align:center">Stage-2, MOC Work Pack Development &amp; Approval &nbsp; · &nbsp; MOC NO: ${esc(m.moc_number)}</div>

      <!-- ===== PAGE 2: STAGE 2 DETAILED ENGINEERING ===== -->
      <div style="page-break-before:always;height:14px"></div>

      <table class="ah">
        <tr><td colspan="4" style="font-weight:700">PROPOSAL TITLE: <span style="font-weight:400">${esc(m.title)}</span></td></tr>
        <tr>
          <td style="width:25%;font-weight:700">MOC Initiation Date:</td><td colspan="3">${esc(fmt(m.initiated_at))}</td>
        </tr>
        <tr>
          <td style="font-weight:700">Date:</td><td>${esc(fmt(m.initiated_at))}</td>
          <td style="font-weight:700">Change Type:</td><td>${esc(m.duration === 'temporary' ? 'Temporary' : 'Permanent')}</td>
        </tr>
        <tr>
          <td style="font-weight:700">Facility:</td><td>${esc(m.facility || m.field_name || '')}</td>
          <td style="font-weight:700">Category:</td><td>${esc(m.category || '')}</td>
        </tr>
        <tr>
          <td style="font-weight:700">Target Completion:</td><td>${esc(fmt(m.required_completion_date))}</td>
          <td style="font-weight:700">Priority:</td><td>${esc(m.priority || '')}</td>
        </tr>
        <tr><td colspan="4" class="ah-section" style="background:#0f172a;color:#fff">Stage-2: Detailed Engineering Development</td></tr>
        <tr>
          <td>Scope of Work attached</td>
          <td colspan="3">
            ${this._ahCheckbox(!!m.proposed_modification, 'YES')} &nbsp; ${this._ahCheckbox(!m.proposed_modification, 'No')}
          </td>
        </tr>
        <tr>
          <td>MOC Work Pack Developed (Attached)</td>
          <td colspan="3">
            ${this._ahCheckbox(!!(forms || []).find(f => f.form_type === 'isr'), 'YES')} &nbsp; ${this._ahCheckbox(!(forms || []).find(f => f.form_type === 'isr'), 'No')}
          </td>
        </tr>
        <tr>
          <td>HSE Study Conducted (Attached)</td>
          <td colspan="3">
            ${this._ahCheckbox(!!rsAttached, 'YES')} &nbsp; ${this._ahCheckbox(!rsAttached, 'No')}
          </td>
        </tr>
        <tr><td colspan="4" style="font-weight:700">MOC Work Pack Summary:</td></tr>
        <tr><td colspan="4" class="ah-narr" style="border:none">${esc(m.notes || m.proposed_modification || '')}</td></tr>
        <tr>
          <td style="font-weight:700">JRE Name:</td><td>${esc(fullName(m.jre || m.originator))}</td>
          <td style="font-weight:700">Date &amp; Signature:</td><td>${esc(fmt(m.initiated_at))}</td>
        </tr>
        <tr><td colspan="4" style="font-weight:700">Functional Review (Site Interface and Head Office Interface i.e. Manager Production / MAI / HSE)</td></tr>
        ${stage2FunctionalSteps.length ? stage2FunctionalSteps.map(s => `
          <tr>
            <td style="font-weight:700">${esc(mocPositionLabel(s.position_code))}</td>
            <td colspan="3">
              <div><strong>Name:</strong> ${esc(fullName(s.assignee))}</div>
              <div><strong>Date &amp; Signature:</strong> ${stepDecision(s) || '—'}</div>
              ${s.comments ? `<div style="margin-top:4px;font-style:italic">"${esc(s.comments)}"</div>` : ''}
            </td>
          </tr>`).join('') : `
          <tr><td colspan="4" style="height:50px"></td></tr>`}
        <tr><td colspan="4" style="font-weight:700">Comments MPO (Minor Change) / EM (Major Change):</td></tr>
        <tr><td colspan="4" class="ah-narr">${esc(stage2MpoEm?.comments || '')}</td></tr>
        <tr>
          <td style="font-weight:700">Name:</td><td>${esc(fullName(stage2MpoEm?.assignee))}</td>
          <td style="font-weight:700">Date &amp; Signature:</td><td>${stepDecision(stage2MpoEm)}</td>
        </tr>
        <tr><td colspan="4" style="font-weight:700">Comments &amp; Approval Dir Ops (Minor Change) / Head EDP (Major Change):</td></tr>
        <tr><td colspan="4" class="ah-narr">${esc(stage2Final?.comments || '')}</td></tr>
        <tr>
          <td style="font-weight:700">Name:</td><td>${esc(fullName(stage2Final?.assignee))}</td>
          <td style="font-weight:700">Date &amp; Signature:</td><td>${stepDecision(stage2Final)}</td>
        </tr>
      </table>

      <!-- ===== PAGE 3: WORK PACK NARRATIVE ===== -->
      <div style="page-break-before:always;height:14px"></div>

      <table class="ah">
        <tr>
          <td style="width:18%;text-align:center;background:#fff;padding:8px">
            <img src="${location.origin}/img/logo.png" alt="Mari Energies" style="max-height:48px;max-width:100%;object-fit:contain">
          </td>
          <td class="ah-title" style="width:60%">MOC Work Pack Development &amp; Approval</td>
          <td style="width:22%;font-weight:700">MOC NO:<br><span style="font-weight:400">${esc(m.moc_number)}</span></td>
        </tr>
      </table>

      <table class="ah">
        <tr><td class="ah-section" style="background:#0f172a;color:#fff">Background:</td></tr>
        <tr><td class="ah-narr" style="min-height:120px;border:none">${esc(m.background || '')}</td></tr>
        <tr><td style="font-weight:700;text-decoration:underline">Proposed Modification:</td></tr>
        <tr><td class="ah-narr" style="min-height:160px;border:none">${esc(m.proposed_modification || '')}</td></tr>
        <tr><td style="font-weight:700;text-decoration:underline">Execution Strategy:</td></tr>
        <tr><td class="ah-narr" style="min-height:160px;border:none">${esc(m.execution_strategy || m.notes || '')}</td></tr>
        <tr><td style="font-weight:700">Attachments:</td></tr>
        <tr><td class="ah-narr" style="min-height:120px;border:none">${esc(m.attachments_summary || (m.attachments_count ? `${m.attachments_count} attachment(s)` : ''))}</td></tr>
      </table>
    `;
  },

  _stepStatusBadge(s) {
    const map = {
      pending:   ['#fef3c7', '#92400e', 'Pending'],
      approved:  ['#dcfce7', '#166534', 'Approved'],
      rejected:  ['#fee2e2', '#991b1b', 'Rejected'],
      forwarded: ['#dbeafe', '#1e40af', 'Forwarded → SME'],
      skipped:   ['#e2e8f0', '#475569', 'Skipped'],
      cancelled: ['#f1f5f9', '#64748b', 'Cancelled']
    };
    const [bg, fg, label] = map[s] || ['#e2e8f0', '#475569', s];
    return `<span class="badge" style="background:${bg};color:${fg}">${label}</span>`;
  },

  _renderChain(steps, activeStep) {
    return `
      <p class="section-title">Approval Chain (Mari Energies Hierarchy)</p>
      <div class="table-wrap"><table>
        <thead><tr><th>#</th><th>Position</th><th>Assignee</th><th>Status</th><th>Decision</th><th>Comments</th></tr></thead>
        <tbody>
          ${steps.map((s, i) => {
            const positionText = s.position_code ? mocPositionLabel(s.position_code) : (s.step_type || '—');
            const delegated = s.original_assignee_user_id && s.original_assignee_user_id !== s.assignee_user_id;
            return `
            <tr style="${s.id === activeStep?.id ? 'background:#fffbeb' : ''}">
              <td class="text-muted">${i + 1}</td>
              <td><strong>${esc(positionText)}</strong></td>
              <td class="text-sm">
                ${s.assignee ? esc(s.assignee.first_name + ' ' + s.assignee.last_name) : '—'}
                ${delegated ? ` <span class="badge" style="background:#ede9fe;color:#5b21b6" title="Delegated">delegated</span>` : ''}
              </td>
              <td>${this._stepStatusBadge(s.status)}</td>
              <td class="text-sm text-muted">${s.decision_at ? fmtDate(s.decision_at) : '—'}${s.decider ? ' · ' + esc(s.decider.first_name) : ''}</td>
              <td class="text-sm" style="white-space:pre-wrap;max-width:300px">${esc(s.comments || '')}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>`;
  },

  _renderActionPanel(moc, step) {
    const positionText = step.position_code ? mocPositionLabel(step.position_code) : step.step_type;
    return `
      <div style="margin-top:18px;padding:14px;border:2px solid var(--accent);border-radius:10px;background:#fffbeb">
        <p style="margin:0 0 12px;font-weight:600;color:#92400e">
          <i class="fas fa-gavel"></i> Action Required — your turn as <strong>${esc(positionText)}</strong>
        </p>

        <div class="form-group">
          <label>Comments <span class="text-muted text-sm">(required when rejecting)</span></label>
          <textarea id="act-comments" rows="2" placeholder="Reasoning, conditions, or rejection cause"></textarea>
        </div>

        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="MOCPage.act(${moc.id}, ${step.id}, 'approve')">
            <i class="fas fa-check"></i> Approve & Forward
          </button>
          <button class="btn btn-outline" style="border-color:#dc2626;color:#dc2626" onclick="MOCPage.act(${moc.id}, ${step.id}, 'reject')">
            <i class="fas fa-times"></i> Reject (back to originator)
          </button>
          <button class="btn btn-outline" onclick="MOCPage._openDelegate(${moc.id}, ${step.id})">
            <i class="fas fa-user-friends"></i> Delegate to Subordinate
          </button>
        </div>
        <div id="act-delegate-panel"></div>
      </div>
    `;
  },

  async _openDelegate(mocId, stepId) {
    const panel = document.getElementById('act-delegate-panel');
    if (!panel) return;
    panel.innerHTML = `<div style="margin-top:10px;padding:10px;background:#fff;border-radius:8px;border:1px solid var(--border)">${loaderHtml()}</div>`;
    try {
      const res = await Api.get('/mocs/delegatees');
      const delegatees = res.users || [];
      if (!delegatees.length) {
        panel.innerHTML = `<div style="margin-top:10px;padding:10px;background:#fff;border-radius:8px;border:1px solid var(--border);color:var(--muted);font-size:13px">No subordinates available to delegate to. Set "Reports To" relationships in User admin.</div>`;
        return;
      }
      panel.innerHTML = `
        <div style="margin-top:10px;padding:10px;background:#fff;border-radius:8px;border:1px solid var(--border)">
          <div class="form-group">
            <label>Delegate to *</label>
            <select id="act-delegate-to">
              <option value="">— select subordinate —</option>
              ${delegatees.map(u => `<option value="${u.id}">${esc(u.first_name)} ${esc(u.last_name)} — ${esc(u.department_code || '')}${u.moc_position ? ' · ' + esc(mocPositionLabel(u.moc_position)) : ''}</option>`).join('')}
            </select>
            <p class="text-muted text-sm" style="margin-top:4px">The chosen user will take over this step on your behalf.</p>
          </div>
          <button class="btn btn-primary" onclick="MOCPage.act(${mocId}, ${stepId}, 'delegate')">
            <i class="fas fa-paper-plane"></i> Confirm Delegation
          </button>
        </div>`;
    } catch (err) { panel.innerHTML = `<div style="color:#dc2626;margin-top:8px">${esc(err.message)}</div>`; }
  },

  async downloadMinuteSheet(mocId) {
    try {
      const token = Api.getToken();
      const res = await fetch(`${API_BASE}/mocs/${mocId}/minute-sheet`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MOC-${mocId}-minute-sheet.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { toast(err.message, 'error'); }
  },

  // ── Stage Forms ───────────────────────────────
  _formMeta() {
    return {
      risk_screening: { label: 'Risk Screening',          icon: 'fa-shield-alt',     stage: 1, when: 'Stage 1 — JRE risk evaluation' },
      isr:            { label: 'Internal Safety Review',  icon: 'fa-clipboard-check',stage: 2, when: 'Stage 2 — work-pack development' },
      pssr:           { label: 'Pre-Startup Safety Review',icon:'fa-tasks',           stage: 3, when: 'Stage 3 — before execution start-up' },
      closeout:       { label: 'Closeout',                icon: 'fa-flag-checkered', stage: 4, when: 'Stage 4 — closeout & reversion' }
    };
  },
  _formStatusBadge(s) {
    const map = {
      draft:     ['#e2e8f0', '#475569', 'Draft'],
      submitted: ['#fef3c7', '#92400e', 'Submitted'],
      approved:  ['#dcfce7', '#166534', 'Approved']
    };
    if (!s) return '<span class="badge">Not started</span>';
    const [bg, fg, label] = map[s];
    return `<span class="badge" style="background:${bg};color:${fg}">${label}</span>`;
  },
  _renderForms(m, forms) {
    const meta = this._formMeta();
    const byType = {};
    forms.forEach(f => byType[f.form_type] = f);
    const me = getCurrentUser();
    return `
      <p class="section-title">Stage Forms</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px">
        ${Object.entries(meta).map(([type, info]) => {
          const f = byType[type];
          const status = f ? f.status : null;
          const canEdit  = !f || f.status === 'draft';
          const canSubmit = f && f.status === 'draft' && Object.keys(f.data || {}).length > 0;
          const canApprove = f && f.status === 'submitted' && f.submitted_by !== me?.id;
          const canReopen = f && f.status === 'submitted';
          return `
            <div style="border:1px solid var(--border);border-radius:10px;padding:12px;background:#fff">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                <div style="font-weight:600"><i class="fas ${info.icon}" style="color:var(--accent);margin-right:6px"></i>${info.label}</div>
                ${this._formStatusBadge(status)}
              </div>
              <p class="text-muted text-sm" style="margin:0 0 10px">${info.when}</p>
              ${f && f.submitter ? `<p class="text-sm text-muted" style="margin:0 0 4px">Submitted by ${esc(f.submitter.first_name)} ${esc(f.submitter.last_name)} · ${fmtDate(f.submitted_at)}</p>` : ''}
              ${f && f.approver ? `<p class="text-sm text-muted" style="margin:0 0 4px">Approved by ${esc(f.approver.first_name)} ${esc(f.approver.last_name)} · ${fmtDate(f.approved_at)}</p>` : ''}
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
                ${canEdit  ? `<button class="btn btn-sm btn-primary" onclick="MOCPage.openForm(${m.id}, '${type}')"><i class="fas fa-edit"></i> ${f ? 'Edit' : 'Fill'}</button>` : `<button class="btn btn-sm btn-outline" onclick="MOCPage.openForm(${m.id}, '${type}')">View</button>`}
                ${canSubmit  ? `<button class="btn btn-sm btn-outline" onclick="MOCPage.submitForm(${m.id},'${type}')"><i class="fas fa-paper-plane"></i> Submit</button>` : ''}
                ${canApprove ? `<button class="btn btn-sm btn-primary" style="background:#16a34a;border-color:#16a34a" onclick="MOCPage.approveForm(${m.id},'${type}')"><i class="fas fa-check"></i> Approve</button>` : ''}
                ${canReopen  ? `<button class="btn btn-sm btn-outline" onclick="MOCPage.reopenForm(${m.id},'${type}')"><i class="fas fa-undo"></i> Reopen</button>` : ''}
              </div>
            </div>`;
        }).join('')}
      </div>`;
  },

  async openForm(mocId, formType) {
    const meta = this._formMeta()[formType];
    let existing = null;
    try {
      const res = await Api.get(`/mocs/${mocId}/forms`);
      existing = (res.forms || []).find(f => f.form_type === formType) || null;
    } catch {}
    const data = existing?.data || {};
    const readonly = existing && existing.status !== 'draft';

    document.getElementById('modal-overlay').innerHTML = `
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3><i class="fas ${meta.icon}" style="color:var(--accent);margin-right:8px"></i>${meta.label}</h3>
          <button class="modal-close" onclick="MOCPage.openDetail(${mocId})"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body" id="form-body">
          ${this._renderFormFields(formType, data, readonly)}
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="MOCPage.openDetail(${mocId})">Back</button>
          ${!readonly ? `<button class="btn btn-primary" onclick="MOCPage.saveForm(${mocId},'${formType}')"><i class="fas fa-save"></i> Save Draft</button>` : ''}
        </div>
      </div>`;
    showModal();
  },

  _renderFormFields(type, d, ro) {
    const dis = ro ? 'disabled' : '';
    const yn = (id, label, val) => `
      <div class="form-group" style="display:flex;align-items:center;gap:10px">
        <label style="margin:0;flex:1">${label}</label>
        <select id="${id}" ${dis} style="max-width:140px">
          <option value="">—</option>
          <option value="yes" ${val==='yes'?'selected':''}>Yes</option>
          <option value="no"  ${val==='no' ?'selected':''}>No</option>
          <option value="na"  ${val==='na' ?'selected':''}>N/A</option>
        </select>
      </div>`;
    const txt = (id, label, val, rows=2) => `
      <div class="form-group"><label>${label}</label><textarea id="${id}" rows="${rows}" ${dis}>${esc(val||'')}</textarea></div>`;

    if (type === 'risk_screening') {
      return `
        <p class="section-title" style="margin-top:0">Annexure C / D2 — Risk Screening</p>
        ${yn('rs-q1','Does the change affect SIL-rated or safety-critical equipment?', d.q1)}
        ${yn('rs-q2','Does it alter pressure / flow / temperature outside design envelope?', d.q2)}
        ${yn('rs-q3','Does it impact emergency systems (ESD, F&G, relief, isolation)?', d.q3)}
        ${yn('rs-q4','Does it require P&ID or PFD revision?', d.q4)}
        ${yn('rs-q5','Does it introduce new hazardous chemicals or change inventories?', d.q5)}
        ${yn('rs-q6','Does it affect HSE-MS / regulatory permits?', d.q6)}
        ${yn('rs-q7','Could it affect plant availability or production targets?', d.q7)}
        ${yn('rs-q8','Does it require operator training or procedure change?', d.q8)}
        ${txt('rs-hazards','Identified hazards', d.hazards, 3)}
        ${txt('rs-mitigation','Mitigation / controls in place', d.mitigation, 3)}
        <div class="form-row">
          <div class="form-group">
            <label>Recommended Classification *</label>
            <select id="rs-cls" ${dis}>
              <option value="">—</option>
              <option value="minor" ${d.classification==='minor'?'selected':''}>Minor</option>
              <option value="major" ${d.classification==='major'?'selected':''}>Major</option>
            </select>
          </div>
          <div class="form-group">
            <label>Recommended Risk Level *</label>
            <select id="rs-risk" ${dis}>
              <option value="">—</option>
              <option value="low"  ${d.risk_level==='low' ?'selected':''}>Low</option>
              <option value="high" ${d.risk_level==='high'?'selected':''}>High</option>
            </select>
          </div>
        </div>`;
    }

    if (type === 'isr') {
      return `
        <p class="section-title" style="margin-top:0">Internal Safety Review (Stage 2)</p>
        ${yn('isr-hazop','HAZOP completed?',                            d.hazop)}
        ${yn('isr-jsa',  'JSA / JHA completed for the work pack?',      d.jsa)}
        ${yn('isr-pid',  'P&ID / PFD redlines prepared?',               d.pid_redlines)}
        ${yn('isr-rel',  'Relief / pressure-protection review done?',   d.relief_review)}
        ${yn('isr-elec', 'Electrical area-classification reviewed?',    d.electrical_class)}
        ${yn('isr-mat',  'Material compatibility / MOC verified?',      d.material_moc)}
        ${yn('isr-train','Operator / maintainer training planned?',     d.training_planned)}
        ${yn('isr-spare','Spare parts / consumables provisioned?',      d.spares)}
        ${txt('isr-actions','Outstanding actions / pre-execution requirements', d.actions, 4)}
        ${txt('isr-refs','References (HAZOP report no, JSA no, drawings)', d.refs, 2)}`;
    }

    if (type === 'pssr') {
      return `
        <p class="section-title" style="margin-top:0">PSSR — Pre-Startup Safety Review (Stage 3B)</p>
        <div class="form-group" style="display:flex;align-items:center;gap:10px"><label style="margin:0;flex:1">PSSR conducted on site</label><input type="checkbox" id="pssr-conducted" ${d.conducted?'checked':''} ${dis}></div>
        <div class="form-group" style="display:flex;align-items:center;gap:10px"><label style="margin:0;flex:1">Changes communicated to operations</label><input type="checkbox" id="pssr-comm" ${d.changes_communicated?'checked':''} ${dis}></div>
        <div class="form-group" style="display:flex;align-items:center;gap:10px"><label style="margin:0;flex:1">All Category-A actions closed</label><input type="checkbox" id="pssr-cata" ${d.cat_a_actions_closed?'checked':''} ${dis}></div>
        <div class="form-group" style="display:flex;align-items:center;gap:10px"><label style="margin:0;flex:1"><strong>Approved for Start-up</strong></label><input type="checkbox" id="pssr-startup" ${d.approved_for_startup?'checked':''} ${dis}></div>
        ${txt('pssr-walkdown','Walkdown findings', d.walkdown_findings, 3)}
        ${txt('pssr-attendees','PSSR attendees', d.attendees, 2)}
        ${txt('pssr-actions','Open Category-B actions (deferred to closeout)', d.cat_b_actions, 3)}`;
    }

    if (type === 'closeout') {
      return `
        <p class="section-title" style="margin-top:0">Closeout (Stage 4)</p>
        <div class="form-group" style="display:flex;align-items:center;gap:10px"><label style="margin:0;flex:1">Drawings redlined and updated</label><input type="checkbox" id="co-dwg" ${d.drawings_redlined?'checked':''} ${dis}></div>
        <div class="form-group" style="display:flex;align-items:center;gap:10px"><label style="margin:0;flex:1">Procedures / SOPs updated</label><input type="checkbox" id="co-proc" ${d.procedures_updated?'checked':''} ${dis}></div>
        <div class="form-group" style="display:flex;align-items:center;gap:10px"><label style="margin:0;flex:1">All Category-B actions closed</label><input type="checkbox" id="co-catb" ${d.cat_b_actions_closed?'checked':''} ${dis}></div>
        <div class="form-group" style="display:flex;align-items:center;gap:10px"><label style="margin:0;flex:1">Construction dossier compiled</label><input type="checkbox" id="co-dossier" ${d.construction_dossier?'checked':''} ${dis}></div>
        <div class="form-group" style="display:flex;align-items:center;gap:10px"><label style="margin:0;flex:1">Temporary changes reverted (if applicable)</label><input type="checkbox" id="co-temp" ${d.temp_reverted?'checked':''} ${dis}></div>
        <div class="form-group" style="display:flex;align-items:center;gap:10px"><label style="margin:0;flex:1">Verification record completed</label><input type="checkbox" id="co-ver" ${d.verification_record?'checked':''} ${dis}></div>
        ${txt('co-summary','Closeout summary', d.summary, 4)}`;
    }
    return '<p class="text-muted">Unknown form type.</p>';
  },

  _collectForm(type) {
    const v = id => document.getElementById(id)?.value;
    const c = id => !!document.getElementById(id)?.checked;
    if (type === 'risk_screening') return {
      q1:v('rs-q1'),q2:v('rs-q2'),q3:v('rs-q3'),q4:v('rs-q4'),
      q5:v('rs-q5'),q6:v('rs-q6'),q7:v('rs-q7'),q8:v('rs-q8'),
      hazards:v('rs-hazards'), mitigation:v('rs-mitigation'),
      classification:v('rs-cls'), risk_level:v('rs-risk')
    };
    if (type === 'isr') return {
      hazop:v('isr-hazop'), jsa:v('isr-jsa'), pid_redlines:v('isr-pid'),
      relief_review:v('isr-rel'), electrical_class:v('isr-elec'),
      material_moc:v('isr-mat'), training_planned:v('isr-train'), spares:v('isr-spare'),
      actions:v('isr-actions'), refs:v('isr-refs')
    };
    if (type === 'pssr') return {
      conducted:c('pssr-conducted'), changes_communicated:c('pssr-comm'),
      cat_a_actions_closed:c('pssr-cata'), approved_for_startup:c('pssr-startup'),
      walkdown_findings:v('pssr-walkdown'), attendees:v('pssr-attendees'),
      cat_b_actions:v('pssr-actions')
    };
    if (type === 'closeout') return {
      drawings_redlined:c('co-dwg'), procedures_updated:c('co-proc'),
      cat_b_actions_closed:c('co-catb'), construction_dossier:c('co-dossier'),
      temp_reverted:c('co-temp'), verification_record:c('co-ver'),
      summary:v('co-summary')
    };
    return {};
  },

  async saveForm(mocId, type) {
    try {
      const data = this._collectForm(type);
      await Api.put(`/mocs/${mocId}/forms/${type}`, { data });
      toast('Saved','success');
      this.openDetail(mocId);
    } catch (err) { toast(err.message,'error'); }
  },
  async submitForm(mocId, type) {
    try { await Api.post(`/mocs/${mocId}/forms/${type}/submit`, {}); toast('Submitted','success'); this.openDetail(mocId); }
    catch(err){ toast(err.message,'error'); }
  },
  async reopenForm(mocId, type) {
    try { await Api.post(`/mocs/${mocId}/forms/${type}/reopen`, {}); toast('Reopened','success'); this.openDetail(mocId); }
    catch(err){ toast(err.message,'error'); }
  },
  async approveForm(mocId, type) {
    const comments = prompt('Approval comments (optional):') || '';
    try { await Api.post(`/mocs/${mocId}/forms/${type}/approve`, { comments }); toast('Approved','success'); this.openDetail(mocId); this.load(); }
    catch(err){ toast(err.message,'error'); }
  },

  async act(mocId, stepId, action) {
    const body = { action };
    const c = document.getElementById('act-comments');
    if (c) body.comments = c.value.trim() || undefined;

    if (action === 'reject' && !body.comments) {
      toast('Comments are required when rejecting', 'error'); return;
    }
    if (action === 'delegate') {
      body.delegate_to_user_id = Number(document.getElementById('act-delegate-to')?.value);
      if (!body.delegate_to_user_id) { toast('Select a subordinate to delegate to', 'error'); return; }
    }

    try {
      await Api.post(`/mocs/${mocId}/steps/${stepId}/act`, body);
      toast('Recorded', 'success');
      closeModal();
      this.load();
    } catch (err) { toast(err.message, 'error'); }
  }
};
