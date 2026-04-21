import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { FiCamera, FiX, FiMapPin, FiUser, FiCheck } from 'react-icons/fi';
import './SetupProfile.css';

const STEPS = ['Photos', 'Bio', 'Location'];

const SetupProfile = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [bio, setBio] = useState('');
  const [locating, setLocating] = useState(false);
  const [locationSet, setLocationSet] = useState(false);
  const [locationLabel, setLocationLabel] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // ── Step 1: Photos ────────────────────────────────────
  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    if (photos.length + files.length > 6) {
      setError('Maximum 6 photos allowed'); return;
    }
    setError('');
    setPhotos((prev) => [...prev, ...files]);
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removePhoto = (idx) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const uploadPhotos = async () => {
    if (photos.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    photos.forEach((p) => formData.append('photos', p));
    try {
      const { data } = await axios.post('/api/users/photos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser({ photos: data.photos, profilePhoto: data.photos[0] });
    } catch (err) {
      setError('Photo upload failed. Please try again.');
      throw err;
    } finally {
      setUploading(false);
    }
  };

  // ── Step 2: Bio ───────────────────────────────────────
  const saveBio = async () => {
    try {
      await axios.patch('/api/users/profile', { bio });
      updateUser({ bio });
    } catch {
      setError('Failed to save bio.');
      throw new Error('bio save failed');
    }
  };

  // ── Step 3: Location ──────────────────────────────────
  const getLocation = () => {
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          // Reverse geocode using free API
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`
          );
          const geo = await res.json();
          const city = geo.address?.city || geo.address?.town || geo.address?.village || '';
          const country = geo.address?.country || '';

          await axios.patch('/api/users/location', {
            lat: coords.latitude,
            lng: coords.longitude,
            city,
            country,
          });

          setLocationLabel(`${city}${city && country ? ', ' : ''}${country}`);
          setLocationSet(true);
          updateUser({ location: { city, country } });
        } catch {
          setError('Could not get location details.');
        } finally {
          setLocating(false);
        }
      },
      () => {
        setError('Location permission denied. You can set it later in settings.');
        setLocating(false);
      }
    );
  };

  // ── Navigation ────────────────────────────────────────
  const handleNext = async () => {
    setError('');
    try {
      if (step === 0) {
        if (photos.length > 0) await uploadPhotos();
      }
      if (step === 1) {
        if (bio.trim()) await saveBio();
      }
      if (step < STEPS.length - 1) {
        setStep(step + 1);
      } else {
        navigate('/discover');
      }
    } catch {
      // error already set inside handlers
    }
  };

  const skip = () => {
    setError('');
    if (step < STEPS.length - 1) setStep(step + 1);
    else navigate('/discover');
  };

  return (
    <div className="setup-page">
      <div className="setup-card card">

        {/* Header */}
        <div className="setup-header">
          <h1 className="gradient-text">💫 SoulSync</h1>
          <p className="setup-subtitle">Let's set up your profile</p>
        </div>

        {/* Step progress bar */}
        <div className="setup-progress">
          {STEPS.map((label, i) => (
            <div key={i} className="setup-progress__item">
              <div className={`setup-progress__dot ${i <= step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
                {i < step ? <FiCheck size={12} /> : i + 1}
              </div>
              <span className={`setup-progress__label ${i === step ? 'active' : ''}`}>{label}</span>
              {i < STEPS.length - 1 && <div className={`setup-progress__line ${i < step ? 'active' : ''}`} />}
            </div>
          ))}
        </div>

        {error && <div className="setup-error">{error}</div>}

        {/* ── Step 0: Photos ── */}
        {step === 0 && (
          <div className="setup-step">
            <div className="setup-step__icon"><FiCamera size={32} /></div>
            <h2>Add your photos</h2>
            <p>Add up to 6 photos. Your first photo will be your profile picture.</p>

            <div className="photo-grid">
              {previews.map((src, i) => (
                <div key={i} className="photo-grid__item">
                  <img src={src} alt={`photo ${i + 1}`} />
                  <button className="photo-grid__remove" onClick={() => removePhoto(i)}>
                    <FiX size={14} />
                  </button>
                  {i === 0 && <span className="photo-grid__badge">Main</span>}
                </div>
              ))}

              {previews.length < 6 && (
                <label className="photo-grid__add">
                  <FiCamera size={24} />
                  <span>Add photo</span>
                  <input
                    type="file"
                    accept="image/*,.heic,.heif,.avif,.tiff,.tif,.bmp"
                    multiple
                    onChange={handlePhotoChange}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>
          </div>
        )}

        {/* ── Step 1: Bio ── */}
        {step === 1 && (
          <div className="setup-step">
            <div className="setup-step__icon"><FiUser size={32} /></div>
            <h2>Write your bio</h2>
            <p>Tell people a little about yourself. What makes you unique?</p>

            <div className="bio-wrapper">
              <textarea
                className="input-field bio-input"
                placeholder="e.g. Coffee addict ☕ | Dog lover 🐶 | Looking for someone to explore the city with..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={500}
                rows={5}
              />
              <span className="bio-counter">{bio.length}/500</span>
            </div>

            <div className="bio-suggestions">
              <p>Ideas to include:</p>
              <div className="bio-chips">
                {['Your job 💼', 'A hobby 🎸', 'Favourite food 🍕', 'Weekend plans 🏕️', 'Fun fact 😄'].map((chip) => (
                  <button
                    key={chip}
                    className="bio-chip"
                    onClick={() => setBio((b) => b ? `${b} ${chip}` : chip)}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Location ── */}
        {step === 2 && (
          <div className="setup-step">
            <div className="setup-step__icon"><FiMapPin size={32} /></div>
            <h2>Enable location</h2>
            <p>We use your location to show you people nearby. It's never shared publicly.</p>

            {!locationSet ? (
              <button
                className="btn-primary location-btn"
                onClick={getLocation}
                disabled={locating}
              >
                <FiMapPin size={18} />
                {locating ? 'Getting location...' : 'Allow Location Access'}
              </button>
            ) : (
              <div className="location-success">
                <div className="location-success__icon">✅</div>
                <p>Location set to <strong>{locationLabel || 'your area'}</strong></p>
              </div>
            )}

            <p className="location-note">
              You can change this anytime in Settings.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="setup-actions">
          <button
            className="btn-primary"
            onClick={handleNext}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : step === STEPS.length - 1 ? '🚀 Go to App' : 'Continue'}
          </button>
          <button className="setup-skip" onClick={skip}>
            Skip for now
          </button>
        </div>

      </div>
    </div>
  );
};

export default SetupProfile;
