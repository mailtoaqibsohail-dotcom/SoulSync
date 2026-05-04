// Capacitor-native bootstrap. No-op in the browser build; only does work
// when the app runs inside the Android (or iOS) wrapper.
//
// What this does:
//   1. Asks the OS for push-notification permission and registers an FCM
//      token. The token is POSTed to /api/users/push-token so the server
//      can target the device when sending pushes.
//   2. Listens for taps on incoming pushes and routes the user to the
//      relevant screen (chat, match, etc).
//   3. Hides the native splash on first paint.
//
// On the web, none of this runs — `Capacitor.isNativePlatform()` is false.

import axios from 'axios';

let bootstrapped = false;

export async function initCapacitor() {
  if (bootstrapped) return;
  bootstrapped = true;

  let Capacitor;
  try {
    ({ Capacitor } = await import('@capacitor/core'));
  } catch {
    return; // Capacitor not installed — web build, nothing to do.
  }
  if (!Capacitor?.isNativePlatform?.()) return;

  // Splash screen — fade out as soon as React has mounted.
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => {});
  } catch { /* plugin missing is fine */ }

  // Status bar — match dark app theme.
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    StatusBar.setBackgroundColor({ color: '#0d0d0d' }).catch(() => {});
  } catch { /* */ }

  // Push notifications.
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    const perm = await PushNotifications.checkPermissions();
    let granted = perm.receive === 'granted';
    if (!granted) {
      const req = await PushNotifications.requestPermissions();
      granted = req.receive === 'granted';
    }
    if (!granted) return;

    await PushNotifications.register();

    PushNotifications.addListener('registration', async (token) => {
      // FCM token. Persist it so the server can push to this device.
      try {
        await axios.post('/api/users/push-token', {
          token: token.value,
          platform: 'android',
        });
      } catch (err) {
        // No auth yet (logged out) — we'll retry after login via the
        // post-login hook. For now, stash it.
        try { localStorage.setItem('pending_push_token', token.value); } catch { /* */ }
      }
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.warn('[push] registration error:', err);
    });

    // Tap on a push notification → deep-link into the app.
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const data = action.notification?.data || {};
      if (data.matchId) {
        window.location.hash = ''; // ensure no stale hash
        window.location.assign(`/chat/${data.matchId}`);
      } else if (data.userId) {
        window.location.assign(`/profile/${data.userId}`);
      }
    });
  } catch (err) {
    console.warn('[push] init failed:', err);
  }
}

// Helper called from AuthContext after a successful login — flushes any
// FCM token that was captured before the user was authenticated.
export async function flushPendingPushToken() {
  try {
    const t = localStorage.getItem('pending_push_token');
    if (!t) return;
    await axios.post('/api/users/push-token', { token: t, platform: 'android' });
    localStorage.removeItem('pending_push_token');
  } catch { /* try again next login */ }
}
