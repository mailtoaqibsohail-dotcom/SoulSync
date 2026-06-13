import React, { useEffect, useState, useCallback } from 'react';
import adminApi from '../adminApi';

const Stat = ({ label, value, accent, sub }) => (
  <div className={`admin-stat ${accent ? 'admin-stat-accent' : ''}`}>
    <div className="admin-stat-value">{value ?? '—'}</div>
    <div className="admin-stat-label">{label}</div>
    {sub != null && <div className="admin-stat-sub">{sub}</div>}
  </div>
);

const fmtUptime = (s) => {
  if (s == null) return '—';
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
};

const AdminSystem = () => {
  const [h, setH] = useState(null);
  const [error, setError] = useState('');
  const [brevoKey, setBrevoKey] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const { data } = await adminApi.get('/api/admin/health');
      setH(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load system health');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveBrevoKey = async () => {
    setSavingKey(true); setMsg(''); setError('');
    try {
      await adminApi.patch('/api/admin/settings', { email: { providerApiKey: brevoKey } });
      setMsg('Email key saved');
      setBrevoKey('');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally { setSavingKey(false); }
  };

  // Atlas connection-cap signal: M0/shared tiers cap at ~500. Warn when headroom is low.
  const conns = h?.db?.connections;
  const connTotal = conns ? conns.current + conns.available : null;
  const connWarn = conns && conns.available < 50;
  const nearM0Cap = connTotal != null && connTotal <= 510; // ~500 cap → shared/M0 tier

  return (
    <div>
      <h1 className="admin-h1">System health</h1>
      {error && <div className="admin-error">{error}</div>}
      {msg && <div className="admin-ok">{msg}</div>}

      <h2 className="admin-h2">Server</h2>
      <div className="admin-stat-grid">
        <Stat label="Uptime" value={fmtUptime(h?.server.uptimeSeconds)} />
        <Stat label="Node" value={h?.server.node} />
        <Stat label="Env" value={h?.server.env} />
        <Stat label="Memory (RSS)" value={h ? `${h.server.memoryMB.rss} MB` : null} sub={h ? `heap ${h.server.memoryMB.heapUsed} MB` : null} />
      </div>

      <h2 className="admin-h2">Database (MongoDB)</h2>
      <div className="admin-stat-grid">
        <Stat label="Connection" value={h ? (h.db.state === 1 ? 'connected' : `state ${h.db.state}`) : null} accent={h && h.db.state !== 1} />
        <Stat label="Mongo version" value={h?.db.version} />
        <Stat label="Conns in use" value={conns?.current} accent={connWarn} sub={conns ? `${conns.available} available` : null} />
        <Stat label="Conn cap" value={connTotal} sub={nearM0Cap ? '≈500 → shared/M0 tier' : 'dedicated tier'} accent={nearM0Cap} />
      </div>
      {nearM0Cap && (
        <div className="admin-error">
          ⚠️ Connection ceiling ≈{connTotal} — this is a shared/free (M0) Atlas tier. It will throttle well before 1,000 concurrent users. Upgrade to M10+ before a large launch.
        </div>
      )}
      {connWarn && !nearM0Cap && (
        <div className="admin-error">⚠️ Only {conns.available} DB connections free — approaching the pool limit.</div>
      )}

      <h2 className="admin-h2">Push notifications</h2>
      <div className="admin-stat-grid">
        <Stat label="Notifications on" value={h?.push.notificationsOn} sub={h && h.push.total ? `${Math.round((h.push.notificationsOn / h.push.total) * 100)}% of users` : null} />
        <Stat label="Have a device token" value={h?.push.withDeviceTokens} accent />
        {(h?.push.byPlatform || []).map((p) => (
          <Stat key={p.platform} label={`Tokens: ${p.platform}`} value={p.count} />
        ))}
      </div>
      <p className="admin-hint">Per-send delivery success/failure tracking needs logging added to the FCM send path — not captured yet.</p>

      <h2 className="admin-h2">Email (Brevo relay)</h2>
      <div className="admin-card">
        <div className="admin-kv"><span className="admin-kv-label">SMTP host</span><span className="admin-kv-value">{h?.email.smtpHost || '—'}</span></div>
        <div className="admin-kv"><span className="admin-kv-label">From</span><span className="admin-kv-value">{h?.email.from || '—'}</span></div>
        <div className="admin-kv"><span className="admin-kv-label">Live usage</span><span className="admin-kv-value">
          {h?.email.brevoConfigured
            ? (h.email.usage ? `${h.email.usage.plan?.[0]?.type || 'account'} · ${h.email.usage.email || ''}` : 'key set, but fetch failed')
            : 'add a Brevo API key below to pull usage'}
        </span></div>
        <div className="admin-field" style={{ marginTop: 10 }}>
          <label>Brevo API key (optional — for live sending stats; blank to leave unset)</label>
          <input type="password" placeholder="paste Brevo API key" value={brevoKey} onChange={(e) => setBrevoKey(e.target.value)} />
        </div>
        <button className="admin-btn admin-btn-primary" disabled={savingKey || !brevoKey} onClick={saveBrevoKey}>Save key</button>
        <p className="admin-hint">Brevo free tier = 300 emails/day, shared across all your apps on this server. Watch this if signups spike.</p>
      </div>

      <button className="admin-btn" onClick={load}>Refresh</button>
    </div>
  );
};

export default AdminSystem;
