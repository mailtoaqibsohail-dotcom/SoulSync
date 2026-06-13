import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAdmin } from './AdminContext';

const AdminLayout = ({ children }) => {
  const { admin, logout } = useAdmin();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">Spark <span>Admin</span></div>
        <nav className="admin-nav">
          <NavLink to="/admin" end className={({ isActive }) => (isActive ? 'active' : '')}>Dashboard</NavLink>
          <NavLink to="/admin/users" className={({ isActive }) => (isActive ? 'active' : '')}>Users</NavLink>
          <NavLink to="/admin/reports" className={({ isActive }) => (isActive ? 'active' : '')}>Reports</NavLink>
          <NavLink to="/admin/audit" className={({ isActive }) => (isActive ? 'active' : '')}>Audit log</NavLink>
        </nav>
        <div className="admin-sidebar-footer">
          <div className="admin-whoami">{admin?.email}</div>
          <button className="admin-logout" onClick={handleLogout}>Log out</button>
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
};

export default AdminLayout;
