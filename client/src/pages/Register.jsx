import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const GENDERS = ['man', 'woman', 'non-binary', 'other'];
const INTERESTS = ['men', 'women', 'everyone'];

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // multi-step form
  const [form, setForm] = useState({
    name: '', username: '', email: '', phone: '',
    password: '', confirmPassword: '',
    dateOfBirth: '', gender: '', interestedIn: ['everyone'],
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const validateStep1 = () => {
    if (!form.name || !form.username || !form.email || !form.password) {
      setError('All fields marked * are required'); return false;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match'); return false;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters'); return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!form.dateOfBirth || !form.gender) {
      setError('Please fill in all fields'); return false;
    }
    const age = Math.floor((Date.now() - new Date(form.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 18) { setError('You must be at least 18 years old'); return false; }
    return true;
  };

  const nextStep = () => {
    setError('');
    if (step === 1 && !validateStep1()) return;
    setStep(step + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateStep2()) return;
    setLoading(true);
    try {
      await register(form);
      navigate('/setup-profile');
    } catch (err) {
      const msg = err.response?.data?.message
        || err.response?.data?.errors?.[0]?.msg
        || 'Registration failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="auth-logo">
          <span className="gradient-text">💫 Spark</span>
        </div>

        {/* Step indicator */}
        <div className="auth-steps">
          <div className={`auth-step ${step >= 1 ? 'active' : ''}`}>1</div>
          <div className="auth-step-line" />
          <div className={`auth-step ${step >= 2 ? 'active' : ''}`}>2</div>
        </div>

        <h1 className="auth-title">{step === 1 ? 'Create account' : 'About you'}</h1>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={step === 2 ? handleSubmit : (e) => { e.preventDefault(); nextStep(); }} className="auth-form">
          {step === 1 && (
            <>
              <div className="form-group">
                <label>Full name *</label>
                <input className="input-field" placeholder="Your name" value={form.name} onChange={set('name')} />
              </div>
              <div className="form-group">
                <label>Username *</label>
                <input className="input-field" placeholder="@username" value={form.username} onChange={set('username')} />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input className="input-field" type="email" placeholder="email@example.com" value={form.email} onChange={set('email')} />
              </div>
              <div className="form-group">
                <label>Phone (optional)</label>
                <input className="input-field" type="tel" placeholder="+44 7700 000000" value={form.phone} onChange={set('phone')} />
              </div>
              <div className="form-group">
                <label>Password *</label>
                <input className="input-field" type="password" placeholder="Min. 6 characters" value={form.password} onChange={set('password')} />
              </div>
              <div className="form-group">
                <label>Confirm password *</label>
                <input className="input-field" type="password" placeholder="Repeat password" value={form.confirmPassword} onChange={set('confirmPassword')} />
              </div>
              <button className="btn-primary" type="submit">Continue</button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="form-group">
                <label>Date of birth *</label>
                <input className="input-field" type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
              </div>
              <div className="form-group">
                <label>I am *</label>
                <div className="btn-group">
                  {GENDERS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      className={`btn-toggle ${form.gender === g ? 'active' : ''}`}
                      onClick={() => setForm({ ...form, gender: g })}
                    >
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Interested in *</label>
                <div className="btn-group">
                  {INTERESTS.map((i) => (
                    <button
                      key={i}
                      type="button"
                      className={`btn-toggle ${form.interestedIn.includes(i) ? 'active' : ''}`}
                      onClick={() => setForm({ ...form, interestedIn: [i] })}
                    >
                      {i.charAt(0).toUpperCase() + i.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
              <button type="button" className="btn-outline" style={{ marginTop: 10 }} onClick={() => setStep(1)}>
                Back
              </button>
            </>
          )}
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>

        <p className="auth-terms">
          By registering you agree to our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
