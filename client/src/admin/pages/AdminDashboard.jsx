import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import adminApi from '../adminApi';

const StatCard = ({ label, value, accent }) => (
  <div className={`admin-stat ${accent ? 'admin-stat-accent' : ''}`}>
    <div className="admin-stat-value">{value ?? '—'}</div>
    <div className="admin-stat-label">{label}</div>
  </div>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.get('/api/admin/stats')
      .then(({ data }) => setStats(data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load stats'));
  }, []);

  return (
    <div>
      <h1 className="admin-h1">Dashboard</h1>
      {error && <div className="admin-error">{error}</div>}

      <h2 className="admin-h2">Users</h2>
      <div className="admin-stat-grid">
        <StatCard label="Total users" value={stats?.users.total} />
        <StatCard label="Active" value={stats?.users.active} />
        <StatCard label="Online now" value={stats?.users.online} accent />
        <StatCard label="Verified" value={stats?.users.verified} />
        <StatCard label="New today" value={stats?.users.newToday} />
        <StatCard label="New (7 days)" value={stats?.users.new7d} />
      </div>

      <h2 className="admin-h2">Plans</h2>
      <div className="admin-stat-grid">
        <StatCard label="Free" value={stats?.plans.free} />
        <StatCard label="Premium" value={stats?.plans.premium} accent />
      </div>

      <h2 className="admin-h2">Activity</h2>
      <div className="admin-stat-grid">
        <StatCard label="Matches" value={stats?.matches} />
        <StatCard label="Swipes" value={stats?.swipes} />
        <StatCard label="Messages" value={stats?.messages} />
        <StatCard label="Pending reports" value={stats?.pendingReports} accent />
      </div>

      <div style={{ marginTop: 24 }}>
        <Link className="admin-btn" to="/admin/users">Manage users →</Link>{' '}
        <Link className="admin-btn" to="/admin/reports">Review reports →</Link>
      </div>
    </div>
  );
};

export default AdminDashboard;
