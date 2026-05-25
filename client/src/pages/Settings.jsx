import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
  FiArrowLeft,
  FiBell,
  FiEye,
  FiClock,
  FiCheckSquare,
  FiLock,
  FiSlash,
  FiSliders,
  FiFileText,
  FiShield,
  FiLogOut,
  FiTrash2,
  FiChevronRight,
  FiX,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import './Settings.css';

// Build-time version stamp so support requests can include "I'm on x.y.z".
const APP_VERSION = process.env.REACT_APP_VERSION || '1.0.0';

const Settings = () => {
  const { user, updateUser, logout, requestDeleteOtp, deleteAccount } = useAuth();
  const navigate = useNavigate();

  // Local optimistic copy of settings — flipping a toggle updates this
  // immediately while the PATCH is in flight, so the UI never feels laggy.
  const initial = user?.settings || {};
  const [settings, setSettings] = useState({
    notificationsEnabled: initial.notificationsEnabled ?? true,
    showOnlineStatus: initial.showOnlineStatus ?? true,
    showLastSeen: initial.showLastSeen ?? true,
    readReceipts: initial.readReceipts ?? true,
  });
  const [savingKey, setSavingKey] = useState(null);

  const saveOne = async (key, value) => {
    const prev = settings[key];
    setSettings((s) => ({ ...s, [key]: value }));
    setSavingKey(key);
    try {
      const { data } = await axios.patch('/api/users/profile', {
        settings: { ...settings, [key]: value },
      });
      if (data.user) updateUser(data.user);
    } catch (err) {
      // Roll back on failure.
      setSettings((s) => ({ ...s, [key]: prev }));
      alert(err.response?.data?.message || 'Failed to update setting');
    } finally {
      setSavingKey(null);
    }
  };

  // Change-password modal state.
  const [pwOpen, setPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwErr, setPwErr] = useState('');
  const [pwOk, setPwOk] = useState('');

  const submitPasswordChange = async (e) => {
    e.preventDefault();
    setPwErr('');
    setPwOk('');
    if (pwForm.next.length < 6) {
      setPwErr('New password must be at least 6 characters');
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwErr('Passwords don\'t match');
      return;
    }
    setPwBusy(true);
    try {
      await axios.patch('/api/auth/update-password', {
        currentPassword: pwForm.current,
        newPassword: pwForm.next,
      });
      setPwOk('Password updated');
      setPwForm({ current: '', next: '', confirm: '' });
      setTimeout(() => setPwOpen(false), 1200);
    } catch (err) {
      setPwErr(err.response?.data?.message || 'Failed to update password');
    } finally {
      setPwBusy(false);
    }
  };

  // Delete-account flow: request OTP → enter code + password → confirm.
  const [delOpen, setDelOpen] = useState(false);
  const [delStep, setDelStep] = useState('confirm'); // 'confirm' | 'verify'
  const [delPassword, setDelPassword] = useState('');
  const [delCode, setDelCode] = useState('');
  const [delBusy, setDelBusy] = useState(false);
  const [delErr, setDelErr] = useState('');

  const startDelete = async () => {
    setDelErr('');
    setDelBusy(true);
    try {
      await requestDeleteOtp();
      setDelStep('verify');
    } catch (err) {
      setDelErr(err.response?.data?.message || 'Failed to start deletion');
    } finally {
      setDelBusy(false);
    }
  };

  const confirmDelete = async (e) => {
    e.preventDefault();
    setDelErr('');
    setDelBusy(true);
    try {
      await deleteAccount({ password: delPassword, code: delCode });
      navigate('/login');
    } catch (err) {
      setDelErr(err.response?.data?.message || 'Failed to delete account');
    } finally {
      setDelBusy(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Reusable row renderers — keep markup DRY and consistent.
  const ToggleRow = ({ icon: Icon, title, hint, k }) => (
    <div className="settings-row">
      <div className="settings-row__icon"><Icon size={18} /></div>
      <div className="settings-row__body">
        <div className="settings-row__title">{title}</div>
        {hint && <div className="settings-row__hint">{hint}</div>}
      </div>
      <label className="switch">
        <input
          type="checkbox"
          checked={!!settings[k]}
          disabled={savingKey === k}
          onChange={(e) => saveOne(k, e.target.checked)}
        />
        <span className="slider-toggle" />
      </label>
    </div>
  );

  const LinkRow = ({ icon: Icon, title, hint, onClick, to, danger }) => {
    const inner = (
      <>
        <div className="settings-row__icon"><Icon size={18} /></div>
        <div className="settings-row__body">
          <div className={`settings-row__title ${danger ? 'danger' : ''}`}>{title}</div>
          {hint && <div className="settings-row__hint">{hint}</div>}
        </div>
        <FiChevronRight size={18} className="settings-row__chev" />
      </>
    );
    if (to) {
      return <Link to={to} className="settings-row clickable">{inner}</Link>;
    }
    return (
      <button type="button" className="settings-row clickable" onClick={onClick}>
        {inner}
      </button>
    );
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <button className="settings-back" onClick={() => navigate(-1)} aria-label="Back">
          <FiArrowLeft size={20} />
        </button>
        <h2>Settings</h2>
        <div style={{ width: 36 }} />
      </div>

      <div className="settings-body">

        {/* Account ───────────────── */}
        <section className="settings-section">
          <h3 className="settings-section__title">Account</h3>
          <div className="settings-row">
            <div className="settings-row__icon">@</div>
            <div className="settings-row__body">
              <div className="settings-row__title">Email</div>
              <div className="settings-row__hint">{user?.email || '—'}</div>
            </div>
          </div>
          <LinkRow
            icon={FiLock}
            title="Change password"
            hint="Use a strong password you don't use elsewhere"
            onClick={() => { setPwErr(''); setPwOk(''); setPwOpen(true); }}
          />
        </section>

        {/* Notifications ─────────── */}
        <section className="settings-section">
          <h3 className="settings-section__title">Notifications</h3>
          <ToggleRow
            icon={FiBell}
            title="Push notifications"
            hint="Get pinged for new messages, matches, and sparks"
            k="notificationsEnabled"
          />
        </section>

        {/* Privacy ────────────────── */}
        <section className="settings-section">
          <h3 className="settings-section__title">Privacy</h3>
          <ToggleRow
            icon={FiEye}
            title="Show online status"
            hint="Others can see when you're active"
            k="showOnlineStatus"
          />
          <ToggleRow
            icon={FiClock}
            title="Show last seen"
            hint="Display when you were last active on your profile"
            k="showLastSeen"
          />
          <ToggleRow
            icon={FiCheckSquare}
            title="Read receipts"
            hint="Let matches see when you've read their messages"
            k="readReceipts"
          />
          <LinkRow
            icon={FiSlash}
            title="Blocked users"
            hint="Manage who can't see you or message you"
            to="/profile/me"
          />
        </section>

        {/* Discovery ──────────────── */}
        <section className="settings-section">
          <h3 className="settings-section__title">Discovery</h3>
          <LinkRow
            icon={FiSliders}
            title="Age, distance & preferences"
            hint="Tune who shows up on Discover"
            to="/profile/me"
          />
        </section>

        {/* Legal ──────────────────── */}
        <section className="settings-section">
          <h3 className="settings-section__title">Legal</h3>
          <LinkRow icon={FiFileText} title="Terms of Service" to="/terms" />
          <LinkRow icon={FiShield} title="Privacy Policy" to="/privacy" />
        </section>

        {/* Account actions ──────── */}
        <section className="settings-section">
          <LinkRow
            icon={FiLogOut}
            title="Sign out"
            onClick={handleLogout}
          />
          <LinkRow
            icon={FiTrash2}
            title="Delete account"
            hint="Permanently remove your account and data"
            onClick={() => { setDelErr(''); setDelStep('confirm'); setDelPassword(''); setDelCode(''); setDelOpen(true); }}
            danger
          />
        </section>

        <div className="settings-version">Spark v{APP_VERSION}</div>
      </div>

      {/* ── Change password modal ── */}
      {pwOpen && (
        <div className="settings-modal-backdrop" onClick={() => setPwOpen(false)}>
          <form className="settings-modal" onClick={(e) => e.stopPropagation()} onSubmit={submitPasswordChange}>
            <div className="settings-modal__header">
              <h3>Change password</h3>
              <button type="button" className="settings-modal__close" onClick={() => setPwOpen(false)} aria-label="Close">
                <FiX size={20} />
              </button>
            </div>
            <input
              type="password"
              placeholder="Current password"
              value={pwForm.current}
              onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
              required
              autoComplete="current-password"
            />
            <input
              type="password"
              placeholder="New password (min 6 chars)"
              value={pwForm.next}
              onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
              required
              autoComplete="new-password"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={pwForm.confirm}
              onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
              required
              autoComplete="new-password"
            />
            {pwErr && <div className="settings-modal__err">{pwErr}</div>}
            {pwOk && <div className="settings-modal__ok">{pwOk}</div>}
            <button type="submit" className="btn-primary" disabled={pwBusy}>
              {pwBusy ? 'Saving…' : 'Update password'}
            </button>
          </form>
        </div>
      )}

      {/* ── Delete account modal ── */}
      {delOpen && (
        <div className="settings-modal-backdrop" onClick={() => setDelOpen(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal__header">
              <h3 className="danger">Delete account</h3>
              <button type="button" className="settings-modal__close" onClick={() => setDelOpen(false)} aria-label="Close">
                <FiX size={20} />
              </button>
            </div>

            {delStep === 'confirm' ? (
              <>
                <p className="settings-modal__copy">
                  This permanently removes your profile, photos, matches, and
                  messages. <strong>This can't be undone.</strong>
                </p>
                <p className="settings-modal__copy">
                  We'll email you a 6-digit code to confirm.
                </p>
                {delErr && <div className="settings-modal__err">{delErr}</div>}
                <div className="settings-modal__actions">
                  <button className="btn-outline" onClick={() => setDelOpen(false)}>Cancel</button>
                  <button className="btn-danger" onClick={startDelete} disabled={delBusy}>
                    {delBusy ? 'Sending…' : 'Send confirmation code'}
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={confirmDelete}>
                <p className="settings-modal__copy">
                  Enter the 6-digit code we just emailed you, plus your password.
                </p>
                <input
                  type="text"
                  placeholder="6-digit code"
                  value={delCode}
                  onChange={(e) => setDelCode(e.target.value)}
                  maxLength={6}
                  required
                />
                <input
                  type="password"
                  placeholder="Your password"
                  value={delPassword}
                  onChange={(e) => setDelPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                {delErr && <div className="settings-modal__err">{delErr}</div>}
                <button type="submit" className="btn-danger" disabled={delBusy}>
                  {delBusy ? 'Deleting…' : 'Delete my account permanently'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
