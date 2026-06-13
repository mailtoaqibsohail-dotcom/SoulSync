import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminProvider } from './AdminContext';
import AdminRoute from './AdminRoute';
import AdminLayout from './AdminLayout';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminUserDetail from './pages/AdminUserDetail';
import AdminReports from './pages/AdminReports';
import './admin.css';

// Self-contained admin app. Rendered only for /admin/* paths (see App.js),
// wrapped in its own AdminProvider — completely separate from the dating-app
// user providers and token.
const Protected = ({ children }) => (
  <AdminRoute><AdminLayout>{children}</AdminLayout></AdminRoute>
);

const AdminApp = () => (
  <AdminProvider>
    <Routes>
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<Protected><AdminDashboard /></Protected>} />
      <Route path="/admin/users" element={<Protected><AdminUsers /></Protected>} />
      <Route path="/admin/users/:id" element={<Protected><AdminUserDetail /></Protected>} />
      <Route path="/admin/reports" element={<Protected><AdminReports /></Protected>} />
      <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
    </Routes>
  </AdminProvider>
);

export default AdminApp;
