import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import '../components/Logo.css';
import './Auth.css';

// Step 1: user enters their email. We call /forgot-password which emails a
// 6-digit code, then send them to /reset-password to complete the reset.
const ForgotPassword = () => {
  const { forgotPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      // Backend always 200s (doesn't reveal whether email exists); jump to
      // reset page regardless. If no code arrives, user can hit "Resend".
      navigate('/reset-password', { state: { email: email.trim().toLowerCase() } });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset code. Try again.');
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
        <h1 className="auth-title">Forgot password</h1>
        <p className="auth-subtitle">
          Enter the email on your account and we'll send you a 6-digit code.
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email</label>
            <input
              className="input-field"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send reset code'}
          </button>
        </form>

        <p className="auth-switch">
          <Link to="/login">← Back to login</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
