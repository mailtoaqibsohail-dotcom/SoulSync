import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import '../components/Logo.css';
import './Auth.css';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState(location.state?.info || '');
  const [loading, setLoading] = useState(false);

  // Clear the "password reset" success flash once the user has seen it, so it
  // doesn't persist across re-renders or back navigations.
  useEffect(() => {
    if (location.state?.info) {
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

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
        {info && <div className="auth-info">{info}</div>}

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

        <p className="auth-switch" style={{ marginTop: 12 }}>
          <Link to="/forgot-password">Forgot password?</Link>
        </p>

        <p className="auth-switch">
          Don't have an account? <Link to="/register">Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
