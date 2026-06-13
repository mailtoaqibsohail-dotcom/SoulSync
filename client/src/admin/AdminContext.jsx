import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import adminApi, { ADMIN_TOKEN_KEY } from './adminApi';

const AdminContext = createContext(null);

export const AdminProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(ADMIN_TOKEN_KEY));
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(ADMIN_TOKEN_KEY)));

  // Revalidate the token on mount / when it changes.
  useEffect(() => {
    const load = async () => {
      if (!token) { setLoading(false); return; }
      try {
        const { data } = await adminApi.get('/api/admin/auth/me');
        setAdmin(data.admin);
      } catch {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        setToken(null);
        setAdmin(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const login = useCallback(async (email, password) => {
    const { data } = await adminApi.post('/api/admin/auth/login', { email, password });
    localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
    setToken(data.token);
    setAdmin(data.admin);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setToken(null);
    setAdmin(null);
  }, []);

  return (
    <AdminContext.Provider value={{ admin, token, loading, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside AdminProvider');
  return ctx;
};
