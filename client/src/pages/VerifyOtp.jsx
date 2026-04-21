import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import '../components/Logo.css';
import './Auth.css';

// 6-digit email verification screen. Reached after register or after a login
// that returned { requiresVerification: true }.
const VerifyOtp = () => {
  const { verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputsRef = useRef([]);

  useEffect(() => {
    // If someone navigated here directly without an email in state, bounce
    // them back to login — we can't verify without knowing who.
    if (!email) navigate('/login', { replace: true });
  }, [email, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleChange = (idx, value) => {
    const v = value.replace(/\D/g, '').slice(-1); // keep only last typed digit
    const next = [...digits];
    next[idx] = v;
    setDigits(next);
    if (v && idx < 5) inputsRef.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    inputsRef.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length !== 6) {
      setError('Enter all 6 digits');
      return;
    }
    setError('');
    setInfo('');
    setLoading(true);
    try {
      await verifyOtp(email, code);
      navigate('/discover');
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError('');
    setInfo('');
    try {
      await resendOtp(email);
      setInfo('A new code has been sent.');
      setCooldown(30);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="auth-logo">
          <Logo size={44} />
        </div>
        <h1 className="auth-title">Verify your email</h1>
        <p className="auth-subtitle">
          We sent a 6-digit code to <strong>{email}</strong>
        </p>

        {error && <div className="auth-error">{error}</div>}
        {info && <div className="auth-info">{info}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div
            className="otp-row"
            style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '16px 0' }}
          >
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (inputsRef.current[i] = el)}
                type="tel"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                className="input-field"
                style={{
                  width: 44,
                  height: 54,
                  textAlign: 'center',
                  fontSize: 24,
                  fontWeight: 700,
                }}
                autoFocus={i === 0}
              />
            ))}
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>

        <p className="auth-switch">
          Didn't get a code?{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0}
            style={{
              background: 'none',
              border: 'none',
              color: cooldown > 0 ? '#888' : '#fd5068',
              cursor: cooldown > 0 ? 'default' : 'pointer',
              padding: 0,
              font: 'inherit',
            }}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend'}
          </button>
        </p>

        <p className="auth-switch">
          <Link to="/login">← Back to login</Link>
        </p>
      </div>
    </div>
  );
};

export default VerifyOtp;
