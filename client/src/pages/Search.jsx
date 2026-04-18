import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { FiSearch, FiMapPin } from 'react-icons/fi';
import './Search.css';

const Search = () => {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState('username'); // username | email | phone | nearby
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim() && filterType !== 'nearby') return;
    setLoading(true);
    setSearched(true);

    try {
      const params = {};

      if (filterType === 'nearby') {
        const pos = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej)
        );
        params.nearby = 'true';
        params.lat = pos.coords.latitude;
        params.lng = pos.coords.longitude;
      } else {
        params[filterType] = query.trim();
      }

      const { data } = await axios.get('/api/users/search', { params });
      setResults(data.users);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const age = (dob) => dob
    ? Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return (
    <div className="search-page">
      <h2 className="search-title">Find People</h2>

      <div className="search-filters card">
        <div className="search-filter-tabs">
          {['username', 'email', 'phone', 'nearby'].map((t) => (
            <button
              key={t}
              className={`search-tab ${filterType === t ? 'active' : ''}`}
              onClick={() => setFilterType(t)}
            >
              {t === 'nearby' ? <><FiMapPin size={13} /> Nearby</> : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {filterType !== 'nearby' && (
          <div className="search-input-row">
            <input
              className="input-field"
              placeholder={
                filterType === 'username' ? 'Search by @username' :
                filterType === 'email'    ? 'Search by email' :
                'Search by phone number'
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button className="search-btn" onClick={handleSearch}>
              <FiSearch size={20} />
            </button>
          </div>
        )}

        {filterType === 'nearby' && (
          <button className="btn-primary" style={{ marginTop: 12 }} onClick={handleSearch}>
            <FiMapPin size={16} style={{ marginRight: 6 }} />
            Find Nearby People
          </button>
        )}
      </div>

      {/* Results */}
      {loading && <div className="search-loading"><div className="spinner" /></div>}

      {!loading && searched && results.length === 0 && (
        <div className="search-empty card">
          <p>No users found. Try a different search.</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="search-results">
          {results.map((u) => (
            <Link key={u._id} to={`/profile/${u._id}`} className="search-result-item card">
              <img
                src={u.profilePhoto || u.photos?.[0] || '/placeholder.jpg'}
                alt={u.name}
                className="search-result__avatar"
              />
              <div className="search-result__info">
                <div className="search-result__name-row">
                  <h3>{u.name}</h3>
                  {u.isVerified && <span className="verified-badge small">✓</span>}
                  {u.isOnline && <span className="online-dot" />}
                </div>
                <p className="search-result__meta">
                  @{u.username}
                  {age(u.dateOfBirth) && ` · ${age(u.dateOfBirth)}`}
                  {u.distance != null && ` · ${u.distance} km away`}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Search;
