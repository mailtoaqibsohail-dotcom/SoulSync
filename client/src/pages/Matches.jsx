import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { FiTrash2, FiSlash } from 'react-icons/fi';
import { useNotifications } from '../context/NotificationContext';
import { useChatPopup } from '../context/ChatPopupContext';
import { DEFAULT_AVATAR } from '../utils/defaults';
import './Matches.css';

// Swipe thresholds (px). Pull past ACTION_THRESHOLD and release to trigger.
const MAX_SWIPE = 100;
const ACTION_THRESHOLD = 70;

const Matches = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const { unreadMessages } = useNotifications();
  const { openChat } = useChatPopup();
  const navigate = useNavigate();

  // Track active swipe per match row. Keyed by matchId → current x offset (px).
  // Positive x = swiped left-to-right (Block action). Negative = right-to-left (Delete).
  const [swipe, setSwipe] = useState({}); // { [matchId]: number }
  const startX = useRef({}); // { [matchId]: startingClientX }
  const moved = useRef({}); // { [matchId]: bool } — did we actually drag?

  const isDesktop = () => window.innerWidth >= 768;

  const handleOpenChat = (matchId, user) => {
    if (isDesktop()) openChat(matchId, user);
    else navigate(`/chat/${matchId}`);
  };

  useEffect(() => {
    axios.get('/api/matches')
      .then(({ data }) => setMatches(data.matches))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── Swipe handlers ─────────────────────────────────────
  const onTouchStart = (matchId) => (e) => {
    startX.current[matchId] = e.touches ? e.touches[0].clientX : e.clientX;
    moved.current[matchId] = false;
  };

  const onTouchMove = (matchId) => (e) => {
    if (startX.current[matchId] == null) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const dx = clientX - startX.current[matchId];
    if (Math.abs(dx) > 6) moved.current[matchId] = true;
    const clamped = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, dx));
    setSwipe((s) => ({ ...s, [matchId]: clamped }));
  };

  const onTouchEnd = (matchId, match) => () => {
    const dx = swipe[matchId] || 0;
    startX.current[matchId] = null;

    if (dx <= -ACTION_THRESHOLD) {
      // Right-to-left → Delete chat
      handleDelete(match);
    } else if (dx >= ACTION_THRESHOLD) {
      // Left-to-right → Block user
      handleBlock(match);
    }

    // Snap back to 0 in all cases (confirm dialog happens in the handlers)
    setSwipe((s) => ({ ...s, [matchId]: 0 }));
  };

  // Suppress tap click if the user was actually swiping
  const suppressIfSwiped = (matchId) => (e) => {
    if (moved.current[matchId]) {
      e.preventDefault();
      e.stopPropagation();
      moved.current[matchId] = false;
    }
  };

  // ── Actions ────────────────────────────────────────────
  const handleDelete = async (match) => {
    if (!window.confirm(`Delete chat with ${match.user.name}?`)) return;
    try {
      await axios.delete(`/api/matches/${match.matchId}`);
      setMatches((ms) => ms.filter((m) => m.matchId !== match.matchId));
    } catch (err) {
      console.error('Delete chat error:', err);
      alert('Could not delete chat');
    }
  };

  const handleBlock = async (match) => {
    if (!window.confirm(`Block ${match.user.name}? They won't be able to message you.`)) return;
    try {
      await axios.post(`/api/users/block/${match.user._id}`);
      setMatches((ms) => ms.filter((m) => m.matchId !== match.matchId));
    } catch (err) {
      console.error('Block user error:', err);
      alert('Could not block user');
    }
  };

  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const diff = Math.floor((new Date() - d) / 1000);
    if (diff < 60) return 'now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (loading) return <div className="matches-loading"><div className="spinner" /></div>;

  return (
    <div className="matches-page">
      <h2 className="matches-title">Inbox</h2>

      {matches.length === 0 ? (
        <div className="matches-empty card">
          <span style={{ fontSize: '3rem' }}>💘</span>
          <h3>No conversations yet</h3>
          <p>Tap a profile in Discover to start chatting!</p>
          <Link to="/discover" className="btn-primary" style={{ marginTop: 16, display: 'block', textAlign: 'center' }}>
            Explore Nearby
          </Link>
        </div>
      ) : (
        <div className="matches-list">
          {matches.map((match) => {
            const hasUnread = unreadMessages[match.matchId] > 0;
            const dx = swipe[match.matchId] || 0;
            // Reveal action: + = block (shown on left), - = delete (shown on right)
            const showingBlock = dx > 10;
            const showingDelete = dx < -10;
            return (
              <div key={match.matchId} className="match-row">
                {/* Left background — BLOCK (revealed when swiping right) */}
                <div
                  className={`match-row__action match-row__action--block ${showingBlock ? 'visible' : ''}`}
                  aria-hidden="true"
                >
                  <FiSlash size={18} />
                  <span>Block</span>
                </div>

                {/* Right background — DELETE (revealed when swiping left) */}
                <div
                  className={`match-row__action match-row__action--delete ${showingDelete ? 'visible' : ''}`}
                  aria-hidden="true"
                >
                  <FiTrash2 size={18} />
                  <span>Delete</span>
                </div>

                {/* Foreground card — translated by dx */}
                <div
                  className={`match-item card ${hasUnread ? 'unread' : ''}`}
                  style={{
                    transform: `translateX(${dx}px)`,
                    transition: dx === 0 ? 'transform 0.22s ease' : 'none',
                  }}
                  onTouchStart={onTouchStart(match.matchId)}
                  onTouchMove={onTouchMove(match.matchId)}
                  onTouchEnd={onTouchEnd(match.matchId, match)}
                  onMouseDown={onTouchStart(match.matchId)}
                  onMouseMove={(e) => {
                    if (e.buttons === 1) onTouchMove(match.matchId)(e);
                  }}
                  onMouseUp={onTouchEnd(match.matchId, match)}
                  onMouseLeave={() => {
                    // Cancel swipe if the mouse leaves the row mid-drag
                    if (startX.current[match.matchId] != null) {
                      startX.current[match.matchId] = null;
                      setSwipe((s) => ({ ...s, [match.matchId]: 0 }));
                    }
                  }}
                  onClickCapture={suppressIfSwiped(match.matchId)}
                >
                  {/* Avatar — tapping goes to profile */}
                  <div
                    className="match-item__avatar-wrapper"
                    onClick={() => navigate(`/profile/${match.user._id}`)}
                  >
                    <img
                      src={match.user.profilePhoto || match.user.photos?.[0] || DEFAULT_AVATAR}
                      alt={match.user.name}
                      className="match-item__avatar"
                    />
                    {match.user.isOnline && <span className="match-item__online" />}
                  </div>

                  {/* Info — tapping goes to chat */}
                  <div
                    className="match-item__info"
                    onClick={() => handleOpenChat(match.matchId, match.user)}
                  >
                    <div className="match-item__name-row">
                      <span
                        className="match-item__name"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/profile/${match.user._id}`);
                        }}
                      >
                        {match.user.name}
                        {match.user.isVerified && (
                          <span className="verified-badge small">✓</span>
                        )}
                      </span>
                      <span className="match-item__time">{formatTime(match.lastActivity)}</span>
                    </div>

                    <p className={`match-item__last-msg ${hasUnread ? 'bold' : ''}`}>
                      {match.lastMessage?.text || 'Say hello! 👋'}
                    </p>
                  </div>

                  {hasUnread && (
                    <span className="match-item__unread-dot">
                      {unreadMessages[match.matchId]}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Hint for first-time users */}
          <p className="matches-hint">
            Tip: swipe a chat left to delete, right to block.
          </p>
        </div>
      )}
    </div>
  );
};

export default Matches;
