// Capacitor-native bootstrap. No-op in the browser build; only does work
// when the app runs inside the Android (or iOS) wrapper.
//
// Static imports (not dynamic) — chunk-loading inside the WebView's
// https://localhost origin has been flaky in past sessions, and statics
// just bundle into the main chunk safely.

import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { PushNotifications } from '@capacitor/push-notifications';

let bootstrapped = false;

export async function initCapacitor() {
  if (bootstrapped) return;
  bootstrapped = true;

  if (!Capacitor?.isNativePlatform?.()) return;

  // Splash screen — fade out as soon as React has mounted.
  try {
    await SplashScreen.hide({ fadeOutDuration: 200 });
  } catch (e) { console.warn('[boot] splash hide failed:', e?.message); }

  // Status bar — match dark app theme.
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0d0d0d' });
  } catch (e) { console.warn('[boot] status bar failed:', e?.message); }

  // Push notifications — request permission, register, persist FCM token.
  // Auto-detected: we try register() but swallow the IllegalStateException
  // that fires when google-services.json hasn't been added yet. This lets
  // the same APK work with-or-without Firebase, so testers can run it
  // before the Firebase setup is finished.
  try {
    const perm = await PushNotifications.checkPermissions();
    let granted = perm.receive === 'granted';
    if (!granted) {
      const req = await PushNotifications.requestPermissions();
      granted = req.receive === 'granted';
    }
    if (!granted) return;

    PushNotifications.addListener('registration', async (token) => {
      try {
        await axios.post('/api/users/push-token', {
          token: token.value,
          platform: 'android',
        });
      } catch {
        try { localStorage.setItem('pending_push_token', token.value); } catch { /* */ }
      }
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.warn('[push] registration error:', err);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const data = action.notification?.data || {};
      if (data.kind === 'call' && data.matchId) {
        // Calls land in the chat — the active CallContext will pick up
        // the incoming-call socket event when the page mounts.
        window.location.assign(`/chat/${data.matchId}`);
      } else if (data.matchId) {
        window.location.assign(`/chat/${data.matchId}`);
      } else if (data.userId) {
        window.location.assign(`/profile/${data.userId}`);
      }
    });

    // Foreground delivery: when a push arrives while the app is open,
    // Android still pops the system banner. Suppress it if the user is
    // already looking at that chat thread — they're getting the message
    // through the live socket already, a banner on top would be noise.
    PushNotifications.addListener('pushNotificationReceived', (notif) => {
      try {
        const data = notif?.data || {};
        if (data.kind === 'message' && data.matchId) {
          const onThisChat = window.location.pathname === `/chat/${data.matchId}`;
          if (onThisChat) {
            // No public API to cancel the banner from JS, but we can at
            // least dismiss it from the tray a tick later.
            setTimeout(() => {
              PushNotifications.removeAllDeliveredNotifications().catch(() => {});
            }, 50);
          }
        }
      } catch { /* never let a banner break the app */ }
    });

    await PushNotifications.register();
  } catch (e) {
    console.warn('[push] init failed:', e?.message);
  }
}

// Helper called from AuthContext after a successful login — flushes any
// FCM token captured before the user was authenticated.
export async function flushPendingPushToken() {
  try {
    const t = localStorage.getItem('pending_push_token');
    if (!t) return;
    await axios.post('/api/users/push-token', { token: t, platform: 'android' });
    localStorage.removeItem('pending_push_token');
  } catch { /* try again next login */ }
}
