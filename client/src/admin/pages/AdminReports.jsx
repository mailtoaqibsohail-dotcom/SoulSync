import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import adminApi from '../adminApi';

const STATUSES = ['pending', 'reviewed', 'dismissed', 'actioned'];

const AdminReports = () => {
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const params = { page, limit: 25 };
      if (status) params.status = status;
      const { data } = await adminApi.get('/api/admin/reports', { params });
      setData(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reports');
    }
  }, [page, status]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (reportId, newStatus) => {
    try {
      await adminApi.patch(`/api/admin/reports/${reportId}`, { status: newStatus });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    }
  };

  return (
    <div>
      <h1 className="admin-h1">Reports <span className="admin-count">{data.total}</span></h1>
      {error && <div className="admin-error">{error}</div>}

      <div className="admin-toolbar">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <table className="admin-table">
        <thead>
          <tr><th>Reported</th><th>Reporter</th><th>Reason</th><th>Details</th><th>When</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          {data.items.map((r) => (
            <tr key={r._id}>
              <td>{r.reported
                ? <Link to={`/admin/users/${r.reported._id}`} className="admin-link">{r.reported.name} @{r.reported.username}</Link>
                : <span className="admin-user-handle">deleted</span>}</td>
              <td>{r.reporter ? `${r.reporter.name} @${r.reporter.username}` : 'deleted'}</td>
              <td><span className="admin-pill">{r.reason}</span></td>
              <td className="admin-details-cell">{r.details || '—'}</td>
              <td>{new Date(r.createdAt).toLocaleDateString()}</td>
              <td><span className={`admin-pill admin-pill-${r.status}`}>{r.status}</span></td>
              <td>
                <select value={r.status} onChange={(e) => updateStatus(r._id, e.target.value)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
            </tr>
          ))}
          {data.items.length === 0 && <tr><td colSpan={7} className="admin-empty">No reports</td></tr>}
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

export default AdminReports;
