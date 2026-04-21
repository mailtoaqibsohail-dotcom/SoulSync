import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  FiSearch, FiPhone, FiVideo, FiMoreHorizontal, FiUser, FiBellOff,
  FiSlash, FiTrash2, FiImage, FiLink, FiFile, FiChevronDown, FiChevronUp,
  FiMessageCircle, FiEdit, FiArrowLeft,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import Chat from './Chat';
import { DEFAULT_AVATAR } from '../utils/defaults';
import './Inbox.css';

// Messenger-style three-panel inbox.
//
// Layout:
//   ┌──────┬───────────────┬──────────────────────────────┬─────────────┐
//   │ nav  │ chat list     │ active conversation          │ details     │
//   │ (app │  (search,     │  (uses the existing Chat     │  (profile,  │
//   │ nav) │   rows,       │   component in embedded mode │   actions,  │
//   │      │   unread)     │   — all chat features intact)│   media)    │
//   └──────┴───────────────┴──────────────────────────────┴─────────────┘
//
// Mobile: collapses to just the chat list. Tapping a row navigates to the
// existing /chat/:matchId route so the standalone chat page opens full-screen.

const Inbox = () => {
  const navigate = useNavigate();
  const { matchId: matchIdFromUrl } = useParams();
  const { user } = useAuth();
  const { unreadMessages } = useNotifications();

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(matchIdFromUrl || null);
  const [query, setQuery] = useState('');
  const [activeMatch, setActiveMatch] = useState(null);
  const [activeMessages, setActiveMessages] = useState([]);
  const [rightTab, setRightTab] = useState('media'); // 'media' | 'files' | 'links'
  const [customizeOpen, setCustomizeOpen] = useState(true);
  const [mediaOpen, setMediaOpen] = useState(true);
  const [mutedMatches, setMutedMatches] = useState(() => {
    try { return JSON.parse(localStorage.getItem('inbox_muted') || '[]'); }
    catch { return []; }
  });
  const isDesktop = useIsDesktop();

  // Load conversation list once on mount. The active chat's message list
  // lives inside the embedded <Chat> and is surfaced to us via onMessagesChange
  // so the right-hand media grid stays in sync.
  useEffect(() => {
    axios.get('/api/matches')
      .then(({ data }) => setMatches(data.matches))
      .catch((err) => console.error('Load matches error:', err))
      .finally(() => setLoading(false));
  }, []);

  // When we land directly on /inbox without a matchId, auto-select the most
  // recent conversation on desktop (empty middle pane looks broken).
  useEffect(() => {
    if (!selectedId && isDesktop && matches.length > 0) {
      setSelectedId(matches[0].matchId);
    }
  }, [isDesktop, matches, selectedId]);

  // Keep URL in sync with selection so refresh / deep-links work.
  useEffect(() => {
    if (selectedId && matchIdFromUrl !== selectedId) {
      navigate(`/inbox/${selectedId}`, { replace: true });
    }
  }, [selectedId, matchIdFromUrl, navigate]);

  // Filter sidebar by search query (name or last message text).
  const filteredMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return matches;
    return matches.filter((m) => {
      if ((m.user?.name || '').toLowerCase().includes(q)) return true;
      if ((m.user?.username || '').toLowerCase().includes(q)) return true;
      if ((m.lastMessage?.text || '').toLowerCase().includes(q)) return true;
      return false;
    });
  }, [matches, query]);

  const handleSelect = useCallback((matchId, matchUser) => {
    if (!isDesktop) {
      navigate(`/chat/${matchId}`);
      return;
    }
    setSelectedId(matchId);
    setActiveMatch({ matchId, user: matchUser });
    setActiveMessages([]);
  }, [isDesktop, navigate]);

  const handleDelete = async (match) => {
    if (!window.confirm(`Delete chat with ${match.user.name}?`)) return;
    try {
      await axios.delete(`/api/matches/${match.matchId}`);
      setMatches((ms) => ms.filter((m) => m.matchId !== match.matchId));
      if (selectedId === match.matchId) setSelectedId(null);
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
      if (selectedId === match.matchId) setSelectedId(null);
    } catch (err) {
      console.error('Block error:', err);
      alert('Could not block user');
    }
  };

  const toggleMute = (matchId) => {
    setMutedMatches((prev) => {
      const next = prev.includes(matchId)
        ? prev.filter((id) => id !== matchId)
        : [...prev, matchId];
      localStorage.setItem('inbox_muted', JSON.stringify(next));
      return next;
    });
  };

  // Derive Media/Files/Links from the active conversation's message stream.
  const { mediaItems, linkItems, fileItems } = useMemo(() => {
    const media = [];
    const links = [];
    const files = [];
    const urlRe = /\bhttps?:\/\/[^\s]+/gi;
    for (const m of activeMessages) {
      if (m.mediaType === 'image' && m.mediaUrl) {
        media.push({ _id: m._id, url: m.mediaUrl, type: 'image', date: m.createdAt });
      } else if (m.mediaType === 'video' && m.mediaUrl) {
        media.push({ _id: m._id, url: m.mediaUrl, type: 'video', date: m.createdAt });
      } else if (m.mediaType === 'audio' && m.mediaUrl) {
        files.push({ _id: m._id, url: m.mediaUrl, name: 'Voice message', type: 'audio', date: m.createdAt });
      }
      if (m.text) {
        const found = m.text.match(urlRe);
        if (found) found.forEach((u) => links.push({ _id: `${m._id}-${u}`, url: u, date: m.createdAt }));
      }
    }
    return {
      mediaItems: media.slice(-30).reverse(),
      linkItems: links.slice(-30).reverse(),
      fileItems: files.slice(-30).reverse(),
    };
  }, [activeMessages]);

  const selectedMatch = activeMatch
    || matches.find((m) => m.matchId === selectedId)
    || null;

  // Mobile view: if on mobile AND viewing /inbox/:id, the user already has
  // /chat/:id for full-screen — redirect them there. But if they just hit
  // /inbox without an id, show the list only.
  if (!isDesktop && matchIdFromUrl) {
    navigate(`/chat/${matchIdFromUrl}`, { replace: true });
    return null;
  }

  return (
    <div className={`inbox-page ${isDesktop ? 'inbox-page--desktop' : 'inbox-page--mobile'}`}>
      {/* ── Left: chat list ───────────────────────────────── */}
      <aside className="inbox-list">
        <div className="inbox-list__header">
          <h2>Chats</h2>
          <button
            className="inbox-icon-btn"
            onClick={() => navigate('/discover')}
            title="Find someone new"
            aria-label="Find someone new"
          >
            <FiEdit size={18} />
          </button>
        </div>

        <div className="inbox-search">
          <FiSearch size={16} />
          <input
            type="text"
            placeholder="Search Messenger.."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="inbox-list__loading"><div className="spinner" /></div>
        ) : filteredMatches.length === 0 ? (
          <div className="inbox-list__empty">
            <FiMessageCircle size={28} />
            <p>{query ? 'No chats match that search.' : 'No conversations yet.'}</p>
            {!query && (
              <Link to="/discover" className="btn-primary" style={{ marginTop: 10 }}>
                Explore Nearby
              </Link>
            )}
          </div>
        ) : (
          <ul className="inbox-list__items">
            {filteredMatches.map((m) => {
              const active = selectedId === m.matchId;
              const unread = unreadMessages[m.matchId] || 0;
              const muted = mutedMatches.includes(m.matchId);
              return (
                <li
                  key={m.matchId}
                  className={`inbox-row ${active ? 'active' : ''} ${unread ? 'unread' : ''}`}
                  onClick={() => handleSelect(m.matchId, m.user)}
                >
                  <div className="inbox-row__avatar-wrap">
                    <img
                      src={m.user.profilePhoto || m.user.photos?.[0] || DEFAULT_AVATAR}
                      alt={m.user.name}
                      className="inbox-row__avatar"
                    />
                    {m.user.isOnline && <span className="inbox-row__online" />}
                  </div>
                  <div className="inbox-row__body">
                    <div className="inbox-row__name-line">
                      <span className="inbox-row__name">{m.user.name}</span>
                      <span className="inbox-row__time">{formatRelTime(m.lastActivity)}</span>
                    </div>
                    <div className="inbox-row__preview-line">
                      <span className={`inbox-row__preview ${unread ? 'bold' : ''}`}>
                        {m.lastMessage?.text
                          || (m.lastMessage?.mediaType === 'image' ? '📷 Photo'
                              : m.lastMessage?.mediaType === 'video' ? '🎬 Video'
                              : m.lastMessage?.mediaType === 'audio' ? '🎤 Voice message'
                              : 'Say hello! 👋')}
                      </span>
                      {muted && <FiBellOff size={13} className="inbox-row__muted-ic" />}
                      {unread > 0 && <span className="inbox-row__badge">{unread > 9 ? '9+' : unread}</span>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* ── Middle: embedded chat ─────────────────────────── */}
      {isDesktop && (
        <section className="inbox-chat">
          {selectedId && selectedMatch ? (
            <Chat
              key={selectedId}
              matchId={selectedId}
              embedded
              onMatchLoaded={({ match }) => { if (match) setActiveMatch(match); }}
              onMessagesChange={setActiveMessages}
            />
          ) : (
            <div className="inbox-chat__placeholder">
              <FiMessageCircle size={48} />
              <h3>Select a conversation</h3>
              <p>Or start a new one from Discover.</p>
            </div>
          )}
        </section>
      )}

      {/* ── Right: details panel ──────────────────────────── */}
      {isDesktop && selectedMatch && (
        <aside className="inbox-details">
          <div className="inbox-details__profile">
            <img
              src={selectedMatch.user.profilePhoto || selectedMatch.user.photos?.[0] || DEFAULT_AVATAR}
              alt={selectedMatch.user.name}
              className="inbox-details__avatar"
              onClick={() => navigate(`/profile/${selectedMatch.user._id}`)}
            />
            <h3 className="inbox-details__name">{selectedMatch.user.name}</h3>
            <span className={`inbox-details__status ${selectedMatch.user.isOnline ? 'online' : ''}`}>
              {selectedMatch.user.isOnline ? 'Online' : 'Offline'}
            </span>

            <div className="inbox-details__actions">
              <button
                className="inbox-details__action"
                onClick={() => navigate(`/profile/${selectedMatch.user._id}`)}
                title="Open profile"
              >
                <FiUser size={18} />
                <span>Profile</span>
              </button>
              <button
                className={`inbox-details__action ${mutedMatches.includes(selectedId) ? 'active' : ''}`}
                onClick={() => toggleMute(selectedId)}
                title={mutedMatches.includes(selectedId) ? 'Unmute' : 'Mute'}
              >
                <FiBellOff size={18} />
                <span>{mutedMatches.includes(selectedId) ? 'Muted' : 'Mute'}</span>
              </button>
              <button
                className="inbox-details__action"
                onClick={() => {
                  const el = document.querySelector('.chat-input__field');
                  el?.focus();
                  setQuery('');
                }}
                title="Search in chat"
              >
                <FiSearch size={18} />
                <span>Search</span>
              </button>
            </div>
          </div>

          <div className="inbox-details__section">
            <button
              className="inbox-details__section-toggle"
              onClick={() => setCustomizeOpen((v) => !v)}
            >
              <span>Customize Chat</span>
              {customizeOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
            </button>
            {customizeOpen && (
              <div className="inbox-details__customize">
                <button
                  className="inbox-details__sub-row"
                  onClick={() => navigate(`/call/${selectedId}?type=audio&userId=${user._id}&peerId=${selectedMatch.user._id}&caller=true`)}
                >
                  <FiPhone size={16} /> Start voice call
                </button>
                <button
                  className="inbox-details__sub-row"
                  onClick={() => navigate(`/call/${selectedId}?type=video&userId=${user._id}&peerId=${selectedMatch.user._id}&caller=true`)}
                >
                  <FiVideo size={16} /> Start video call
                </button>
                <button
                  className="inbox-details__sub-row danger"
                  onClick={() => handleBlock({ matchId: selectedId, user: selectedMatch.user })}
                >
                  <FiSlash size={16} /> Block user
                </button>
                <button
                  className="inbox-details__sub-row danger"
                  onClick={() => handleDelete({ matchId: selectedId, user: selectedMatch.user })}
                >
                  <FiTrash2 size={16} /> Delete chat
                </button>
              </div>
            )}
          </div>

          <div className="inbox-details__section">
            <button
              className="inbox-details__section-toggle"
              onClick={() => setMediaOpen((v) => !v)}
            >
              <span>Media, Files And Links</span>
              {mediaOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
            </button>

            {mediaOpen && (
              <>
                <div className="inbox-details__tabs">
                  {[
                    { id: 'media', label: 'Media', icon: <FiImage size={14} /> },
                    { id: 'files', label: 'Files', icon: <FiFile size={14} /> },
                    { id: 'links', label: 'Links', icon: <FiLink size={14} /> },
                  ].map((t) => (
                    <button
                      key={t.id}
                      className={`inbox-details__tab ${rightTab === t.id ? 'active' : ''}`}
                      onClick={() => setRightTab(t.id)}
                    >
                      {t.icon}
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>

                {rightTab === 'media' && (
                  mediaItems.length === 0 ? (
                    <p className="inbox-details__empty">No photos or videos yet.</p>
                  ) : (
                    <div className="inbox-details__media-grid">
                      {mediaItems.map((it) => (
                        <a
                          key={it._id}
                          href={it.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inbox-details__media-tile"
                        >
                          {it.type === 'video' ? (
                            <video src={it.url} />
                          ) : (
                            <img src={it.url} alt="" />
                          )}
                        </a>
                      ))}
                    </div>
                  )
                )}

                {rightTab === 'files' && (
                  fileItems.length === 0 ? (
                    <p className="inbox-details__empty">No voice or file attachments.</p>
                  ) : (
                    <ul className="inbox-details__file-list">
                      {fileItems.map((f) => (
                        <li key={f._id}>
                          <a href={f.url} target="_blank" rel="noreferrer">
                            <FiFile size={14} /> {f.name}
                            <span>{formatDate(f.date)}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  )
                )}

                {rightTab === 'links' && (
                  linkItems.length === 0 ? (
                    <p className="inbox-details__empty">No links shared yet.</p>
                  ) : (
                    <ul className="inbox-details__link-list">
                      {linkItems.map((l) => (
                        <li key={l._id}>
                          <a href={l.url} target="_blank" rel="noreferrer">
                            <FiLink size={13} /> {truncate(l.url, 40)}
                          </a>
                          <span>{formatDate(l.date)}</span>
                        </li>
                      ))}
                    </ul>
                  )
                )}
              </>
            )}
          </div>
        </aside>
      )}

      {/* Mobile: empty state back to matches if deselected. */}
      {!isDesktop && !filteredMatches.length && !loading && (
        <div className="inbox-mobile-empty" />
      )}
    </div>
  );
};

// ── helpers ────────────────────────────────────────────

function useIsDesktop() {
  const [d, setD] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 900);
  useEffect(() => {
    const onResize = () => setD(window.innerWidth >= 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return d;
}

function formatRelTime(date) {
  if (!date) return '';
  const d = new Date(date);
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}

export default Inbox;
