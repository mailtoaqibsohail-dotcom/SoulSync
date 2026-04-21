import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiFilter, FiX, FiRotateCcw } from 'react-icons/fi';
import { searchCities } from '../utils/pakistanCities';
import { DEFAULT_AVATAR } from '../utils/defaults';
import './Discover.css';

// Common hobby chips shown in the filter panel. Selecting any narrows the grid
// to users who have at least one of those hobbies on their profile.
const HOBBY_OPTIONS = [
  'Music', 'Movies', 'Travel', 'Gaming', 'Fitness', 'Cooking',
  'Reading', 'Art', 'Photography', 'Hiking', 'Dancing', 'Sports',
  'Yoga', 'Coffee', 'Pets', 'Tech',
];

const DEFAULT_FILTERS = {
  minAge: 18,
  maxAge: 60,
  gender: 'everyone', // 'men' | 'women' | 'everyone'
  distanceKm: 50,
  city: '',
  hobbies: [], // array of strings
};

const Discover = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [relaxed, setRelaxed] = useState(false);
  const [noLocation, setNoLocation] = useState(false);

  // Filter state — `filters` is the applied value; `draftFilters` is what the
  // user is currently editing in the panel. Only "Apply" commits the draft.
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  // Cached coords so re-applying filters doesn't re-prompt geolocation.
  const coordsRef = useRef(null);
  // Live coords state powers real-time distance recomputation as the user
  // moves. Kept separate from coordsRef (which only updates on explicit
  // fetches) so that moving around refreshes on-screen distances without
  // hammering the server with re-queries.
  const [liveCoords, setLiveCoords] = useState(null);

  // City autocomplete open/close flag (shown while the input is focused and
  // there's at least one match).
  const [cityFocus, setCityFocus] = useState(false);

  // Raw age input buffers. We keep them as free-form strings so users can
  // clear the field, type part of a number, etc. without the controlled
  // input clamping them back to the previous value mid-keystroke. Commit
  // the actual filters (clamped, number-typed) on blur.
  const [minAgeRaw, setMinAgeRaw] = useState(String(DEFAULT_FILTERS.minAge));
  const [maxAgeRaw, setMaxAgeRaw] = useState(String(DEFAULT_FILTERS.maxAge));

  const navigate = useNavigate();

  // IP-based geolocation fallback. Used when the browser blocks GPS (e.g.
  // macOS Chrome without Location Services, Firefox in strict mode). Less
  // accurate — city-level — but lets Discover work instead of dead-ending.
  const ipLookup = async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (!res.ok) throw new Error('ipapi failed');
      const d = await res.json();
      if (typeof d.latitude === 'number' && typeof d.longitude === 'number') {
        return { lat: d.latitude, lng: d.longitude };
      }
    } catch (err) {
      console.warn('[Discover] IP lookup failed:', err?.message);
    }
    return null;
  };

  // Initial load + live watch. getCurrentPosition gets us going fast, then
  // watchPosition keeps liveCoords fresh. Distances on the tiles are computed
  // client-side (Haversine) against the latest coords.
  //
  // Robustness ladder:
  //   1) Browser geolocation (fast, accurate)
  //   2) watchPosition — if the initial call was slow, refetch when it lands
  //   3) IP geolocation — city-level fallback when the browser blocks GPS
  //   4) Stored profile location on the server (handled there)
  useEffect(() => {
    if (!navigator.geolocation) {
      fetchUsers(null, filters);
      return;
    }

    let gotCoords = false;

    const gpsOpts = { enableHighAccuracy: false, maximumAge: 60000, timeout: 15000 };

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        gotCoords = true;
        const c = { lng: coords.longitude, lat: coords.latitude };
        coordsRef.current = c;
        setLiveCoords(c);
        fetchUsers(c, filters);
      },
      async (err) => {
        console.warn('[Discover] getCurrentPosition failed:', err?.code, err?.message);
        // Try IP lookup before giving up.
        const ip = await ipLookup();
        if (ip && !gotCoords) {
          gotCoords = true;
          coordsRef.current = ip;
          setLiveCoords(ip);
          fetchUsers(ip, filters);
        } else {
          // Server will fall back to stored profile coords if any.
          fetchUsers(null, filters);
        }
      },
      gpsOpts
    );

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const c = { lng: coords.longitude, lat: coords.latitude };
        setLiveCoords(c);
        // If the fast path failed but the watcher eventually gets coords,
        // cache + refetch so the grid appears without a manual reload.
        if (!gotCoords) {
          gotCoords = true;
          coordsRef.current = c;
          fetchUsers(c, filters);
        }
      },
      (err) => { console.warn('[Discover] watchPosition error:', err?.code, err?.message); },
      { enableHighAccuracy: false, maximumAge: 10000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []); // run once on mount

  // Haversine — km between two {lng, lat} points. Good enough for UI display;
  // not used for server-side filtering (that stays geoNear-accurate).
  const haversineKm = (a, b) => {
    if (!a || !b) return null;
    const toRad = (x) => (x * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const s =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  };

  const fetchUsers = async (coords, f) => {
    setLoading(true);
    setErrorMsg('');
    setRelaxed(false);
    setNoLocation(false);
    try {
      const params = {};
      if (coords) {
        params.lng = coords.lng;
        params.lat = coords.lat;
      }
      if (f) {
        if (f.minAge !== DEFAULT_FILTERS.minAge) params.minAge = f.minAge;
        if (f.maxAge !== DEFAULT_FILTERS.maxAge) params.maxAge = f.maxAge;
        if (f.gender && f.gender !== 'everyone') params.gender = f.gender;
        if (f.distanceKm && f.distanceKm !== DEFAULT_FILTERS.distanceKm) {
          params.distanceKm = f.distanceKm;
        }
        if (f.city && f.city.trim()) params.city = f.city.trim();
        if (f.hobbies && f.hobbies.length) params.hobbies = f.hobbies.join(',');
      }

      const { data } = await axios.get('/api/users/discover', { params });
      setUsers(data.users || []);
      if (data.relaxed) setRelaxed(true);
      if (data.reason === 'no_location') setNoLocation(true);
    } catch (err) {
      console.error('Discover error:', err);
      setErrorMsg(err.response?.data?.message || 'Could not load profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    setFilters(draftFilters);
    setShowFilters(false);
    fetchUsers(coordsRef.current, draftFilters);
  };

  const handleResetFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    setMinAgeRaw(String(DEFAULT_FILTERS.minAge));
    setMaxAgeRaw(String(DEFAULT_FILTERS.maxAge));
    fetchUsers(coordsRef.current, DEFAULT_FILTERS);
    setShowFilters(false);
  };

  const toggleHobby = (h) => {
    setDraftFilters((d) => ({
      ...d,
      hobbies: d.hobbies.includes(h)
        ? d.hobbies.filter((x) => x !== h)
        : [...d.hobbies, h],
    }));
  };

  // Count non-default filters (for the little badge on the filter button)
  const activeFilterCount = (() => {
    let n = 0;
    if (filters.minAge !== DEFAULT_FILTERS.minAge) n++;
    if (filters.maxAge !== DEFAULT_FILTERS.maxAge) n++;
    if (filters.gender !== DEFAULT_FILTERS.gender) n++;
    if (filters.distanceKm !== DEFAULT_FILTERS.distanceKm) n++;
    if ((filters.city || '').trim()) n++;
    if (filters.hobbies.length) n++;
    return n;
  })();

  const calcAge = (dob) => {
    if (!dob) return null;
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const formatDistance = (km) => {
    if (km == null) return '';
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${Math.round(km)} km`;
  };

  return (
    <div className="discover-page">
      <div className="discover-header">
        <h2 className="discover-title">Nearby</h2>
        <div className="discover-header-actions">
          <button
            className={`discover-filter-btn ${activeFilterCount ? 'has-filters' : ''}`}
            onClick={() => {
              setDraftFilters(filters);
              setMinAgeRaw(String(filters.minAge));
              setMaxAgeRaw(String(filters.maxAge));
              setShowFilters(true);
            }}
            title="Filters"
          >
            <FiFilter size={16} />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="discover-filter-badge">{activeFilterCount}</span>
            )}
          </button>
          {/* Revert filters — resets all filters to defaults and re-fetches.
              Previously this was a "refresh" button that re-ran the same
              query, which looked like nothing happened. Now it actually
              undoes applied filters so the name "revert" is honest. */}
          <button
            className="discover-refresh"
            onClick={handleResetFilters}
            title="Revert filters"
            aria-label="Revert filters"
            disabled={activeFilterCount === 0}
            style={activeFilterCount === 0 ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
          >
            <FiRotateCcw size={16} />
          </button>
        </div>
      </div>

      {errorMsg && <div className="discover-error">{errorMsg}</div>}

      {/* Filter panel (slide-in) */}
      {showFilters && (
        <>
          <div
            className="discover-filter-backdrop"
            onClick={() => setShowFilters(false)}
          />
          <div className="discover-filter-panel">
            <div className="discover-filter-panel__header">
              <h3>Filters</h3>
              <button
                className="discover-filter-close"
                onClick={() => setShowFilters(false)}
                aria-label="Close"
              >
                <FiX size={22} />
              </button>
            </div>

            <div className="discover-filter-panel__body">
              {/* Age range */}
              <div className="filter-group">
                <div className="filter-group__label-row">
                  <label>Age</label>
                  <span className="filter-group__value">
                    {draftFilters.minAge} – {draftFilters.maxAge}
                  </span>
                </div>
                <div className="filter-range-row">
                  {/* Age inputs are backed by raw string buffers so typing
                      works naturally — the previous controlled-number version
                      clamped on every keystroke, which re-rendered the old
                      value and made the inputs feel frozen. We commit the
                      clamped integer to draftFilters only on blur / Enter. */}
                  <input
                    type="number"
                    min="18"
                    max="99"
                    placeholder="Min"
                    value={minAgeRaw}
                    onChange={(e) => setMinAgeRaw(e.target.value)}
                    onBlur={() => {
                      const n = parseInt(minAgeRaw, 10);
                      const clamped = Number.isFinite(n)
                        ? Math.max(18, Math.min(n, draftFilters.maxAge))
                        : 18;
                      setMinAgeRaw(String(clamped));
                      setDraftFilters((d) => ({ ...d, minAge: clamped }));
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                  />
                  <span>to</span>
                  <input
                    type="number"
                    min="18"
                    max="99"
                    placeholder="Max"
                    value={maxAgeRaw}
                    onChange={(e) => setMaxAgeRaw(e.target.value)}
                    onBlur={() => {
                      const n = parseInt(maxAgeRaw, 10);
                      const clamped = Number.isFinite(n)
                        ? Math.min(99, Math.max(n, draftFilters.minAge))
                        : 99;
                      setMaxAgeRaw(String(clamped));
                      setDraftFilters((d) => ({ ...d, maxAge: clamped }));
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                  />
                </div>
              </div>

              {/* Gender */}
              <div className="filter-group">
                <label>Show me</label>
                <div className="filter-chip-row">
                  {[
                    { val: 'everyone', label: 'Everyone' },
                    { val: 'men', label: 'Men' },
                    { val: 'women', label: 'Women' },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      className={`filter-chip ${draftFilters.gender === opt.val ? 'active' : ''}`}
                      onClick={() =>
                        setDraftFilters((d) => ({ ...d, gender: opt.val }))
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Distance */}
              <div className="filter-group">
                <div className="filter-group__label-row">
                  <label>Distance</label>
                  <span className="filter-group__value">
                    {draftFilters.distanceKm} km
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="500"
                  step="1"
                  value={draftFilters.distanceKm}
                  onChange={(e) =>
                    setDraftFilters((d) => ({
                      ...d,
                      distanceKm: parseInt(e.target.value, 10),
                    }))
                  }
                  className="filter-slider"
                />
              </div>

              {/* City — autocomplete over Pakistani cities. Tap a suggestion
                  to fill the input; free-typing is still allowed so the user
                  can enter a city that isn't in our list. */}
              <div className="filter-group">
                <label>City</label>
                <div className="filter-city-wrap">
                  <input
                    type="text"
                    className="filter-text-input"
                    placeholder="Start typing a city…"
                    value={draftFilters.city}
                    autoComplete="off"
                    onFocus={() => setCityFocus(true)}
                    onBlur={() => {
                      // Delay so a click on a suggestion has time to fire.
                      setTimeout(() => setCityFocus(false), 150);
                    }}
                    onChange={(e) =>
                      setDraftFilters((d) => ({ ...d, city: e.target.value }))
                    }
                  />
                  {cityFocus && draftFilters.city && (() => {
                    const matches = searchCities(draftFilters.city);
                    if (matches.length === 0) return null;
                    // Hide the dropdown if the only match equals the current
                    // value (user already selected it).
                    if (
                      matches.length === 1 &&
                      matches[0].toLowerCase() === draftFilters.city.trim().toLowerCase()
                    ) return null;
                    return (
                      <ul className="filter-city-dropdown">
                        {matches.map((c) => (
                          <li
                            key={c}
                            className="filter-city-option"
                            onMouseDown={(e) => {
                              // onMouseDown — fires before blur, so setState
                              // survives the upcoming blur closing handler.
                              e.preventDefault();
                              setDraftFilters((d) => ({ ...d, city: c }));
                              setCityFocus(false);
                            }}
                          >
                            {c}
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </div>
              </div>

              {/* Hobbies */}
              <div className="filter-group">
                <label>Hobbies</label>
                <div className="filter-chip-grid">
                  {HOBBY_OPTIONS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      className={`filter-chip ${draftFilters.hobbies.includes(h) ? 'active' : ''}`}
                      onClick={() => toggleHobby(h)}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="discover-filter-panel__footer">
              <button className="btn-outline" onClick={handleResetFilters}>
                Reset
              </button>
              <button className="btn-primary" onClick={handleApplyFilters}>
                Apply
              </button>
            </div>
          </div>
        </>
      )}

      {/* Loading / empty / grid */}
      {loading ? (
        <div className="discover-loading">
          <div className="spinner" />
          <p>Finding people near you...</p>
        </div>
      ) : noLocation ? (
        <div className="discover-empty">
          <span className="discover-empty__icon">📍</span>
          <h3>Location needed</h3>
          <p>Allow location access in your browser, or set your city in your profile.</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              className="btn-primary"
              onClick={async () => {
                setLoading(true);
                const tryGps = () =>
                  new Promise((resolve) => {
                    if (!navigator.geolocation) return resolve(null);
                    navigator.geolocation.getCurrentPosition(
                      ({ coords }) => resolve({ lng: coords.longitude, lat: coords.latitude }),
                      (err) => { console.warn('[Discover] retry gps failed:', err?.code); resolve(null); },
                      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
                    );
                  });
                const c = (await tryGps()) || (await ipLookup());
                if (c) {
                  coordsRef.current = c;
                  setLiveCoords(c);
                  fetchUsers(c, filters);
                } else {
                  setLoading(false);
                  alert(
                    'Could not detect your location.\n\n' +
                    'On macOS: System Settings → Privacy & Security → Location Services → enable Chrome/your browser.\n' +
                    'Or set your city in your profile.'
                  );
                }
              }}
            >
              Try again
            </button>
            <button className="btn-secondary" onClick={() => navigate('/profile/me')}>
              Update profile
            </button>
          </div>
        </div>
      ) : users.length === 0 ? (
        <div className="discover-empty">
          <span className="discover-empty__icon">🌍</span>
          <h3>No one matches</h3>
          <p>
            {activeFilterCount > 0
              ? 'Try loosening your filters to see more people.'
              : 'Try expanding your distance in settings, or check back later.'}
          </p>
          {activeFilterCount > 0 ? (
            <button className="btn-primary" style={{ marginTop: 16 }} onClick={handleResetFilters}>
              Clear filters
            </button>
          ) : (
            <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/profile/me')}>
              Open settings
            </button>
          )}
        </div>
      ) : (
        <div className="discover-grid">
          {users.map((u) => {
            const age = u.age ?? calcAge(u.dateOfBirth);
            const photo =
              u.profilePhoto ||
              (Array.isArray(u.photos) && u.photos[0]) ||
              DEFAULT_AVATAR;
            return (
              <button
                key={u._id}
                className="discover-tile"
                onClick={() => navigate(`/profile/${u._id}`)}
                aria-label={`Open ${u.name}'s profile`}
              >
                <img
                  src={photo}
                  alt={u.name}
                  className="discover-tile__img"
                  loading="lazy"
                />
                {u.isOnline && <span className="discover-tile__online" />}
                {(() => {
                  // Prefer live client-side distance when we have both my
                  // coords and the target's coords. Falls back to the
                  // server-computed value (from geoNear) otherwise.
                  const theirCoords = Array.isArray(u.location?.coordinates) && u.location.coordinates.length === 2
                    ? { lng: u.location.coordinates[0], lat: u.location.coordinates[1] }
                    : null;
                  const liveKm = liveCoords && theirCoords ? haversineKm(liveCoords, theirCoords) : null;
                  const km = liveKm != null ? liveKm : u.distance;
                  return km != null ? (
                    <span className="discover-tile__distance">
                      {formatDistance(km)}
                    </span>
                  ) : null;
                })()}
                <div className="discover-tile__overlay">
                  <div className="discover-tile__nameline">
                    <span className="discover-tile__name">{u.name}</span>
                    {u.isVerified && (
                      <span className="discover-tile__verified">✓</span>
                    )}
                  </div>
                  {age != null && (
                    <span className="discover-tile__age">{age}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Discover;
