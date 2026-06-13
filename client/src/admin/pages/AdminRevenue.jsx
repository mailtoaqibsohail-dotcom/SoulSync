import React, { useEffect, useState, useCallback } from 'react';
import adminApi from '../adminApi';

const Stat = ({ label, value, accent, sub }) => (
  <div className={`admin-stat ${accent ? 'admin-stat-accent' : ''}`}>
    <div className="admin-stat-value">{value ?? '—'}</div>
    <div className="admin-stat-label">{label}</div>
    {sub != null && <div className="admin-stat-sub">{sub}</div>}
  </div>
);

const AdminRevenue = () => {
  const [rev, setRev] = useState(null);
  const [form, setForm] = useState(null); // payment settings form
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const [{ data: r }, { data: s }] = await Promise.all([
        adminApi.get('/api/admin/revenue'),
        adminApi.get('/api/admin/settings'),
      ]);
      setRev(r);
      const p = s.settings.payment || {};
      setForm({
        provider: p.provider || '',
        priceMonthly: p.priceMonthly ?? '',
        currency: p.currency || 'USD',
        checkoutConfig: p.checkoutConfig || '',
        enabled: Boolean(p.enabled),
        premiumFeatures: (s.settings.premiumFeatures || []).join(', '),
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load revenue');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true); setError(''); setMsg('');
    try {
      await adminApi.patch('/api/admin/settings', {
        payment: {
          provider: form.provider,
          priceMonthly: form.priceMonthly === '' ? null : Number(form.priceMonthly),
          currency: form.currency,
          checkoutConfig: form.checkoutConfig,
          enabled: form.enabled,
        },
        premiumFeatures: form.premiumFeatures.split(',').map((f) => f.trim()).filter(Boolean),
      });
      setMsg('Settings saved');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const cur = rev?.pricing.currency || 'USD';
  const money = (v) => (v == null ? null : `${cur} ${v.toLocaleString()}`);

  return (
    <div>
      <h1 className="admin-h1">Revenue</h1>
      {error && <div className="admin-error">{error}</div>}
      {msg && <div className="admin-ok">{msg}</div>}

      {rev?.pricing.priceMonthly == null && (
        <div className="admin-hint" style={{ marginBottom: 14 }}>
          No monthly price set yet — set one below to compute MRR/ARR.
        </div>
      )}

      <h2 className="admin-h2">Subscriptions</h2>
      <div className="admin-stat-grid">
        <Stat label="MRR" value={money(rev?.mrr)} accent sub={rev?.mrr == null ? 'set a price' : `${rev?.counts.activePremium} active × ${money(rev?.pricing.priceMonthly)}`} />
        <Stat label="ARR" value={money(rev?.arr)} />
        <Stat label="Active premium" value={rev?.counts.activePremium} />
        <Stat label="Free" value={rev?.counts.free} />
        <Stat label="Conversion" value={rev ? `${rev.conversionRate}%` : null} />
        <Stat label="New premium (30d)" value={rev?.counts.newPremium30d} />
        <Stat label="Expiring (30d)" value={rev?.counts.expiringSoon} accent />
        <Stat label="Lapsed (still 'premium')" value={rev?.counts.lapsed} sub="expiry passed" />
      </div>

      {/* Monetization settings — blank + editable, no provider hard-wired */}
      <div className="admin-card" style={{ marginTop: 8 }}>
        <h2 className="admin-h2" style={{ marginTop: 0 }}>Monetization settings</h2>
        <p className="admin-hint" style={{ marginTop: -4 }}>
          Payment provider is intentionally blank — fill it in when you integrate one. Nothing here charges anyone yet.
        </p>
        {form && (
          <>
            <div className="admin-two-col">
              <div className="admin-field">
                <label>Payment provider</label>
                <input placeholder="e.g. stripe / paypal / manual (blank)" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
              </div>
              <div className="admin-field">
                <label>Monthly price</label>
                <input type="number" min="0" step="0.01" placeholder="(not set)" value={form.priceMonthly} onChange={(e) => setForm({ ...form, priceMonthly: e.target.value })} />
              </div>
            </div>
            <div className="admin-two-col">
              <div className="admin-field">
                <label>Currency</label>
                <input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
              </div>
              <div className="admin-field">
                <label>Premium features (comma-separated)</label>
                <input placeholder="e.g. unlimited_swipes, see_who_liked" value={form.premiumFeatures} onChange={(e) => setForm({ ...form, premiumFeatures: e.target.value })} />
              </div>
            </div>
            <div className="admin-field">
              <label>Checkout config (link / key / instructions)</label>
              <textarea rows={2} placeholder="Paste a checkout link, publishable key, or notes — blank for now" value={form.checkoutConfig} onChange={(e) => setForm({ ...form, checkoutConfig: e.target.value })} />
            </div>
            <label className="admin-toggle-row">
              <span>Paywall enabled (turn on when payments are wired)</span>
              <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
            </label>
            <button className="admin-btn admin-btn-primary" disabled={saving} onClick={save}>Save settings</button>
          </>
        )}
      </div>

      <p className="admin-hint">
        Per-user billing (grant/extend premium, set expiry) lives on each user's detail page → Plan.
        Feature-usage stats will populate once features are actually gated behind <code>isPremium</code>.
      </p>
    </div>
  );
};

export default AdminRevenue;
