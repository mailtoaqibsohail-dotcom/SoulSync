// Tiny stale-while-revalidate cache backed by localStorage.
//
// Why: on Android (Capacitor wrapper), every cold start re-renders the
// React app from zero. Without a cache, users see spinners on Inbox /
// Discover / Profile while the network round-trips. With this cache, the
// last-known data renders instantly and a background fetch updates it
// in place — so the app feels "native and instant" the way WhatsApp does.
//
// localStorage persists across app launches inside the Capacitor WebView
// (it's tied to the https://localhost origin sandbox per app), so cached
// content survives even after the OS kills the process.
//
// Usage:
//   const cached = readCache('matches');
//   if (cached) setMatches(cached);
//   axios.get('/api/matches').then(({ data }) => {
//     setMatches(data.matches);
//     writeCache('matches', data.matches);
//   });

const PREFIX = 'cache:';
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 h — only used to invalidate
                                            // if a value sits unused for a day.
                                            // Live updates always overwrite.

export function readCache(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.exp && Date.now() > parsed.exp) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
}

export function writeCache(key, value, ttlMs = DEFAULT_TTL_MS) {
  try {
    const payload = JSON.stringify({
      value,
      exp: Date.now() + ttlMs,
    });
    localStorage.setItem(PREFIX + key, payload);
  } catch {
    // Quota exceeded — drop oldest cache entries and retry once.
    try {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith(PREFIX)) localStorage.removeItem(k);
      }
      localStorage.setItem(PREFIX + key, JSON.stringify({ value, exp: Date.now() + ttlMs }));
    } catch { /* give up silently */ }
  }
}

export function clearCache(keyOrPrefix) {
  try {
    if (!keyOrPrefix) {
      // Wipe all our caches — used on logout.
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith(PREFIX)) localStorage.removeItem(k);
      }
      return;
    }
    // Match either an exact key or a prefix (e.g. clearCache('profile:')).
    const full = PREFIX + keyOrPrefix;
    for (const k of Object.keys(localStorage)) {
      if (k === full || k.startsWith(full)) localStorage.removeItem(k);
    }
  } catch { /* */ }
}
