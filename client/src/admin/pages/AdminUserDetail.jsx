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
  const [edit, setEdit] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [activity, setActivity] = useState(null);
  const [preview, setPreview] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await adminApi.get(`/api/admin/users/${id}`);
      setUser(data.user);
      setStats(data.stats);
      setEdit({
        name: data.user.name || '', bio: data.user.bio || '', email: data.user.email || '',
        phone: data.user.phone || '', hobbies: (data.user.hobbies || []).join(', '),
        settings: { ...data.user.settings },
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load user');
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const patch = async (body, successMsg) => {
    setSaving(true); setError(''); setMsg('');
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

  const toggleBan = () => {
    if (user.isActive) {
      const reason = window.prompt('Ban this user. Reason (optional):', '');
      if (reason === null) return;
      patch({ isActive: false, banReason: reason }, 'User banned');
    } else {
      patch({ isActive: true }, 'User reactivated');
    }
  };

  const saveProfile = () => patch({
    name: edit.name, bio: edit.bio, email: edit.email, phone: edit.phone,
    hobbies: edit.hobbies.split(',').map((h) => h.trim()).filter(Boolean),
  }, 'Profile saved');

  const addNote = async () => {
    if (!noteText.trim()) return;
    setSaving(true); setError('');
    try {
      const { data } = await adminApi.post(`/api/admin/users/${id}/notes`, { text: noteText.trim() });
      setUser((u) => ({ ...u, adminNotes: data.adminNotes }));
      setNoteText('');
      setMsg('Note added');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add note');
    } finally { setSaving(false); }
  };

  const removePhoto = async (url) => {
    if (!window.confirm('Remove this photo from the profile?')) return;
    setSaving(true);
    try {
      const { data } = await adminApi.delete(`/api/admin/users/${id}/photos`, { data: { url } });
      setUser((u) => ({ ...u, photos: data.photos, profilePhoto: data.profilePhoto }));
      setMsg('Photo removed');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove photo');
    } finally { setSaving(false); }
  };

  const loadActivity = async () => {
    try { const { data } = await adminApi.get(`/api/admin/users/${id}/activity`); setActivity(data); }
    catch (err) { setError(err.response?.data?.message || 'Failed to load activity'); }
  };
  const loadPreview = async () => {
    try { const { data } = await adminApi.get(`/api/admin/users/${id}/discover-preview`); setPreview(data); }
    catch (err) { setError(err.response?.data?.message || 'Failed to load preview'); }
  };

  const doDelete = async () => {
    setSaving(true);
    try { await adminApi.delete(`/api/admin/users/${id}`); navigate('/admin/users', { replace: true }); }
    catch (err) { setError(err.response?.data?.message || 'Delete failed'); setSaving(false); }
  };

  if (error && !user) return <div className="admin-error">{error}</div>;
  if (!user || !edit) return <div className="admin-loading"><div className="spinner" /></div>;

  return (
    <div className="admin-detail">
      <Link to="/admin/users" className="admin-back">← Back to users</Link>
      <div className="admin-detail-head">
        {user.profilePhoto ? <img className="admin-detail-avatar" src={user.profilePhoto} alt="" />
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

      {!user.isActive && user.banReason && (
        <div className="admin-error">Banned: "{user.banReason}"{user.bannedAt ? ` · ${new Date(user.bannedAt).toLocaleString()}` : ''}</div>
      )}

      {/* Moderation */}
      <div className="admin-card">
        <h2 className="admin-h2">Moderation</h2>
        <div className="admin-actions">
          <button className="admin-btn" disabled={saving} onClick={toggleBan}>{user.isActive ? 'Ban / suspend' : 'Reactivate'}</button>
          <button className="admin-btn" disabled={saving} onClick={() => patch({ isVerified: !user.isVerified }, 'Verification updated')}>{user.isVerified ? 'Remove verification' : 'Verify'}</button>
          <button className="admin-btn admin-btn-danger" disabled={saving} onClick={() => setConfirmDelete(true)}>Delete account</button>
        </div>
      </div>

      {/* Plan */}
      <div className="admin-card">
        <h2 className="admin-h2">Plan</h2>
        <div className="admin-actions">
          <button className={`admin-btn ${user.plan === 'free' ? 'admin-btn-primary' : ''}`} disabled={saving} onClick={() => patch({ plan: 'free' }, 'Set to free')}>Free</button>
          <button className={`admin-btn ${user.plan === 'premium' ? 'admin-btn-primary' : ''}`} disabled={saving} onClick={() => patch({ plan: 'premium' }, 'Set to premium')}>Premium</button>
        </div>
        <div className="admin-hint">
          {user.premiumSince && <>Premium since {new Date(user.premiumSince).toLocaleDateString()}. </>}
          {user.planExpiresAt ? <>Expires {new Date(user.planExpiresAt).toLocaleDateString()}.</> : 'No expiry set.'}
        </div>
      </div>

      {/* Admin notes */}
      <div className="admin-card">
        <h2 className="admin-h2">Internal notes</h2>
        {(user.adminNotes || []).length === 0 && <div className="admin-empty" style={{ padding: 8 }}>No notes yet</div>}
        {(user.adminNotes || []).map((n, i) => (
          <div key={i} className="admin-note">
            <div>{n.text}</div>
            <div className="admin-hint">{n.byName || 'admin'} · {new Date(n.at).toLocaleString()}</div>
          </div>
        ))}
        <div className="admin-field" style={{ marginTop: 10 }}>
          <textarea rows={2} placeholder="Add an internal note (e.g. warned for X)…" value={noteText} onChange={(e) => setNoteText(e.target.value)} />
        </div>
        <button className="admin-btn admin-btn-primary" disabled={saving || !noteText.trim()} onClick={addNote}>Add note</button>
      </div>

      {/* Photos with per-photo removal */}
      <div className="admin-card">
        <h2 className="admin-h2">Photos ({(user.photos || []).length})</h2>
        {(user.photos || []).length === 0 ? <div className="admin-empty" style={{ padding: 8 }}>No photos</div> : (
          <div className="admin-photo-row">
            {user.photos.map((p) => (
              <div key={p} className="admin-photo-wrap">
                <img src={p} alt="" className="admin-photo-thumb" />
                <button className="admin-photo-x" disabled={saving} title="Remove photo" onClick={() => removePhoto(p)}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editable profile */}
      <div className="admin-card">
        <h2 className="admin-h2">Profile</h2>
        <div className="admin-field"><label>Name</label><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
        <div className="admin-field"><label>Email</label><input value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></div>
        <div className="admin-field"><label>Phone</label><input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></div>
        <div className="admin-field"><label>Bio</label><textarea rows={3} value={edit.bio} onChange={(e) => setEdit({ ...edit, bio: e.target.value })} /></div>
        <div className="admin-field"><label>Hobbies (comma-separated)</label><input value={edit.hobbies} onChange={(e) => setEdit({ ...edit, hobbies: e.target.value })} /></div>
        <button className="admin-btn admin-btn-primary" disabled={saving} onClick={saveProfile}>Save profile</button>
      </div>

      {/* Settings */}
      <div className="admin-card">
        <h2 className="admin-h2">Settings</h2>
        {['notificationsEnabled', 'showOnlineStatus', 'showLastSeen', 'readReceipts'].map((k) => (
          <label key={k} className="admin-toggle-row">
            <span>{k}</span>
            <input type="checkbox" checked={Boolean(edit.settings[k])} onChange={(e) => setEdit({ ...edit, settings: { ...edit.settings, [k]: e.target.checked } })} />
          </label>
        ))}
        <button className="admin-btn admin-btn-primary" disabled={saving} onClick={() => patch({ settings: edit.settings }, 'Settings saved')}>Save settings</button>
      </div>

      {/* Details + device */}
      <div className="admin-card">
        <h2 className="admin-h2">Details & device</h2>
        <Row label="ID">{user._id}</Row>
        <Row label="Age">{user.age ?? '—'}</Row>
        <Row label="Gender">{user.gender}</Row>
        <Row label="Interested in">{(user.interestedIn || []).join(', ') || '—'}</Row>
        <Row label="Location">{user.location?.city || '—'}{user.location?.country ? `, ${user.location.country}` : ''}</Row>
        <Row label="Online">{user.isOnline ? 'yes' : 'no'}</Row>
        <Row label="Last seen">{user.lastSeen ? new Date(user.lastSeen).toLocaleString() : '—'}</Row>
        <Row label="Last login">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '—'}</Row>
        <Row label="Last login IP">{user.lastLoginIp || '—'}</Row>
        <Row label="Devices (push)">{(user.pushTokens || []).length ? user.pushTokens.map((t) => t.platform).join(', ') : 'none'}</Row>
        <Row label="Joined">{new Date(user.createdAt).toLocaleString()}</Row>
      </div>

      {/* Activity counts */}
      <div className="admin-card">
        <h2 className="admin-h2">Activity</h2>
        <div className="admin-stat-grid">
          <div className="admin-stat"><div className="admin-stat-value">{stats?.swipesGiven}</div><div className="admin-stat-label">Swipes given</div></div>
          <div className="admin-stat"><div className="admin-stat-value">{stats?.swipesReceived}</div><div className="admin-stat-label">Swipes received</div></div>
          <div className="admin-stat"><div className="admin-stat-value">{stats?.matchCount}</div><div className="admin-stat-label">Matches</div></div>
          <div className="admin-stat"><div className="admin-stat-value">{stats?.messagesSent}</div><div className="admin-stat-label">Messages sent</div></div>
          <div className="admin-stat"><div className="admin-stat-value">{stats?.reportsAgainst}</div><div className="admin-stat-label">Reports against</div></div>
        </div>
        {!activity ? (
          <button className="admin-btn" style={{ marginTop: 12 }} onClick={loadActivity}>Load history (swipes / matches / messages)</button>
        ) : (
          <div className="admin-activity">
            <div className="admin-kv-label" style={{ marginTop: 12 }}>Recent matches</div>
            {activity.matches.length ? activity.matches.map((m) => {
              const other = (m.users || []).find((x) => x && x._id !== user._id) || {};
              return <div key={m._id} className="admin-msg"><span>{other.name ? `${other.name} @${other.username}` : 'unknown'}</span><span className="admin-hint">{new Date(m.lastActivity).toLocaleDateString()}</span></div>;
            }) : <div className="admin-empty">None</div>}
            <div className="admin-kv-label" style={{ marginTop: 12 }}>Recent messages</div>
            {activity.messages.length ? activity.messages.slice(0, 15).map((m) => (
              <div key={m._id} className="admin-msg">
                <span className="admin-hint">{m.sender?._id === user._id ? '→' : '←'}</span>
                <span>{m.text || `[${m.mediaType || 'media'}]`}</span>
                <span className="admin-hint">{new Date(m.createdAt).toLocaleDateString()}</span>
              </div>
            )) : <div className="admin-empty">None</div>}
          </div>
        )}
      </div>

      {/* View as user — discover preview */}
      <div className="admin-card">
        <h2 className="admin-h2">View as user — Discover preview</h2>
        {!preview ? (
          <button className="admin-btn" onClick={loadPreview}>Show what they'd see</button>
        ) : (
          <>
            <div className="admin-hint" style={{ marginBottom: 10 }}>
              Showing {preview.criteria.showMe}, age {preview.criteria.ageRange.min}–{preview.criteria.ageRange.max},
              within {preview.criteria.distanceKm}km of {preview.criteria.city || 'unknown'}. Already swiped {preview.criteria.alreadySwiped}.
            </div>
            <div className={`admin-pill ${preview.poolSize === 0 ? 'admin-pill-red' : 'admin-pill-green'}`} style={{ marginBottom: 12 }}>
              {preview.poolSize} candidate{preview.poolSize === 1 ? '' : 's'} available
            </div>
            <div className="admin-photo-row">
              {preview.candidates.map((c) => (
                <div key={c._id} className="admin-cand">
                  {c.profilePhoto ? <img src={c.profilePhoto} alt="" className="admin-photo-thumb" /> : <span className="admin-photo-thumb admin-avatar-fallback">{(c.name || '?')[0]}</span>}
                  <div className="admin-cand-name">{c.name}, {c.age}</div>
                  <div className="admin-hint">{c.distanceKm}km</div>
                </div>
              ))}
              {preview.candidates.length === 0 && <div className="admin-empty">Empty feed — this is why they see no one.</div>}
            </div>
          </>
        )}
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
