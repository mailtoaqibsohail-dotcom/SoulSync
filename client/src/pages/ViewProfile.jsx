import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiArrowLeft, FiMapPin, FiMessageCircle, FiX } from 'react-icons/fi';
import { FaFire } from 'react-icons/fa';
import { useChatPopup } from '../context/ChatPopupContext';
import { DEFAULT_AVATAR } from '../utils/defaults';
import './ViewProfile.css';

const ViewProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { openChat } = useChatPopup();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [matchId, setMatchId] = useState(null);
  const [starting, setStarting] = useState(false);
  const [photoZoom, setPhotoZoom] = useState(null); // 'avatar' | 'cover' | null
  const [sparking, setSparking] = useState(false);
  const [sparkSent, setSparkSent] = useState(false);

  const isDesktop = () => window.innerWidth >= 768;

  // Grindr-style: tap Message → start or reuse a conversation, no matching required.
  const ensureMatch = async () => {
    if (matchId) return matchId;
    const { data } = await axios.post(`/api/matches/start/${id}`);
    setMatchId(data.matchId);
    return data.matchId;
  };

  const handleOpenChat = async () => {
    if (!profile || starting) return;
    try {
      setStarting(true);
      const mId = await ensureMatch();
      if (isDesktop()) openChat(mId, profile);
      else navigate(`/chat/${mId}`);
    } catch (err) {
      console.error('Start chat error:', err);
      alert(err.response?.data?.message || 'Could not start chat');
    } finally {
      setStarting(false);
    }
  };

  const handleSpark = async () => {
    if (!profile || sparking || sparkSent) return;
    setSparking(true);
    try {
      await axios.post(`/api/users/spark/${id}`);
      setSparkSent(true);
      setTimeout(() => setSparkSent(false), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not send spark');
    } finally {
      setSparking(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [profileRes, matchesRes] = await Promise.all([
          axios.get(`/api/users/${id}`),
          axios.get('/api/matches'),
        ]);
        setProfile(profileRes.data.user);

        // If a conversation already exists, reuse it (no need to call /start)
        const found = matchesRes.data.matches.find((m) => m.user._id === id);
        if (found) setMatchId(found.matchId);
      } catch (err) {
        console.error('Profile load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <div className="viewprofile-loading"><div className="spinner" /></div>;
  if (!profile) return <div className="viewprofile-loading"><p>User not found</p></div>;

  const photos = profile.photos?.length ? profile.photos : [profile.profilePhoto || DEFAULT_AVATAR];
  const age = profile.dateOfBirth
    ? Math.floor((Date.now() - new Date(profile.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
    : profile.age;

  return (
    <div className="viewprofile-page">

      {/* Cover */}
      <div className="viewprofile-cover">
        <img
          src={profile.coverPhoto || photos[1] || photos[0]}
          alt="cover"
          className="viewprofile-cover__img"
          onClick={() => (profile.coverPhoto || photos[0]) && setPhotoZoom('cover')}
          style={{ cursor: 'pointer' }}
        />
        <div className="viewprofile-cover__overlay" />

        <button className="viewprofile-back" onClick={() => navigate(-1)}>
          <FiArrowLeft size={20} />
        </button>

        {profile.isOnline && <div className="viewprofile-online">● Online</div>}
      </div>

      <div className="viewprofile-avatar-row">
        <img
          src={profile.profilePhoto || photos[0]}
          alt={profile.name}
          className="viewprofile-avatar"
          onClick={() => setPhotoZoom('avatar')}
          style={{ cursor: 'pointer' }}
        />
        <div className="viewprofile-avatar-info">
          <h1>
            {profile.name}{age ? `, ${age}` : ''}
            {profile.isVerified && <span className="verified-badge">✓</span>}
          </h1>
          {profile.location?.city && (
            <p>
              <FiMapPin size={13} /> {profile.location.city}
              {profile.location.country ? `, ${profile.location.country}` : ''}
              {profile.distance != null && ` · ${profile.distance} km away`}
            </p>
          )}
        </div>
      </div>

      {/* Profile details */}
      <div className="viewprofile-body">

        {/* Actions: Message + Spark (calls moved to chat page) */}
        <div className="viewprofile-actions">
          <button
            className="viewprofile-action-btn viewprofile-action-btn--chat"
            onClick={handleOpenChat}
            disabled={starting}
          >
            <FiMessageCircle size={22} />
            <span>Message</span>
          </button>
          <button
            className={`viewprofile-action-btn viewprofile-action-btn--spark ${sparkSent ? 'sent' : ''}`}
            onClick={handleSpark}
            disabled={sparking || sparkSent}
            title="Send a spark"
          >
            <FaFire size={22} />
            <span>{sparkSent ? 'Sent!' : sparking ? 'Sending...' : 'Spark'}</span>
          </button>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="viewprofile-card">
            <h3>About</h3>
            <p>{profile.bio}</p>
          </div>
        )}

        {/* Info grid */}
        <div className="viewprofile-card">
          <h3>Details</h3>
          <div className="viewprofile-info-grid">
            {age && (
              <div className="viewprofile-info-item">
                <span className="viewprofile-info-icon">🎂</span>
                <div>
                  <p className="viewprofile-info-label">Age</p>
                  <p className="viewprofile-info-value">{age} years old</p>
                </div>
              </div>
            )}
            {profile.gender && (
              <div className="viewprofile-info-item">
                <span className="viewprofile-info-icon">👤</span>
                <div>
                  <p className="viewprofile-info-label">Gender</p>
                  <p className="viewprofile-info-value" style={{ textTransform: 'capitalize' }}>{profile.gender}</p>
                </div>
              </div>
            )}
            {profile.interestedIn?.length > 0 && (
              <div className="viewprofile-info-item">
                <span className="viewprofile-info-icon">❤️</span>
                <div>
                  <p className="viewprofile-info-label">Interested in</p>
                  <p className="viewprofile-info-value" style={{ textTransform: 'capitalize' }}>{profile.interestedIn.join(', ')}</p>
                </div>
              </div>
            )}
            {profile.location?.city && (
              <div className="viewprofile-info-item">
                <span className="viewprofile-info-icon">📍</span>
                <div>
                  <p className="viewprofile-info-label">Location</p>
                  <p className="viewprofile-info-value">{profile.location.city}{profile.location.country ? `, ${profile.location.country}` : ''}</p>
                </div>
              </div>
            )}
            {profile.distance != null && (
              <div className="viewprofile-info-item">
                <span className="viewprofile-info-icon">🗺️</span>
                <div>
                  <p className="viewprofile-info-label">Distance</p>
                  <p className="viewprofile-info-value">{profile.distance} km away</p>
                </div>
              </div>
            )}
            <div className="viewprofile-info-item">
              <span className="viewprofile-info-icon">{profile.isOnline ? '🟢' : '⚫'}</span>
              <div>
                <p className="viewprofile-info-label">Status</p>
                <p className="viewprofile-info-value">{profile.isOnline ? 'Online now' : `Last seen ${timeAgo(profile.lastSeen)}`}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Hobbies */}
        {profile.hobbies?.length > 0 && (
          <div className="viewprofile-card">
            <h3>🎯 Hobbies & Interests</h3>
            <div className="viewprofile-hobbies">
              {profile.hobbies.map((h) => (
                <span key={h} className="viewprofile-hobby">{h}</span>
              ))}
            </div>
          </div>
        )}

        {/* All photos */}
        {photos.length > 1 && (
          <div className="viewprofile-card">
            <h3>📷 Photos</h3>
            <div className="viewprofile-photo-grid">
              {photos.map((src, i) => (
                <img key={i} src={src} alt={`${profile.name} ${i + 1}`}
                  className={`viewprofile-grid-photo ${i === photoIndex ? 'active' : ''}`}
                  onClick={() => setPhotoIndex(i)}
                />
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Photo zoom modal */}
      {photoZoom && (
        <div className="photo-modal" onClick={() => setPhotoZoom(null)}>
          <div className="photo-modal__content" onClick={(e) => e.stopPropagation()}>
            <button className="photo-modal__close" onClick={() => setPhotoZoom(null)}><FiX size={22} /></button>
            <img
              src={photoZoom === 'avatar' ? (profile.profilePhoto || photos[0]) : (profile.coverPhoto || photos[1] || photos[0])}
              alt=""
              className={photoZoom === 'avatar' ? 'photo-modal__img circle' : 'photo-modal__img cover'}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const timeAgo = (date) => {
  if (!date) return 'a while ago';
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export default ViewProfile;
