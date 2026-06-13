import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi from '../adminApi';

const AdminUsers = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: '', plan: '', verified: '', sort: 'newest' });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 25, sort: filters.sort };
      if (search.trim()) params.search = search.trim();
      if (filters.status) params.status = filters.status;
      if (filters.plan) params.plan = filters.plan;
      if (filters.verified) params.verified = filters.verified;
      const { data } = await adminApi.get('/api/admin/users', { params });
      setData(data);
      setSelected(new Set());
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, search, filters]);

  useEffect(() => { load(); }, [load]);

  const onSearchSubmit = (e) => { e.preventDefault(); setPage(1); load(); };
  const setFilter = (k, v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };

  const toggle = (id) => setSelected((s) => {
    const next = new Set(s);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleAll = () => setSelected((s) =>
    s.size === data.items.length ? new Set() : new Set(data.items.map((u) => u._id)));

  const bulk = async (action) => {
    if (!selected.size) return;
    let reason;
    if (action === 'ban') {
      reason = window.prompt(`Ban ${selected.size} user(s). Reason (optional):`, '');
      if (reason === null) return; // cancelled
    } else if (!window.confirm(`${action} ${selected.size} user(s)?`)) return;
    setWorking(true);
    try {
      await adminApi.post('/api/admin/users/bulk', { ids: [...selected], action, reason });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Bulk action failed');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <h1 className="admin-h1">Users <span className="admin-count">{data.total}</span></h1>
      {error && <div className="admin-error">{error}</div>}

      <div className="admin-toolbar">
        <form onSubmit={onSearchSubmit} className="admin-search">
          <input placeholder="Search name, username or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="admin-btn" type="submit">Search</button>
        </form>
        <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
          <option value="">All status</option><option value="active">Active</option><option value="banned">Banned</option>
        </select>
        <select value={filters.plan} onChange={(e) => setFilter('plan', e.target.value)}>
          <option value="">All plans</option><option value="free">Free</option><option value="premium">Premium</option>
        </select>
        <select value={filters.verified} onChange={(e) => setFilter('verified', e.target.value)}>
          <option value="">Any verification</option><option value="true">Verified</option><option value="false">Unverified</option>
        </select>
        <select value={filters.sort} onChange={(e) => setFilter('sort', e.target.value)}>
          <option value="newest">Newest</option><option value="oldest">Oldest</option>
          <option value="lastSeen">Last seen</option><option value="name">Name A–Z</option>
        </select>
      </div>

      {selected.size > 0 && (
        <div className="admin-bulkbar">
          <span>{selected.size} selected</span>
          <button className="admin-btn admin-btn-danger" disabled={working} onClick={() => bulk('ban')}>Ban</button>
          <button className="admin-btn" disabled={working} onClick={() => bulk('unban')}>Reactivate</button>
          <button className="admin-btn" disabled={working} onClick={() => bulk('verify')}>Verify</button>
          <button className="admin-btn" disabled={working} onClick={() => bulk('unverify')}>Unverify</button>
          <button className="admin-btn" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      <table className="admin-table">
        <thead>
          <tr>
            <th style={{ width: 32 }}>
              <input type="checkbox" checked={data.items.length > 0 && selected.size === data.items.length} onChange={toggleAll} />
            </th>
            <th>User</th><th>Email</th><th>Plan</th><th>Status</th><th>Verified</th><th>Joined</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((u) => (
            <tr key={u._id} className="admin-row-link">
              <td onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" checked={selected.has(u._id)} onChange={() => toggle(u._id)} />
              </td>
              <td onClick={() => navigate(`/admin/users/${u._id}`)}>
                <div className="admin-user-cell">
                  {u.profilePhoto ? <img src={u.profilePhoto} alt="" /> : <span className="admin-avatar-fallback">{(u.name || '?')[0]}</span>}
                  <div>
                    <div className="admin-user-name">{u.name}</div>
                    <div className="admin-user-handle">@{u.username}</div>
                  </div>
                </div>
              </td>
              <td onClick={() => navigate(`/admin/users/${u._id}`)}>{u.email}</td>
              <td onClick={() => navigate(`/admin/users/${u._id}`)}><span className={`admin-pill ${u.plan === 'premium' ? 'admin-pill-gold' : ''}`}>{u.plan}</span></td>
              <td onClick={() => navigate(`/admin/users/${u._id}`)}><span className={`admin-pill ${u.isActive ? 'admin-pill-green' : 'admin-pill-red'}`}>{u.isActive ? 'active' : 'banned'}</span></td>
              <td onClick={() => navigate(`/admin/users/${u._id}`)}>{u.isVerified ? '✓' : '—'}</td>
              <td onClick={() => navigate(`/admin/users/${u._id}`)}>{new Date(u.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
          {!loading && data.items.length === 0 && <tr><td colSpan={7} className="admin-empty">No users found</td></tr>}
        </tbody>
      </table>

      <div className="admin-pager">
        <button className="admin-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
        <span>Page {data.page} of {data.pages || 1}</span>
        <button className="admin-btn" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>
    </div>
  );
};

export default AdminUsers;
