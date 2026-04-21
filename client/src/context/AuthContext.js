import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

// Axios defaults
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('datingapp_token'));
  const [loading, setLoading] = useState(true);

  // Attach token to every request
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      if (!token) { setLoading(false); return; }
      try {
        const { data } = await axios.get('/api/auth/me');
        setUser(data.user);
      } catch {
        localStorage.removeItem('datingapp_token');
        setToken(null);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [token]);

  const login = useCallback(async (identifier, password) => {
    const { data } = await axios.post('/api/auth/login', { identifier, password });
    // New signups that haven't finished OTP get { requiresVerification: true, email }
    // — no token, so skip the token/user setup and let the caller redirect.
    if (data.requiresVerification) return data;
    localStorage.setItem('datingapp_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (formData) => {
    const { data } = await axios.post('/api/auth/register', formData);
    // Register now requires OTP — no token until /verify-otp succeeds.
    if (data.requiresVerification) return data;
    if (data.token) {
      localStorage.setItem('datingapp_token', data.token);
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  }, []);

  const verifyOtp = useCallback(async (email, code) => {
    const { data } = await axios.post('/api/auth/verify-otp', { email, code });
    localStorage.setItem('datingapp_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const resendOtp = useCallback(async (email) => {
    const { data } = await axios.post('/api/auth/resend-otp', { email });
    return data;
  }, []);

  const forgotPassword = useCallback(async (email) => {
    const { data } = await axios.post('/api/auth/forgot-password', { email });
    return data;
  }, []);

  const resetPassword = useCallback(async (email, code, newPassword) => {
    const { data } = await axios.post('/api/auth/reset-password', { email, code, newPassword });
    return data;
  }, []);

  const requestDeleteOtp = useCallback(async () => {
    const { data } = await axios.post('/api/auth/request-delete-otp');
    return data;
  }, []);

  const deleteAccount = useCallback(async ({ password, code } = {}) => {
    await axios.delete('/api/auth/delete-account', { data: { password, code } });
    localStorage.removeItem('datingapp_token');
    setToken(null);
    setUser(null);
  }, []);

  const logout = useCallback(async () => {
    try { await axios.post('/api/auth/logout'); } catch {}
    localStorage.removeItem('datingapp_token');
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => ({ ...prev, ...updates }));
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser, verifyOtp, resendOtp, forgotPassword, resetPassword, deleteAccount, requestDeleteOtp }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
