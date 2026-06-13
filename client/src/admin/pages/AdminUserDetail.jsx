import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import adminApi from '../adminApi';

const Row = ({ label, children }) => (
  <div className="admin-kv"><span className="admin-kv-label">{label}</span><span className="admin-kv-value">{children}</span></div>
);

const AdminUserDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Editable form (profile + settings)
  const [edit, setEdit] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await adminApi.get(`/api/admin/users/${id}`);
      setUser(data.user);
      setStats(data.stats);
      setEdit({
        name: data.user.name || '',
        bio: data.user.bio || '',
        email: data.user.email || '',
        phone: data.user.phone || '',
        hobbies: (data.user.hobbies || []).join(', '),
        settings: { ...data.user.settings },
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load user');
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const patch = async (body, successMsg) => {
    setSaving(true);
    setError(''); setMsg('');
    try {
      const { data } = await adminApi.patch(`/api/admin/users/${id}`, body);
      setUser(data.user);
      setMsg(successMsg || 'Saved');
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = () => patch({
    name: edit.name,
    bio: edit.bio,
    email: edit.email,
    phone: edit.phone,
    hobbies: edit.hobbies.split(',').map((h) => h.trim()).filter(Boolean),
    settings: edit.settings,
  }, 'Profile saved');

  const doDelete = async () => {
    setSaving(true);
    try {
      await adminApi.delete(`/api/admin/users/${id}`);
      navigate('/admin/users', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
      setSaving(false);
    }
  };

  if (error && !user) return <div className="admin-error">{error}</div>;
  if (!user || !edit) return <div className="admin-loading"><div className="spinner" /></div>;

  return (
    <div className="admin-detail">
      <Link to="/admin/users" className="admin-back">← Back to users</Link>
      <div className="admin-detail-head">
        {user.profilePhoto
          ? <img className="admin-detail-avatar" src={user.profilePhoto} alt="" />
          : <span className="admin-detail-avatar admin-avatar-fallback">{(user.name || '?')[0]}</span>}
        <div>
          <h1 className="admin-h1" style={{ margin: 0 }}>{user.name} <span className="admin-user-handle">@{user.username}</span></h1>
          <div className="admin-badges">
            <span className={`admin-pill ${user.isActive ? 'admin-pill-green' : 'admin-pill-red'}`}>{user.isActive ? 'active' : 'banned'}</span>
            <span className={`admin-pill ${user.plan === 'premium' ? 'admin-pill-gold' : ''}`}>{user.plan}{user.isPremium ? ' • premium' : ''}</span>
            {user.isVerified && <span className="admin-pill admin-pill-blue">verified</span>}
          </div>
        </div>
      </div>

      {error && <div className="admin-error">{error}</div>}
      {msg && <div className="admin-ok">{msg}</div>}

      {/* ── Moderation actions ── */}
      <div className="admin-card">
        <h2 className="admin-h2">Moderation</h2>
        <div className="admin-actions">
          <button className="admin-btn" disabled={saving}
            onClick={() => patch({ isActive: !user.isActive }, user.isActive ? 'User banned' : 'User reactivated')}>
            {user.isActive ? 'Ban / suspend' : 'Reactivate'}
          </button>
          <button className="admin-btn" disabled={saving}
            onClick={() => patch({ isVerified: !user.isVerified }, 'Verification updated')}>
            {user.isVerified ? 'Remove verification' : 'Verify'}
          </button>
          <button className="admin-btn admin-btn-danger" disabled={saving} onClick={() => setConfirmDelete(true)}>
            Delete account
          </button>
        </div>
      </div>

      {/* ── Plan / subscription ── */}
      <div className="admin-card">
        <h2 className="admin-h2">Plan</h2>
        <div className="admin-actions">
          <button className={`admin-btn ${user.plan === 'free' ? 'admin-btn-primary' : ''}`} disabled={saving}
            onClick={() => patch({ plan: 'free' }, 'Set to free')}>Free</button>
          <button className={`admin-btn ${user.plan === 'premium' ? 'admin-btn-primary' : ''}`} disabled={saving}
            onClick={() => patch({ plan: 'premium' }, 'Set to premium')}>Premium</button>
        </div>
        <div className="admin-hint">
          {user.premiumSince && <>Premium since {new Date(user.premiumSince).toLocaleDateString()}. </>}
          {user.planExpiresAt ? <>Expires {new Date(user.planExpiresAt).toLocaleDateString()}.</> : 'No expiry set.'}
        </div>
      </div>

      {/* ── Editable profile ── */}
      <div className="admin-card">
        <h2 className="admin-h2">Profile</h2>
        <div className="admin-field"><label>Name</label>
          <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
        <div className="admin-field"><label>Email</label>
          <input value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></div>
        <div className="admin-field"><label>Phone</label>
          <input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></div>
        <div className="admin-field"><label>Bio</label>
          <textarea rows={3} value={edit.bio} onChange={(e) => setEdit({ ...edit, bio: e.target.value })} /></div>
        <div className="admin-field"><label>Hobbies (comma-separated)</label>
          <input value={edit.hobbies} onChange={(e) => setEdit({ ...edit, hobbies: e.target.value })} /></div>
        <button className="admin-btn admin-btn-primary" disabled={saving} onClick={saveProfile}>Save profile</button>
      </div>

      {/* ── Settings (every toggle) ── */}
      <div className="admin-card">
        <h2 className="admin-h2">Settings</h2>
        {['notificationsEnabled', 'showOnlineStatus', 'showLastSeen', 'readReceipts'].map((k) => (
          <label key={k} className="admin-toggle-row">
            <span>{k}</span>
            <input type="checkbox" checked={Boolean(edit.settings[k])}
              onChange={(e) => setEdit({ ...edit, settings: { ...edit.settings, [k]: e.target.checked } })} />
          </label>
        ))}
        <button className="admin-btn admin-btn-primary" disabled={saving}
          onClick={() => patch({ settings: edit.settings }, 'Settings saved')}>Save settings</button>
      </div>

      {/* ── Read-only facts + activity ── */}
      <div className="admin-card">
        <h2 className="admin-h2">Details</h2>
        <Row label="ID">{user._id}</Row>
        <Row label="Username">@{user.username}</Row>
        <Row label="Age">{user.age ?? '—'}</Row>
        <Row label="Gender">{user.gender}</Row>
        <Row label="Interested in">{(user.interestedIn || []).join(', ') || '—'}</Row>
        <Row label="Location">{user.location?.city || '—'}{user.location?.country ? `, ${user.location.country}` : ''}</Row>
        <Row label="Photos">{(user.photos || []).length}</Row>
        <Row label="Online">{user.isOnline ? 'yes' : 'no'}</Row>
        <Row label="Last seen">{user.lastSeen ? new Date(user.lastSeen).toLocaleString() : '—'}</Row>
        <Row label="Joined">{new Date(user.createdAt).toLocaleString()}</Row>
      </div>

      <div className="admin-card">
        <h2 className="admin-h2">Activity</h2>
        <div className="admin-stat-grid">
          <div className="admin-stat"><div className="admin-stat-value">{stats?.swipesGiven}</div><div className="admin-stat-label">Swipes given</div></div>
          <div className="admin-stat"><div className="admin-stat-value">{stats?.swipesReceived}</div><div className="admin-stat-label">Swipes received</div></div>
          <div className="admin-stat"><div className="admin-stat-value">{stats?.matchCount}</div><div className="admin-stat-label">Matches</div></div>
          <div className="admin-stat"><div className="admin-stat-value">{stats?.messagesSent}</div><div className="admin-stat-label">Messages sent</div></div>
          <div className="admin-stat"><div className="admin-stat-value">{stats?.reportsAgainst}</div><div className="admin-stat-label">Reports against</div></div>
        </div>
      </div>

      {confirmDelete && (
        <div className="admin-modal-backdrop" onClick={() => setConfirmDelete(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete {user.name}?</h3>
            <p>This permanently removes the account and all their swipes, matches, messages and reports. This cannot be undone.</p>
            <div className="admin-actions">
              <button className="admin-btn" onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button className="admin-btn admin-btn-danger" disabled={saving} onClick={doDelete}>Delete permanently</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserDetail;
