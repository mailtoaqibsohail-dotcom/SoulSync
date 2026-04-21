import React, { useState, useRef, useEffect } from 'react';
import { FiBell, FiHeart, FiMessageCircle, FiX } from 'react-icons/fi';
import { useNotifications } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import './NotificationBell.css';

const NotificationBell = () => {
  const { notifications, unreadNotifications, matchPopup, setMatchPopup, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen(!open);
    if (!open) markAllRead();
  };

  const handleClick = (notif) => {
    setOpen(false);
    if (notif.matchId) navigate(`/chat/${notif.matchId}`);
  };

  return (
    <>
      <div className="notif-bell" ref={ref}>
        <button className="notif-bell__btn" onClick={handleOpen}>
          <FiBell size={22} />
          {unreadNotifications > 0 && (
            <span className="notif-bell__dot">{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>
          )}
        </button>

        {open && (
          <div className="notif-dropdown card">
            <div className="notif-dropdown__header">
              <h4>Notifications</h4>
              {notifications.length > 0 && (
                <button className="notif-clear" onClick={() => { markAllRead(); setOpen(false); }}>
                  Clear all
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="notif-empty">
                <FiBell size={28} />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="notif-list">
                {notifications.slice(0, 15).map((n) => (
                  <div key={n.id} className={`notif-item ${n.read ? '' : 'unread'}`} onClick={() => handleClick(n)}>
                    <div className={`notif-item__icon ${n.type}`}>
                      {n.type === 'match' ? <FiHeart size={16} /> : <FiMessageCircle size={16} />}
                    </div>
                    <div className="notif-item__body">
                      <p>{n.text}</p>
                      <span>{timeAgo(n.time)}</span>
                    </div>
                    {!n.read && <div className="notif-item__unread-dot" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Match Popup */}
      {matchPopup && (
        <div className="match-overlay" onClick={() => setMatchPopup(null)}>
          <div className="match-popup card" onClick={(e) => e.stopPropagation()}>
            <button className="match-popup__close" onClick={() => setMatchPopup(null)}><FiX size={20} /></button>
            <div className="match-popup__hearts">💘</div>
            <h2 className="gradient-text">It's a Match!</h2>
            <p>You and <strong>{matchPopup.user?.name}</strong> liked each other</p>
            {matchPopup.user?.profilePhoto && (
              <img src={matchPopup.user.profilePhoto} alt="" className="match-popup__avatar" />
            )}
            <div className="match-popup__actions">
              <button className="btn-primary" onClick={() => { navigate(`/chat/${matchPopup.matchId}`); setMatchPopup(null); }}>
                💬 Send a message
              </button>
              <button className="btn-outline" style={{ marginTop: 10 }} onClick={() => setMatchPopup(null)}>
                Keep swiping
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const timeAgo = (date) => {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export default NotificationBell;
