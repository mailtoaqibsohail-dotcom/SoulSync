import { useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// Auto-locate + reverse-geocode the logged-in user and persist the result to
// their profile. Fires once on mount (when user is authenticated) and keeps
// updating on significant movement via watchPosition.
//
// Design goals:
//   - Real-time city name (Bumble-style) — if the user travels, their profile
//     shows their actual current city, not a stale self-entered value.
//   - User cannot override — this runs in the background for every session,
//     overwriting any manual edits.
//   - Rate-limited: Nominatim asks for ≤ 1 req/sec per IP. We only reverse
//     geocode when the position has moved more than ~500 m OR it's been
//     more than 10 minutes since the last geocode — whichever comes first.
//   - Silent failure: if the browser blocks geolocation or Nominatim is
//     unreachable, the hook degrades silently. The existing Discover flow
//     still works via browser coords even without a stored city.

// Haversine distance in metres between two {lat, lng} points.
const distMeters = (a, b) => {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

const MIN_MOVE_METERS = 500;          // ignore jitter below this
const MIN_INTERVAL_MS = 10 * 60 * 1000; // also geocode at least every 10 min

const reverseGeocode = async (lat, lng) => {
  // Nominatim requires a descriptive User-Agent, but browsers don't let us
  // set it. It's still acceptable from a browser if traffic is modest; if we
  // outgrow this, swap for a paid provider (Google Geocoding / Mapbox).
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&addressdetails=1`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`nominatim ${res.status}`);
  const data = await res.json();
  const a = data.address || {};
  const city = a.city || a.town || a.village || a.municipality || a.county || '';
  const country = a.country || '';
  return { city, country };
};

const useAutoLocation = () => {
  const { user, updateUser } = useAuth();
  const lastPersistedRef = useRef(null); // { lat, lng, at }

  useEffect(() => {
    if (!user) return;
    if (!navigator.geolocation) return;

    let cancelled = false;

    const maybePersist = async (lat, lng) => {
      const last = lastPersistedRef.current;
      const now = Date.now();
      if (last) {
        const moved = distMeters(last, { lat, lng });
        const fresh = now - last.at < MIN_INTERVAL_MS;
        if (moved < MIN_MOVE_METERS && fresh) return;
      }
      try {
        const { city, country } = await reverseGeocode(lat, lng);
        if (cancelled) return;
        const { data } = await axios.patch('/api/users/location', {
          lat,
          lng,
          city,
          country,
        });
        lastPersistedRef.current = { lat, lng, at: now };
        if (data?.user) {
          // Keep local state in sync so profile / nav show the new city.
          updateUser({ location: data.user.location });
        }
      } catch (err) {
        // Nominatim may 429 or the user may be offline. Retry on next
        // significant movement.
        console.warn('[useAutoLocation] persist failed:', err?.message);
      }
    };

    // Kick once — fast fix for missing location on a fresh account.
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => maybePersist(coords.latitude, coords.longitude),
      (err) => console.warn('[useAutoLocation] initial position failed:', err?.code),
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 15_000 }
    );

    // Keep tracking so travel updates the stored city automatically.
    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => maybePersist(coords.latitude, coords.longitude),
      (err) => console.warn('[useAutoLocation] watch error:', err?.code),
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 60_000 }
    );

    return () => {
      cancelled = true;
      navigator.geolocation.clearWatch(watchId);
    };
    // user?._id so we restart the watcher after login/logout cycles
  }, [user?._id, updateUser]);
};

export default useAutoLocation;
