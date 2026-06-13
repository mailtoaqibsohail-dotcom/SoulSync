import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import adminApi from '../adminApi';

const ACTION_LABELS = {
  ban: 'Banned', unban: 'Reactivated', verify: 'Verified', unverify: 'Unverified',
  set_plan: 'Changed plan', edit_profile: 'Edited profile', edit_settings: 'Edited settings',
  delete_user: 'Deleted user', add_note: 'Added note', remove_photo: 'Removed photo',
  resolve_report: 'Updated report', bulk_ban: 'Bulk banned', bulk_unban: 'Bulk reactivated',
  bulk_verify: 'Bulk verified', bulk_unverify: 'Bulk unverified',
};

const AdminAudit = () => {
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const { data } = await adminApi.get('/api/admin/audit', { params: { page, limit: 40 } });
      setData(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load audit log');
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <h1 className="admin-h1">Audit log <span className="admin-count">{data.total}</span></h1>
      <p className="admin-hint" style={{ marginTop: -8, marginBottom: 16 }}>Every mutating admin action, newest first.</p>
      {error && <div className="admin-error">{error}</div>}

      <table className="admin-table">
        <thead>
          <tr><th>When</th><th>Admin</th><th>Action</th><th>Target</th><th>Details</th></tr>
        </thead>
        <tbody>
          {data.items.map((a) => (
            <tr key={a._id}>
              <td>{new Date(a.createdAt).toLocaleString()}</td>
              <td>{a.adminEmail}</td>
              <td><span className="admin-pill">{ACTION_LABELS[a.action] || a.action}</span></td>
              <td>
                {a.targetType === 'user' && a.targetId
                  ? <Link className="admin-link" to={`/admin/users/${a.targetId}`}>{a.targetLabel || 'user'}</Link>
                  : (a.targetLabel || a.targetType)}
              </td>
              <td className="admin-details-cell">{a.details && Object.keys(a.details).length ? JSON.stringify(a.details) : '—'}</td>
            </tr>
          ))}
          {data.items.length === 0 && <tr><td colSpan={5} className="admin-empty">No actions logged yet</td></tr>}
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

export default AdminAudit;
