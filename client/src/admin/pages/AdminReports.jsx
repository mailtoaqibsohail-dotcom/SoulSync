import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import adminApi from '../adminApi';

const STATUSES = ['pending', 'reviewed', 'dismissed', 'actioned'];

const AdminReports = () => {
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null); // { report, recentMessages }
  const [busy, setBusy] = useState(false);

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

  const openDetail = async (id) => {
    setBusy(true);
    try {
      const { data } = await adminApi.get(`/api/admin/reports/${id}`);
      setDetail(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load report');
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (reportId, newStatus) => {
    try {
      await adminApi.patch(`/api/admin/reports/${reportId}`, { status: newStatus });
      load();
      if (detail?.report?._id === reportId) setDetail((d) => ({ ...d, report: { ...d.report, status: newStatus } }));
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    }
  };

  const banReported = async () => {
    const r = detail?.report?.reported;
    if (!r?._id) return;
    const reason = window.prompt(`Ban ${r.name}? Reason (optional):`, `Reported: ${detail.report.reason}`);
    if (reason === null) return;
    setBusy(true);
    try {
      await adminApi.patch(`/api/admin/users/${r._id}`, { isActive: false, banReason: reason });
      await updateStatus(detail.report._id, 'actioned');
      setDetail((d) => ({ ...d, report: { ...d.report, reported: { ...d.report.reported, isActive: false } } }));
    } catch (err) {
      setError(err.response?.data?.message || 'Ban failed');
    } finally {
      setBusy(false);
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
          <tr><th>Reported</th><th>Reporter</th><th>Reason</th><th>When</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          {data.items.map((r) => (
            <tr key={r._id} className="admin-row-link" onClick={() => openDetail(r._id)}>
              <td>{r.reported ? `${r.reported.name} @${r.reported.username}` : <span className="admin-user-handle">deleted</span>}</td>
              <td>{r.reporter ? `${r.reporter.name} @${r.reporter.username}` : 'deleted'}</td>
              <td><span className="admin-pill">{r.reason}</span></td>
              <td>{new Date(r.createdAt).toLocaleDateString()}</td>
              <td><span className={`admin-pill admin-pill-${r.status}`}>{r.status}</span></td>
              <td onClick={(e) => e.stopPropagation()}>
                <button className="admin-btn" onClick={() => openDetail(r._id)}>Review</button>
              </td>
            </tr>
          ))}
          {data.items.length === 0 && <tr><td colSpan={6} className="admin-empty">No reports</td></tr>}
        </tbody>
      </table>

      <div className="admin-pager">
        <button className="admin-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
        <span>Page {data.page} of {data.pages || 1}</span>
        <button className="admin-btn" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>

      {detail && (
        <div className="admin-modal-backdrop" onClick={() => setDetail(null)}>
          <div className="admin-modal admin-modal-wide" onClick={(e) => e.stopPropagation()}>
            <h3>Report — {detail.report.reason}</h3>
            <div className="admin-report-meta">
              <span className={`admin-pill admin-pill-${detail.report.status}`}>{detail.report.status}</span>
              <span className="admin-hint">{new Date(detail.report.createdAt).toLocaleString()}</span>
            </div>

            {detail.report.details && <p className="admin-report-details">"{detail.report.details}"</p>}

            <div className="admin-report-parties">
              <div>
                <div className="admin-kv-label">Reported user</div>
                {detail.report.reported ? (
                  <>
                    <Link className="admin-link" to={`/admin/users/${detail.report.reported._id}`}>
                      {detail.report.reported.name} @{detail.report.reported.username}
                    </Link>
                    <div className="admin-hint">{detail.report.reported.email} · {detail.report.reported.isActive ? 'active' : 'banned'}</div>
                  </>
                ) : <span className="admin-user-handle">deleted</span>}
              </div>
              <div>
                <div className="admin-kv-label">Reporter</div>
                {detail.report.reporter ? `${detail.report.reporter.name} @${detail.report.reporter.username}` : 'deleted'}
              </div>
            </div>

            {detail.report.reported?.photos?.length > 0 && (
              <>
                <div className="admin-kv-label" style={{ marginTop: 12 }}>Their photos</div>
                <div className="admin-photo-row">
                  {detail.report.reported.photos.map((p) => <img key={p} src={p} alt="" className="admin-photo-thumb" />)}
                </div>
              </>
            )}

            <div className="admin-kv-label" style={{ marginTop: 12 }}>Their recent messages</div>
            <div className="admin-msg-list">
              {detail.recentMessages.length ? detail.recentMessages.map((m) => (
                <div key={m._id} className="admin-msg">
                  <span className="admin-hint">{new Date(m.createdAt).toLocaleString()}</span>
                  <span>{m.text || `[${m.mediaType || 'media'}]`}</span>
                </div>
              )) : <div className="admin-empty">No messages</div>}
            </div>

            <div className="admin-actions" style={{ marginTop: 16 }}>
              <button className="admin-btn admin-btn-danger" disabled={busy || !detail.report.reported} onClick={banReported}>Ban reported user</button>
              <button className="admin-btn" disabled={busy} onClick={() => updateStatus(detail.report._id, 'reviewed')}>Mark reviewed</button>
              <button className="admin-btn" disabled={busy} onClick={() => updateStatus(detail.report._id, 'dismissed')}>Dismiss</button>
              <button className="admin-btn" onClick={() => setDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReports;
