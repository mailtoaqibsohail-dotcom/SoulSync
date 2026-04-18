import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Matches.css';

const Matches = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/matches')
      .then(({ data }) => setMatches(data.matches))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="matches-loading"><div className="spinner" /></div>;

  return (
    <div className="matches-page">
      <h2 className="matches-title">Your Matches</h2>

      {matches.length === 0 ? (
        <div className="matches-empty card">
          <span style={{ fontSize: '3rem' }}>💘</span>
          <h3>No matches yet</h3>
          <p>Keep swiping to find your match!</p>
          <Link to="/discover" className="btn-primary" style={{ marginTop: 16, display: 'block', textAlign: 'center' }}>
            Start Swiping
          </Link>
        </div>
      ) : (
        <div className="matches-list">
          {matches.map((match) => (
            <Link key={match.matchId} to={`/chat/${match.matchId}`} className="match-item card">
              <div className="match-item__avatar-wrapper">
                <img
                  src={match.user.profilePhoto || match.user.photos?.[0] || '/placeholder.jpg'}
                  alt={match.user.name}
                  className="match-item__avatar"
                />
                {match.user.isOnline && <span className="match-item__online" />}
              </div>
              <div className="match-item__info">
                <div className="match-item__name-row">
                  <h3>{match.user.name}</h3>
                  {match.user.isVerified && <span className="verified-badge small">✓</span>}
                </div>
                <p className="match-item__last-msg">
                  {match.lastMessage?.text || 'Say hello! 👋'}
                </p>
              </div>
              <span className="match-item__time">
                {match.lastActivity
                  ? new Date(match.lastActivity).toLocaleDateString([], { month: 'short', day: 'numeric' })
                  : ''}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Matches;
