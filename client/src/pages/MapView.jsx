import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiArrowLeft, FiMapPin } from 'react-icons/fi';
import { DEFAULT_AVATAR } from '../utils/defaults';
import { useAuth } from '../context/AuthContext';
import './MapView.css';

const GMAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';

// Load the Google Maps JS API once per page lifetime.
let mapsLoaderPromise = null;
const loadGoogleMaps = () => {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (mapsLoaderPromise) return mapsLoaderPromise;
  mapsLoaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GMAPS_KEY)}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });
  return mapsLoaderPromise;
};

const MapView = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [needsOptIn, setNeedsOptIn] = useState(false);
  const [users, setUsers] = useState([]);

  const myShowOnMap = !!user?.privacy?.showOnMap;

  useEffect(() => {
    if (!myShowOnMap) {
      setNeedsOptIn(true);
      setLoading(false);
      return;
    }
    if (!GMAPS_KEY) {
      setErrorMsg('Map is unavailable — Google Maps API key not configured.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const init = async () => {
      try {
        // Get current coords (browser geolocation, fall back to nothing).
        const myCoords = await new Promise((resolve) => {
          if (!navigator.geolocation) return resolve(null);
          navigator.geolocation.getCurrentPosition(
            ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
            () => resolve(null),
            { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 }
          );
        });

        // Fetch opted-in nearby users.
        const params = {};
        if (myCoords) {
          params.lat = myCoords.lat;
          params.lng = myCoords.lng;
        }
        const { data } = await axios.get('/api/users/map', { params });
        if (cancelled) return;
        setUsers(data.users || []);

        // Boot the map.
        const maps = await loadGoogleMaps();
        if (cancelled || !mapDivRef.current) return;

        const center = myCoords ||
          (data.users?.[0]?.location?.coordinates
            ? { lat: data.users[0].location.coordinates[1], lng: data.users[0].location.coordinates[0] }
            : { lat: 0, lng: 0 });

        mapRef.current = new maps.Map(mapDivRef.current, {
          center,
          zoom: 12,
          disableDefaultUI: false,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        });

        // "You are here" marker.
        if (myCoords) {
          new maps.Marker({
            position: myCoords,
            map: mapRef.current,
            title: 'You',
            icon: {
              path: maps.SymbolPath.CIRCLE,
              scale: 9,
              fillColor: '#2563eb',
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 3,
            },
          });
        }

        // User markers.
        (data.users || []).forEach((u) => {
          const c = u.location?.coordinates;
          if (!Array.isArray(c) || c.length !== 2) return;
          const marker = new maps.Marker({
            position: { lat: c[1], lng: c[0] },
            map: mapRef.current,
            title: u.name,
            icon: {
              path: maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#ec4899',
              fillOpacity: 0.95,
              strokeColor: '#fff',
              strokeWeight: 2,
            },
          });
          marker.addListener('click', () => navigate(`/profile/${u._id}`));
          markersRef.current.push(marker);
        });

        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        const status = err.response?.status;
        const reason = err.response?.data?.reason;
        if (status === 403 && reason === 'not_opted_in') {
          setNeedsOptIn(true);
        } else {
          setErrorMsg(err.response?.data?.message || 'Could not load map');
        }
        setLoading(false);
      }
    };

    init();
    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
    };
  }, [myShowOnMap, navigate]);

  return (
    <div className="mapview-page">
      <div className="mapview-header">
        <button className="mapview-back" onClick={() => navigate(-1)} aria-label="Back">
          <FiArrowLeft size={20} />
        </button>
        <h2 className="mapview-title">
          <FiMapPin size={18} style={{ marginRight: 6 }} />
          Nearby on map
        </h2>
        <div style={{ width: 36 }} />
      </div>

      <div className="mapview-privacy-note">
        Locations are approximate (200-400m). Only people who opted in are shown.
      </div>

      {needsOptIn ? (
        <div className="mapview-empty">
          <span className="mapview-empty__icon">🗺️</span>
          <h3>Map sharing is off</h3>
          <p>
            To see others on the map, you must also be visible on it. Turn on
            "Show me on map" in your profile settings.
          </p>
          <button className="btn-primary" onClick={() => navigate('/profile/me')}>
            Open settings
          </button>
        </div>
      ) : errorMsg ? (
        <div className="mapview-empty">
          <span className="mapview-empty__icon">⚠️</span>
          <h3>Can't load the map</h3>
          <p>{errorMsg}</p>
        </div>
      ) : (
        <>
          <div ref={mapDivRef} className="mapview-canvas" />
          {loading && (
            <div className="mapview-loading">
              <div className="spinner" />
              <p>Loading map…</p>
            </div>
          )}
          {!loading && users.length === 0 && (
            <div className="mapview-overlay-empty">
              No opted-in users nearby right now.
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MapView;
