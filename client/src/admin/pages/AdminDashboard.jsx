import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import adminApi from '../adminApi';

const StatCard = ({ label, value, accent, sub }) => (
  <div className={`admin-stat ${accent ? 'admin-stat-accent' : ''}`}>
    <div className="admin-stat-value">{value ?? '—'}</div>
    <div className="admin-stat-label">{label}</div>
    {sub != null && <div className="admin-stat-sub">{sub}</div>}
  </div>
);

// Horizontal bar list (gender, age, cities)
const BarList = ({ rows, total, color }) => {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="admin-bars">
      {rows.map((r) => (
        <div className="admin-bar-row" key={r.label}>
          <span className="admin-bar-label">{r.label}</span>
          <div className="admin-bar-track">
            <div className="admin-bar-fill" style={{ width: `${(r.count / max) * 100}%`, background: color || 'var(--gradient)' }} />
          </div>
          <span className="admin-bar-count">
            {r.count}{total ? ` · ${Math.round((r.count / total) * 100)}%` : ''}
          </span>
        </div>
      ))}
      {rows.length === 0 && <div className="admin-empty">No data</div>}
    </div>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [growth, setGrowth] = useState([]);
  const [flagged, setFlagged] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadFlagged = () => adminApi.get('/api/admin/flagged', { params: { limit: 8 } })
    .then(({ data }) => setFlagged(data.items || [])).catch(() => {});

  useEffect(() => {
    adminApi.get('/api/admin/stats').then(({ data }) => setStats(data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load stats'));
    adminApi.get('/api/admin/stats/growth').then(({ data }) => setGrowth(data.days || [])).catch(() => {});
    loadFlagged();
  }, []);

  const suspend = async (u) => {
    const reason = window.prompt(`Suspend ${u.name}? Reason (optional):`, '');
    if (reason === null) return;
    setBusy(true);
    try {
      await adminApi.patch(`/api/admin/users/${u._id}`, { isActive: false, banReason: reason });
      await loadFlagged();
    } catch (err) { setError(err.response?.data?.message || 'Suspend failed'); }
    finally { setBusy(false); }
  };

  const del = async (u) => {
    if (!window.confirm(`Permanently delete ${u.name} (@${u.username}) and all their data? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await adminApi.delete(`/api/admin/users/${u._id}`);
      await loadFlagged();
    } catch (err) { setError(err.response?.data?.message || 'Delete failed'); }
    finally { setBusy(false); }
  };

  const g = stats?.gender || {};
  const genderRows = [
    { label: 'Men', count: g.man || 0 },
    { label: 'Women', count: g.woman || 0 },
    { label: 'Non-binary', count: g['non-binary'] || 0 },
    { label: 'Other', count: g.other || 0 },
  ];
  const total = stats?.users.total || 0;
  const growthMax = Math.max(1, ...growth.map((d) => d.count));

  return (
    <div>
      <h1 className="admin-h1">Dashboard</h1>
      {error && <div className="admin-error">{error}</div>}

      <h2 className="admin-h2">Users</h2>
      <div className="admin-stat-grid">
        <StatCard label="Total users" value={stats?.users.total} />
        <StatCard label="Active today (DAU)" value={stats?.users.dau} accent />
        <StatCard label="Active this week (WAU)" value={stats?.users.wau} />
        <StatCard label="Online now" value={stats?.users.online} />
        <StatCard label="Verified" value={stats?.users.verified} />
        <StatCard label="New today" value={stats?.users.newToday} />
        <StatCard label="New (7 days)" value={stats?.users.new7d} />
        <StatCard label="Banned" value={stats ? stats.users.total - stats.users.active : null} />
        <StatCard label="Flagged (reported)" value={stats?.flagged.any} accent sub={stats ? `${stats.flagged.multi} by 2+ people` : null} />
      </div>

      {/* Flagged users — surfaced automatically, most-reported first */}
      <div className="admin-card">
        <h2 className="admin-h2" style={{ marginTop: 0 }}>
          🚩 Flagged users {flagged.length > 0 && <span className="admin-count">{flagged.length}</span>}
        </h2>
        {flagged.length === 0 ? (
          <div className="admin-empty" style={{ padding: 8 }}>No reported users 🎉</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr><th>User</th><th>Reported by</th><th>Reports</th><th>Reasons</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {flagged.map((f) => (
                <tr key={f.user._id} className={f.distinctReporters >= 3 ? 'admin-row-danger' : ''}>
                  <td className="admin-row-link" onClick={() => navigate(`/admin/users/${f.user._id}`)}>
                    <div className="admin-user-cell">
                      {f.user.profilePhoto ? <img src={f.user.profilePhoto} alt="" /> : <span className="admin-avatar-fallback">{(f.user.name || '?')[0]}</span>}
                      <div>
                        <div className="admin-user-name">{f.user.name}</div>
                        <div className="admin-user-handle">@{f.user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className={`admin-pill ${f.distinctReporters >= 3 ? 'admin-pill-red' : f.distinctReporters >= 2 ? 'admin-pill-gold' : ''}`}>{f.distinctReporters} {f.distinctReporters === 1 ? 'person' : 'people'}</span></td>
                  <td>{f.reportCount}{f.pending ? ` (${f.pending} pending)` : ''}</td>
                  <td className="admin-details-cell">{f.topReasons.map((r) => `${r.reason}×${r.n}`).join(', ')}</td>
                  <td><span className={`admin-pill ${f.user.isActive ? 'admin-pill-green' : 'admin-pill-red'}`}>{f.user.isActive ? 'active' : 'suspended'}</span></td>
                  <td>
                    <div className="admin-actions">
                      {f.user.isActive && <button className="admin-btn admin-btn-sm" disabled={busy} onClick={() => suspend(f.user)}>Suspend</button>}
                      <button className="admin-btn admin-btn-sm admin-btn-danger" disabled={busy} onClick={() => del(f.user)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Gender ratio — #1 health signal */}
      <div className="admin-two-col">
        <div className="admin-card">
          <h2 className="admin-h2" style={{ marginTop: 0 }}>Gender ratio</h2>
          <BarList rows={genderRows} total={total} />
          {g.man > 0 && g.woman > 0 && (
            <div className="admin-hint">Ratio M:W ≈ {(g.man / g.woman).toFixed(2)} : 1</div>
          )}
        </div>
        <div className="admin-card">
          <h2 className="admin-h2" style={{ marginTop: 0 }}>Age distribution</h2>
          <BarList rows={(stats?.ages || []).map((a) => ({ label: a.range, count: a.count }))} total={total} color="var(--purple)" />
        </div>
      </div>

      {/* Growth */}
      <div className="admin-card">
        <h2 className="admin-h2" style={{ marginTop: 0 }}>Signups — last 30 days</h2>
        {growth.length ? (
          <div className="admin-spark">
            {growth.map((d) => (
              <div key={d.date} className="admin-spark-bar" title={`${d.date}: ${d.count}`}
                style={{ height: `${Math.max(4, (d.count / growthMax) * 100)}%` }} />
            ))}
          </div>
        ) : <div className="admin-empty">No signups in range</div>}
      </div>

      {/* Core loop + completeness */}
      <h2 className="admin-h2">Core loop</h2>
      <div className="admin-stat-grid">
        <StatCard label="Matches" value={stats?.coreLoop.matches} />
        <StatCard label="Matches that chat" value={stats ? `${stats.coreLoop.chatRate}%` : null} accent sub={`${stats?.coreLoop.matchesWithMessages ?? 0} of ${stats?.coreLoop.matches ?? 0}`} />
        <StatCard label="Msgs / match" value={stats?.coreLoop.messagesPerMatch} />
        <StatCard label="Total messages" value={stats?.messages} />
        <StatCard label="Total swipes" value={stats?.swipes} />
      </div>

      <h2 className="admin-h2">Profile completeness</h2>
      <div className="admin-stat-grid">
        <StatCard label="No photos" value={stats?.completeness.noPhotos} accent sub="won't get matches" />
        <StatCard label="Empty bio" value={stats?.completeness.noBio} />
      </div>

      {/* Plans + geography */}
      <div className="admin-two-col">
        <div className="admin-card">
          <h2 className="admin-h2" style={{ marginTop: 0 }}>Plans</h2>
          <BarList rows={[{ label: 'Free', count: stats?.plans.free || 0 }, { label: 'Premium', count: stats?.plans.premium || 0 }]} total={total} color="#ffc107" />
        </div>
        <div className="admin-card">
          <h2 className="admin-h2" style={{ marginTop: 0 }}>Top cities</h2>
          <BarList rows={(stats?.topCities || []).map((c) => ({ label: c.city, count: c.count }))} color="var(--green)" />
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <Link className="admin-btn" to="/admin/users">Manage users →</Link>{' '}
        <Link className="admin-btn" to="/admin/reports">Review reports →</Link>{' '}
        <Link className="admin-btn" to="/admin/audit">Audit log →</Link>
      </div>
    </div>
  );
};

export default AdminDashboard;
