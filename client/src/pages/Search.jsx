import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { FiSearch, FiMapPin, FiX } from 'react-icons/fi';
import { DEFAULT_AVATAR } from '../utils/defaults';
import './Search.css';

const Search = () => {
  const [query, setQuery] = useState('');
  const [nearby, setNearby] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Load nearby people on page open, sorted by distance (closest on top)
  useEffect(() => {
    loadNearby();
  }, []);

  const loadNearby = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const pos = await new Promise((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          (p) => resolve(p),
          () => resolve(null)
        );
      });

      const params = { nearby: 'true' };
      if (pos) {
        params.lat = pos.coords.latitude;
        params.lng = pos.coords.longitude;
      }

      const { data } = await axios.get('/api/users/search', { params });
      // Server $geoNear already returns closest first
      setNearby(data.users || []);
    } catch (err) {
      console.error('Nearby load error:', err);
      setErrorMsg('Could not load nearby people');
    } finally {
      setLoading(false);
    }
  };

  // Client-side filter: when user types, narrow down nearby list by name/username.
  // Keeps the distance order intact (closest still on top).
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return nearby;
    return nearby.filter(
      (u) =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q)
    );
  }, [nearby, query]);

  const age = (dob) =>
    dob
      ? Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000))
      : null;

  const formatDistance = (km) => {
    if (km == null) return '';
    if (km < 1) return `${Math.round(km * 1000)} m away`;
    return `${Math.round(km)} km away`;
  };

  return (
    <div className="search-page">
      <h2 className="search-title">Find People</h2>

      {/* Search bar — filters nearby list by name / username */}
      <div className="search-filters card">
        <div className="search-input-row">
          <div className="search-input-wrap">
            <FiSearch size={18} className="search-input-icon" />
            <input
              className="search-input"
              placeholder="Search by name or @username"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {query && (
              <button
                className="search-input-clear"
                onClick={() => setQuery('')}
                title="Clear"
                aria-label="Clear search"
              >
                <FiX size={16} />
              </button>
            )}
          </div>
        </div>
        <div className="search-subtitle">
          <FiMapPin size={13} />
          <span>Nearby — closest first</span>
        </div>
      </div>

      {/* States */}
      {loading && (
        <div className="search-loading">
          <div className="spinner" />
        </div>
      )}

      {!loading && errorMsg && (
        <div className="search-empty card">
          <p>{errorMsg}</p>
          <button className="btn-outline" style={{ marginTop: 12 }} onClick={loadNearby}>
            Try again
          </button>
        </div>
      )}

      {!loading && !errorMsg && filtered.length === 0 && (
        <div className="search-empty card">
          {query ? (
            <p>No one matches "{query}" near you.</p>
          ) : (
            <p>No one nearby yet. Check back later.</p>
          )}
        </div>
      )}

      {/* Results list */}
      {!loading && filtered.length > 0 && (
        <div className="search-results">
          {filtered.map((u) => {
            const userAge = age(u.dateOfBirth);
            return (
              <Link
                key={u._id}
                to={`/profile/${u._id}`}
                className="search-result-item card"
              >
                <div className="search-result__avatar-wrap">
                  <img
                    src={u.profilePhoto || u.photos?.[0] || DEFAULT_AVATAR}
                    alt={u.name}
                    className="search-result__avatar"
                  />
                  {u.isOnline && <span className="search-result__online" />}
                </div>
                <div className="search-result__info">
                  <div className="search-result__name-row">
                    <h3>{u.name}</h3>
                    {u.isVerified && <span className="verified-badge small">✓</span>}
                  </div>
                  <p className="search-result__meta">
                    @{u.username}
                    {userAge && ` · ${userAge}`}
                  </p>
                  {u.distance != null && (
                    <p className="search-result__distance">
                      <FiMapPin size={11} /> {formatDistance(u.distance)}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Search;
