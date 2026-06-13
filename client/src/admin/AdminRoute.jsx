import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdmin } from './AdminContext';

// Guards every admin page except the login screen.
const AdminRoute = ({ children }) => {
  const { admin, loading } = useAdmin();
  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner" />
      </div>
    );
  }
  return admin ? children : <Navigate to="/admin/login" replace />;
};

export default AdminRoute;
