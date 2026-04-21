import React, { useState, useRef, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiCamera, FiEdit2, FiCheck, FiX, FiLogOut, FiUser, FiMapPin, FiHeart, FiSlash, FiTrash2, FiUpload, FiAlertTriangle } from 'react-icons/fi';
import { DEFAULT_AVATAR } from '../utils/defaults';
import { searchCities } from '../utils/pakistanCities';
import './MyProfile.css';

const GENDERS = ['man', 'woman', 'non-binary', 'other'];
const INTERESTS = ['men', 'women', 'everyone'];
const HOBBIES = ['Travel ✈️', 'Music 🎵', 'Fitness 💪', 'Cooking 🍳', 'Reading 📚', 'Gaming 🎮',
  'Art 🎨', 'Photography 📷', 'Hiking 🥾', 'Movies 🎬', 'Dancing 💃', 'Yoga 🧘',
  'Football ⚽', 'Coffee ☕', 'Dogs 🐶', 'Cats 🐱'];

const MAX_PHOTOS = 5;

const MyProfile = () => {
  const { user, updateUser, logout, requestDeleteOtp, deleteAccount } = useAuth();
  const navigate = useNavigate();

  // Delete-account modal state. Stage: 'confirm' → 'otp'.
  const [deleteModal, setDeleteModal] = useState(null); // null | 'confirm' | 'otp'
  const [deleteCode, setDeleteCode] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);

  const startDelete = async () => {
    setDeleteError('');
    setDeleteBusy(true);
    try {
      await requestDeleteOtp();
      setDeleteModal('otp');
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Could not send code');
    } finally {
      setDeleteBusy(false);
    }
  };

  const confirmDelete = async () => {
    setDeleteError('');
    if (!deleteCode.trim() || deleteCode.trim().length !== 6) {
      setDeleteError('Enter the 6-digit code we emailed you');
      return;
    }
    setDeleteBusy(true);
    try {
      await deleteAccount({ code: deleteCode.trim() });
      navigate('/login', { replace: true });
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Could not delete account');
    } finally {
      setDeleteBusy(false);
    }
  };
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    gender: user?.gender || '',
    interestedIn: user?.interestedIn || ['everyone'],
    hobbies: user?.hobbies || [],
    preferences: user?.preferences || { ageRange: { min: 18, max: 50 }, distance: 50 },
  });
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photos, setPhotos] = useState(user?.photos || []);
  const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || '');
  const [coverPhoto, setCoverPhoto] = useState(user?.coverPhoto || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const fileInputRef = useRef(null);
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  // Tap-to-zoom modal: 'avatar' | 'cover' | null
  const [photoModal, setPhotoModal] = useState(null);

  // Inline city editor state. Autocomplete mirrors the Discover filter —
  // pick from the Pakistani-cities list or type a free-form string.
  const [cityDraft, setCityDraft] = useState(user?.location?.city || '');
  const [cityFocus, setCityFocus] = useState(false);
  const citySuggestions = useMemo(
    () => (cityDraft.trim() ? searchCities(cityDraft) : []),
    [cityDraft]
  );
  const saveCity = async (value) => {
    setSaving(true);
    try {
      const { data } = await axios.patch('/api/users/location', { city: value.trim() });
      if (data.user) updateUser(data.user);
      else updateUser({ location: { ...(user?.location || {}), city: value.trim() } });
      setEditing(null);
    } catch {
      alert('Failed to save city');
    } finally {
      setSaving(false);
    }
  };

  // Camera-icon popover: lets the user upload a new avatar or remove the
  // current one (removal falls back to DEFAULT_AVATAR).
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef(null);
  useEffect(() => {
    if (!avatarMenuOpen) return;
    const onDoc = (e) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target)) {
        setAvatarMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [avatarMenuOpen]);

  const [blocked, setBlocked] = useState([]);
  const [blockedLoading, setBlockedLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/users/blocked')
      .then(({ data }) => setBlocked(data.blocked || []))
      .catch((err) => console.error('Load blocked error:', err))
      .finally(() => setBlockedLoading(false));
  }, []);

  const handleUnblock = async (userId, name) => {
    if (!window.confirm(`Unblock ${name}?`)) return;
    try {
      await axios.post(`/api/users/unblock/${userId}`);
      setBlocked((b) => b.filter((u) => u._id !== userId));
    } catch (err) {
      console.error('Unblock error:', err);
      alert('Could not unblock user');
    }
  };

  const age = user?.dateOfBirth
    ? Math.floor((Date.now() - new Date(user.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const save = async (fields) => {
    setSaving(true);
    try {
      const { data } = await axios.patch('/api/users/profile', fields);
      updateUser(data.user);
      setEditing(null);
    } catch (err) {
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    if (photos.length + files.length > MAX_PHOTOS) { alert(`Max ${MAX_PHOTOS} photos allowed`); return; }
    setUploadingPhoto(true);
    const formData = new FormData();
    files.forEach((f) => formData.append('photos', f));
    try {
      const { data } = await axios.post('/api/users/photos', formData);
      setPhotos(data.photos);
      updateUser({ photos: data.photos });
    } catch { alert('Photo upload failed'); }
    finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const fd = new FormData();
    fd.append('photo', file);
    try {
      const { data } = await axios.post('/api/users/profile-photo', fd);
      setProfilePhoto(data.user.profilePhoto || '');
      updateUser({ profilePhoto: data.user.profilePhoto });
      setPhotoModal(null);
    } catch {
      alert('Failed to update profile picture');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    const fd = new FormData();
    fd.append('photo', file);
    try {
      const { data } = await axios.post('/api/users/cover-photo', fd);
      setCoverPhoto(data.user.coverPhoto || '');
      updateUser({ coverPhoto: data.user.coverPhoto });
      setPhotoModal(null);
    } catch {
      alert('Failed to update cover photo');
    } finally {
      setUploadingCover(false);
      e.target.value = '';
    }
  };

  const deleteAvatar = async ({ confirm = true } = {}) => {
    if (confirm && !window.confirm('Remove profile picture? Your profile will show the default avatar until you upload a new one.')) return;
    try {
      await axios.patch('/api/users/profile', { profilePhoto: '' }).catch(() => {});
      setProfilePhoto('');
      updateUser({ profilePhoto: '' });
      setPhotoModal(null);
      setAvatarMenuOpen(false);
    } catch { alert('Failed to delete'); }
  };

  const deleteCover = async () => {
    if (!window.confirm('Delete cover photo?')) return;
    try {
      await axios.patch('/api/users/profile', { coverPhoto: '' }).catch(() => {});
      setCoverPhoto('');
      updateUser({ coverPhoto: '' });
      setPhotoModal(null);
    } catch { alert('Failed to delete'); }
  };

  const removePhoto = async (idx) => {
    try {
      const { data } = await axios.delete(`/api/users/photos/${idx}`);
      setPhotos(data.photos);
      updateUser({ photos: data.photos });
    } catch { alert('Failed to remove photo'); }
  };

  const toggleHobby = (h) => {
    const cur = form.hobbies || [];
    const next = cur.includes(h) ? cur.filter((x) => x !== h) : [...cur, h];
    setForm({ ...form, hobbies: next });
  };

  return (
    <div className="myprofile-page">

      {/* Cover */}
      <div className="myprofile-cover" onClick={() => coverPhoto && setPhotoModal('cover')} style={{ cursor: coverPhoto ? 'pointer' : 'default' }}>
        <img
          src={coverPhoto || '/placeholder.jpg'}
          alt="cover"
          className="myprofile-cover__img"
        />
        <div className="myprofile-cover__overlay" />
        {/* FIX: Explicit button + ref. The old <label> wrapper was swallowing
            clicks (parent's onClick fired .stopPropagation which in some
            browsers also kills the label→input activation). */}
        <button
          type="button"
          className="myprofile-cover__edit"
          onClick={(e) => {
            e.stopPropagation();
            coverInputRef.current?.click();
          }}
          disabled={uploadingCover}
        >
          <FiCamera size={18} />
          {uploadingCover ? 'Uploading...' : 'Change cover'}
        </button>
        <input
          type="file"
          ref={coverInputRef}
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleCoverUpload}
        />
      </div>

      {/* Avatar */}
      <div className="myprofile-avatar-row">
        <div className="myprofile-avatar-wrap" ref={avatarMenuRef}>
          <img
            src={profilePhoto || DEFAULT_AVATAR}
            alt={user?.name}
            className="myprofile-avatar"
            onClick={() => profilePhoto && setPhotoModal('avatar')}
            style={{ cursor: profilePhoto ? 'pointer' : 'default' }}
          />
          <button
            type="button"
            className="myprofile-avatar-edit"
            title="Change profile picture"
            aria-label="Change profile picture"
            onClick={(e) => {
              e.stopPropagation();
              setAvatarMenuOpen((v) => !v);
            }}
            disabled={uploadingAvatar}
          >
            <FiCamera size={14} />
          </button>
          {avatarMenuOpen && (
            <div className="myprofile-avatar-menu" role="menu">
              <button
                type="button"
                className="myprofile-avatar-menu__item"
                onClick={() => {
                  setAvatarMenuOpen(false);
                  avatarInputRef.current?.click();
                }}
              >
                <FiUpload size={15} />
                <span>{profilePhoto ? 'Upload new photo' : 'Add photo'}</span>
              </button>
              {profilePhoto && (
                <button
                  type="button"
                  className="myprofile-avatar-menu__item danger"
                  onClick={() => deleteAvatar({ confirm: false })}
                >
                  <FiTrash2 size={15} />
                  <span>Remove photo</span>
                </button>
              )}
            </div>
          )}
          <input
            type="file"
            ref={avatarInputRef}
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatarUpload}
          />
          {uploadingAvatar && <div className="myprofile-avatar-loading">Uploading…</div>}
        </div>
      </div>

      <div className="myprofile-body">

        {/* Name & age */}
        <div className="myprofile-section">
          <div className="myprofile-name-row">
            {editing === 'name' ? (
              <div className="myprofile-inline-edit">
                <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <button className="icon-btn green" onClick={() => save({ name: form.name })} disabled={saving}><FiCheck /></button>
                <button className="icon-btn red" onClick={() => setEditing(null)}><FiX /></button>
              </div>
            ) : (
              <>
                <h1>{user?.name}{age && <span className="myprofile-age">, {age}</span>}</h1>
                <button className="icon-btn" onClick={() => setEditing('name')}><FiEdit2 size={16} /></button>
              </>
            )}
          </div>
          <p className="myprofile-username">@{user?.username}</p>
          {/* City is derived from GPS (auto-updated via useAutoLocation). Not
              user-editable — Bumble-style always-live location. */}
          <p className="myprofile-location" title="Auto-detected from your device location">
            <FiMapPin size={13} />
            {user?.location?.city
              ? ` ${user.location.city}${user.location.country ? `, ${user.location.country}` : ''}`
              : ' Detecting location…'}
          </p>
        </div>

        <div className="myprofile-divider" />

        {/* Bio */}
        <div className="myprofile-section">
          <div className="myprofile-section__header">
            <h3><FiUser size={15} /> About me</h3>
            {editing !== 'bio' && <button className="icon-btn" onClick={() => setEditing('bio')}><FiEdit2 size={15} /></button>}
          </div>
          {editing === 'bio' ? (
            <div className="myprofile-edit-block">
              <textarea
                className="input-field"
                rows={4}
                maxLength={500}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Write something about yourself..."
              />
              <div className="myprofile-edit-actions">
                <button className="btn-primary" style={{ padding: '10px 20px' }} onClick={() => save({ bio: form.bio })} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button className="btn-outline" style={{ padding: '10px 20px' }} onClick={() => setEditing(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <p className="myprofile-bio">{user?.bio || <span className="muted">No bio yet — tap edit to add one</span>}</p>
          )}
        </div>

        <div className="myprofile-divider" />

        {/* Photos grid */}
        <div className="myprofile-section">
          <div className="myprofile-section__header">
            <h3><FiCamera size={15} /> My Photos ({photos.length}/{MAX_PHOTOS})</h3>
            {photos.length < MAX_PHOTOS && (
              <label className="icon-btn" title="Add photos">
                <FiCamera size={15} />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhoto}
                />
              </label>
            )}
          </div>
          <div className="myprofile-photo-grid">
            {photos.map((src, i) => (
              <div key={i} className="myprofile-photo-item">
                <img src={src} alt={`photo ${i}`} />
                <button className="photo-remove" onClick={() => removePhoto(i)}><FiX size={12} /></button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <label className="myprofile-photo-add">
                <FiCamera size={22} />
                <span>{uploadingPhoto ? 'Uploading...' : 'Add'}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhoto}
                />
              </label>
            )}
          </div>
        </div>

        <div className="myprofile-divider" />

        {/* Hobbies */}
        <div className="myprofile-section">
          <div className="myprofile-section__header">
            <h3>🎯 Hobbies & Interests</h3>
            {editing !== 'hobbies'
              ? <button className="icon-btn" onClick={() => setEditing('hobbies')}><FiEdit2 size={15} /></button>
              : <div style={{ display: 'flex', gap: 6 }}>
                  <button className="icon-btn green" onClick={() => save({ hobbies: form.hobbies })} disabled={saving}><FiCheck /></button>
                  <button className="icon-btn red" onClick={() => setEditing(null)}><FiX /></button>
                </div>
            }
          </div>
          <div className="hobby-chips">
            {editing === 'hobbies'
              ? HOBBIES.map((h) => (
                  <button key={h} className={`hobby-chip ${form.hobbies?.includes(h) ? 'active' : ''}`} onClick={() => toggleHobby(h)}>{h}</button>
                ))
              : (user?.hobbies?.length
                  ? user.hobbies.map((h) => <span key={h} className="hobby-chip active">{h}</span>)
                  : <span className="muted">No hobbies added yet</span>)
            }
          </div>
        </div>

        <div className="myprofile-divider" />

        {/* Identity & Preferences */}
        <div className="myprofile-section">
          <div className="myprofile-section__header">
            <h3><FiHeart size={15} /> Identity & Preferences</h3>
            {editing !== 'identity'
              ? <button className="icon-btn" onClick={() => setEditing('identity')}><FiEdit2 size={15} /></button>
              : <div style={{ display: 'flex', gap: 6 }}>
                  <button className="icon-btn green" onClick={() => save({ gender: form.gender, interestedIn: form.interestedIn })} disabled={saving}><FiCheck /></button>
                  <button className="icon-btn red" onClick={() => setEditing(null)}><FiX /></button>
                </div>
            }
          </div>
          <div className="myprofile-info-rows">
            <div className="myprofile-info-row">
              <span className="muted">I am</span>
              {editing === 'identity'
                ? <div className="btn-group">{GENDERS.map((g) => <button key={g} className={`btn-toggle ${form.gender === g ? 'active' : ''}`} onClick={() => setForm({ ...form, gender: g })}>{g}</button>)}</div>
                : <strong>{user?.gender || '—'}</strong>
              }
            </div>
            <div className="myprofile-info-row">
              <span className="muted">Interested in</span>
              {editing === 'identity'
                ? <div className="btn-group">{INTERESTS.map((i) => <button key={i} className={`btn-toggle ${form.interestedIn?.includes(i) ? 'active' : ''}`} onClick={() => setForm({ ...form, interestedIn: [i] })}>{i}</button>)}</div>
                : <strong>{user?.interestedIn?.join(', ') || '—'}</strong>
              }
            </div>
          </div>
        </div>

        <div className="myprofile-divider" />

        {/* Discovery Prefs */}
        <div className="myprofile-section">
          <div className="myprofile-section__header">
            <h3>⚙️ Discovery Settings</h3>
            {editing !== 'prefs'
              ? <button className="icon-btn" onClick={() => setEditing('prefs')}><FiEdit2 size={15} /></button>
              : <div style={{ display: 'flex', gap: 6 }}>
                  <button className="icon-btn green" onClick={() => save({ preferences: form.preferences })} disabled={saving}><FiCheck /></button>
                  <button className="icon-btn red" onClick={() => setEditing(null)}><FiX /></button>
                </div>
            }
          </div>
          {editing === 'prefs' ? (
            <div className="myprofile-prefs">
              <div className="pref-row">
                <label>Age range: <strong>{form.preferences.ageRange.min} – {form.preferences.ageRange.max}</strong></label>
                {/* FIX: the old dual-range sliders overlapped and both thumbs
                    moved together because only the top slider received events.
                    Use two discrete number inputs instead — clear UX, no overlap. */}
                <div className="range-row">
                  <input
                    type="number"
                    min={18}
                    max={80}
                    value={form.preferences.ageRange.min}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (Number.isNaN(v)) return;
                      setForm((f) => ({
                        ...f,
                        preferences: {
                          ...f.preferences,
                          ageRange: {
                            min: Math.max(18, Math.min(v, f.preferences.ageRange.max)),
                            max: f.preferences.ageRange.max,
                          },
                        },
                      }));
                    }}
                    style={{ width: 70, padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)' }}
                  />
                  <span>to</span>
                  <input
                    type="number"
                    min={18}
                    max={80}
                    value={form.preferences.ageRange.max}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (Number.isNaN(v)) return;
                      setForm((f) => ({
                        ...f,
                        preferences: {
                          ...f.preferences,
                          ageRange: {
                            min: f.preferences.ageRange.min,
                            max: Math.min(80, Math.max(v, f.preferences.ageRange.min)),
                          },
                        },
                      }));
                    }}
                    style={{ width: 70, padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)' }}
                  />
                </div>
              </div>
              <div className="pref-row">
                <label>Max distance: <strong>{form.preferences.distance} km</strong></label>
                <input type="range" min={1} max={200} value={form.preferences.distance}
                  onChange={(e) => setForm({ ...form, preferences: { ...form.preferences, distance: +e.target.value } })} />
              </div>
            </div>
          ) : (
            <div className="myprofile-info-rows">
              <div className="myprofile-info-row"><span className="muted">Age range</span><strong>{user?.preferences?.ageRange?.min || 18} – {user?.preferences?.ageRange?.max || 50}</strong></div>
              <div className="myprofile-info-row"><span className="muted">Max distance</span><strong>{user?.preferences?.distance || 50} km</strong></div>
            </div>
          )}
        </div>

        <div className="myprofile-divider" />

        {/* Blocked Users */}
        <div className="myprofile-section">
          <div className="myprofile-section__header">
            <h3><FiSlash size={15} /> Blocked users</h3>
          </div>
          {blockedLoading ? (
            <p className="muted" style={{ fontSize: '0.9rem' }}>Loading…</p>
          ) : blocked.length === 0 ? (
            <p className="muted" style={{ fontSize: '0.9rem' }}>You haven't blocked anyone.</p>
          ) : (
            <div className="blocked-list">
              {blocked.map((u) => (
                <div key={u._id} className="blocked-item">
                  <img
                    src={u.profilePhoto || u.photos?.[0] || DEFAULT_AVATAR}
                    alt={u.name}
                    className="blocked-item__avatar"
                  />
                  <div className="blocked-item__info">
                    <strong>{u.name}</strong>
                    <span className="muted">@{u.username}</span>
                  </div>
                  <button
                    className="btn-outline"
                    style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                    onClick={() => handleUnblock(u._id, u.name)}
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="myprofile-divider" />

        {/* Logout */}
        <div className="myprofile-section">
          <button className="logout-btn" onClick={logout}>
            <FiLogOut size={18} /> Sign Out
          </button>
          {/* Delete-account is a hard, irreversible action — keep it visually
              distinct (red/outline), require an emailed OTP, and surface below
              Sign Out so it's never accidentally tapped. */}
          <button
            className="logout-btn"
            style={{
              marginTop: 10,
              background: 'transparent',
              color: '#e53935',
              border: '1.5px solid #e53935',
            }}
            onClick={() => { setDeleteError(''); setDeleteCode(''); setDeleteModal('confirm'); }}
          >
            <FiTrash2 size={18} /> Delete Account
          </button>
        </div>

      </div>

      {/* Delete-account modal (two-stage: confirm → OTP) */}
      {deleteModal && (
        <div className="photo-modal" onClick={() => !deleteBusy && setDeleteModal(null)}>
          <div className="photo-modal__content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420, padding: 24 }}>
            <button
              className="photo-modal__close"
              onClick={() => !deleteBusy && setDeleteModal(null)}
              disabled={deleteBusy}
            ><FiX size={22} /></button>

            {deleteModal === 'confirm' ? (
              <>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <FiAlertTriangle size={42} color="#e53935" />
                </div>
                <h2 style={{ textAlign: 'center', margin: '0 0 10px' }}>Delete your account?</h2>
                <p style={{ textAlign: 'center', color: 'var(--muted)', marginBottom: 20 }}>
                  This cannot be undone. Your profile, matches, and messages will be permanently removed.
                  We'll email you a 6-digit code to confirm.
                </p>
                {deleteError && <div className="auth-error" style={{ marginBottom: 12 }}>{deleteError}</div>}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="btn-outline"
                    style={{ flex: 1, padding: '12px' }}
                    onClick={() => setDeleteModal(null)}
                    disabled={deleteBusy}
                  >Cancel</button>
                  <button
                    className="btn-primary"
                    style={{ flex: 1, padding: '12px', background: '#e53935' }}
                    onClick={startDelete}
                    disabled={deleteBusy}
                  >{deleteBusy ? 'Sending…' : 'Send code'}</button>
                </div>
              </>
            ) : (
              <>
                <h2 style={{ textAlign: 'center', margin: '0 0 10px' }}>Enter confirmation code</h2>
                <p style={{ textAlign: 'center', color: 'var(--muted)', marginBottom: 20 }}>
                  We emailed a 6-digit code to <strong>{user?.email}</strong>. Enter it below to permanently delete your account.
                </p>
                <input
                  className="input-field"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={deleteCode}
                  onChange={(e) => setDeleteCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  style={{ textAlign: 'center', fontSize: '1.4rem', letterSpacing: '0.3em', marginBottom: 12 }}
                  autoFocus
                />
                {deleteError && <div className="auth-error" style={{ marginBottom: 12 }}>{deleteError}</div>}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="btn-outline"
                    style={{ flex: 1, padding: '12px' }}
                    onClick={() => setDeleteModal(null)}
                    disabled={deleteBusy}
                  >Cancel</button>
                  <button
                    className="btn-primary"
                    style={{ flex: 1, padding: '12px', background: '#e53935' }}
                    onClick={confirmDelete}
                    disabled={deleteBusy || deleteCode.length !== 6}
                  >{deleteBusy ? 'Deleting…' : 'Delete forever'}</button>
                </div>
                <button
                  onClick={startDelete}
                  disabled={deleteBusy}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', marginTop: 14, width: '100%', cursor: 'pointer', fontSize: '0.9rem' }}
                >Resend code</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Photo zoom + action modal */}
      {photoModal && (
        <div className="photo-modal" onClick={() => setPhotoModal(null)}>
          <div className="photo-modal__content" onClick={(e) => e.stopPropagation()}>
            <button className="photo-modal__close" onClick={() => setPhotoModal(null)}><FiX size={22} /></button>
            <img
              src={photoModal === 'avatar' ? profilePhoto : coverPhoto}
              alt=""
              className={photoModal === 'avatar' ? 'photo-modal__img circle' : 'photo-modal__img cover'}
            />
            <div className="photo-modal__actions">
              <label className="photo-modal__btn primary">
                <FiUpload size={18} /> Change {photoModal === 'avatar' ? 'profile picture' : 'cover photo'}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={photoModal === 'avatar' ? handleAvatarUpload : handleCoverUpload}
                />
              </label>
              <button
                className="photo-modal__btn danger"
                onClick={photoModal === 'avatar' ? deleteAvatar : deleteCover}
              >
                <FiTrash2 size={18} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyProfile;
