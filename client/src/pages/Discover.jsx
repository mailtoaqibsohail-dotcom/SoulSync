import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import SwipeCard from '../components/SwipeCard';
import '../components/SwipeCard.css';
import './Discover.css';

const Discover = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchPopup, setMatchPopup] = useState(null); // { matchId, user }

  // Get user location and fetch discover feed
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => fetchUsers(coords.longitude, coords.latitude),
      () => fetchUsers() // fallback: no location
    );
  }, []);

  const fetchUsers = async (lng, lat) => {
    setLoading(true);
    try {
      const params = lng && lat ? { lng, lat } : {};
      const { data } = await axios.get('/api/users/discover', { params });
      setUsers(data.users);
    } catch (err) {
      console.error('Discover error:', err);
    } finally {
      setLoading(false);
    }
  };

  const removeTop = useCallback(() => {
    setUsers((prev) => prev.slice(0, -1));
  }, []);

  const handleLike = useCallback(async (userId) => {
    removeTop();
    try {
      const { data } = await axios.post(`/api/matches/like/${userId}`);
      if (data.isMatch) {
        const liked = users.find((u) => u._id === userId);
        setMatchPopup({ matchId: data.matchId, user: liked });
      }
    } catch (err) {
      console.error('Like error:', err);
    }
  }, [users, removeTop]);

  const handleDislike = useCallback(async (userId) => {
    removeTop();
    try {
      await axios.post(`/api/matches/dislike/${userId}`);
    } catch (err) {
      console.error('Dislike error:', err);
    }
  }, [removeTop]);

  // Current top card is last in array (stack renders bottom → top)
  const topUser = users[users.length - 1];

  return (
    <div className="discover-page">
      <div className="discover-stack">
        {loading ? (
          <div className="discover-empty">
            <div className="spinner" />
            <p>Finding people near you...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="discover-empty card">
            <span className="discover-empty__icon">🌍</span>
            <h3>No more profiles</h3>
            <p>Expand your distance or check back later</p>
            <button className="btn-primary" style={{ marginTop: 20 }} onClick={() => fetchUsers()}>
              Refresh
            </button>
          </div>
        ) : (
          users.map((user, i) => {
            const isTop = i === users.length - 1;
            return (
              <div
                key={user._id}
                className="discover-stack__item"
                style={{
                  zIndex: i,
                  transform: isTop
                    ? 'scale(1) translateY(0)'
                    : `scale(${0.96 - (users.length - 1 - i) * 0.02}) translateY(${(users.length - 1 - i) * 10}px)`,
                  transition: 'transform 0.3s ease',
                  pointerEvents: isTop ? 'auto' : 'none',
                }}
              >
                {isTop ? (
                  <SwipeCard
                    user={user}
                    onLike={handleLike}
                    onDislike={handleDislike}
                  />
                ) : (
                  <div className="swipe-card swipe-card--bg">
                    <img src={user.profilePhoto || user.photos?.[0] || '/placeholder.jpg'} alt="" />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* It's a Match! popup */}
      {matchPopup && (
        <div className="match-overlay" onClick={() => setMatchPopup(null)}>
          <div className="match-popup" onClick={(e) => e.stopPropagation()}>
            <h2 className="gradient-text">It's a Match!</h2>
            <p>You and {matchPopup.user?.name} liked each other</p>
            <div className="match-popup__photos">
              <img src={matchPopup.user?.profilePhoto || matchPopup.user?.photos?.[0]} alt="" />
            </div>
            <div className="match-popup__actions">
              <a href={`/chat/${matchPopup.matchId}`} className="btn-primary" style={{ display: 'block', textAlign: 'center' }}>
                Send a message
              </a>
              <button className="btn-outline" style={{ marginTop: 10 }} onClick={() => setMatchPopup(null)}>
                Keep swiping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Discover;
