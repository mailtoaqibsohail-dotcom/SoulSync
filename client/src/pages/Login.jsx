import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import '../components/Logo.css';
import './Auth.css';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(form.identifier, form.password);
      if (result?.requiresVerification) {
        navigate('/verify-otp', { state: { email: result.email } });
        return;
      }
      navigate('/discover');
    } catch (err) {
      // Surface the real cause instead of swallowing it under a generic message.
      // 401 → wrong creds. Network/offline → no err.response. 5xx → server error.
      let msg;
      if (err.response?.data?.message) {
        msg = err.response.data.message;
      } else if (err.response?.status) {
        msg = `Server error (${err.response.status}). Please try again.`;
      } else if (err.code === 'ERR_NETWORK' || err.message?.includes('Network')) {
        msg = 'Cannot reach server. Check your internet connection.';
      } else {
        msg = err.message || 'Login failed. Please try again.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="auth-logo">
          <Logo size={44} />
        </div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to continue</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email, username or phone</label>
            <input
              className="input-field"
              type="text"
              placeholder="Enter email, username or phone"
              value={form.identifier}
              onChange={(e) => setForm({ ...form, identifier: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              className="input-field"
              type="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account? <Link to="/register">Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
