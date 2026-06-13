// Server-side FCM push helper.
//
// Initializes firebase-admin lazily so the server doesn't crash when the
// service-account credentials aren't installed yet. If Firebase isn't
// configured, every sendPush(...) call becomes a no-op and prints a
// one-time warning — the rest of the API keeps working without push.
//
// Credential discovery, in order:
//   1. process.env.FIREBASE_SERVICE_ACCOUNT — full JSON as a string
//      (preferred for the production server — set it in DirectAdmin's
//       Node.js Selector → Application Variables.)
//   2. process.env.GOOGLE_APPLICATION_CREDENTIALS — path to a JSON file
//   3. ./firebase-service-account.json next to this server (dev only)
//
// All three forms work with the standard service-account JSON Firebase
// hands you when you do "Project Settings → Service accounts → Generate
// new private key".

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let firebaseApp = null;
let initAttempted = false;
let warnedMissing = false;

function getFirebaseApp() {
  if (firebaseApp) return firebaseApp;
  if (initAttempted) return null;
  initAttempted = true;

  let credential = null;

  // 1. Inline JSON from env var.
  const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (inlineJson) {
    try {
      const parsed = JSON.parse(inlineJson);
      credential = admin.credential.cert(parsed);
    } catch (err) {
      console.error('[push] FIREBASE_SERVICE_ACCOUNT env var is set but not valid JSON:', err.message);
    }
  }

  // 2. Path-based credentials (firebase-admin auto-detects this env too).
  if (!credential && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      credential = admin.credential.applicationDefault();
    } catch (err) {
      console.error('[push] GOOGLE_APPLICATION_CREDENTIALS path failed:', err.message);
    }
  }

  // 3. Local file fallback for development.
  if (!credential) {
    const localFile = path.resolve(__dirname, '..', 'firebase-service-account.json');
    if (fs.existsSync(localFile)) {
      try {
        credential = admin.credential.cert(require(localFile));
      } catch (err) {
        console.error('[push] firebase-service-account.json found but invalid:', err.message);
      }
    }
  }

  if (!credential) {
    if (!warnedMissing) {
      console.warn(
        '[push] Firebase Admin not configured — push notifications disabled.\n' +
        '       Set FIREBASE_SERVICE_ACCOUNT (env, JSON string) on the server\n' +
        '       to enable. See utils/push.js for details.'
      );
      warnedMissing = true;
    }
    return null;
  }

  try {
    firebaseApp = admin.initializeApp({ credential });
    console.log('[push] Firebase Admin initialized');
    return firebaseApp;
  } catch (err) {
    console.error('[push] initializeApp failed:', err.message);
    return null;
  }
}

// Send a push notification to every device registered for `userId`.
// Silently skips if Firebase isn't configured or the user has no tokens.
//
// payload:
//   {
//     title:   'Aqib sent you a message',     // shown in notification
//     body:    'Hello! How are you?',          // shown in notification body
//     data:    { matchId: '...', kind: 'message', userId: '...' }
//                                              // delivered to the app for
//                                              // deep-link routing on tap
//     channel: 'messages' | 'calls'            // Android channel for sound
//                                              // / heads-up behaviour
//   }
async function sendPush(userId, payload = {}) {
  const app = getFirebaseApp();
  if (!app) return { sent: 0, reason: 'firebase_not_configured' };
  if (!userId) return { sent: 0, reason: 'no_user_id' };

  const User = require('../models/User');
  const user = await User.findById(userId).select('pushTokens').lean();
  if (!user?.pushTokens?.length) return { sent: 0, reason: 'no_tokens' };

  const tokens = user.pushTokens.map((t) => t.token).filter(Boolean);
  if (!tokens.length) return { sent: 0, reason: 'no_tokens' };

  // Strings only — FCM requires `data` values to be strings.
  const data = {};
  for (const [k, v] of Object.entries(payload.data || {})) {
    if (v == null) continue;
    data[k] = String(v);
  }

  const channelId = payload.channel || 'messages';

  // Calls need higher priority + a longer ttl + the call-specific channel
  // so the device wakes from Doze and rings even when locked.
  const isCall = channelId === 'calls';

  // For calls we want our native MessagingService to render the full-screen
  // ringing UI (CallStyle + setFullScreenIntent) — sending `notification`
  // would cause FCM to auto-display a plain tray notification when the app
  // is backgrounded, which would race with our custom UI. So calls go out
  // as data-only messages; messages keep the standard notification payload
  // for fast-path delivery.
  const message = isCall
    ? {
        tokens,
        data: {
          ...data,
          // Mirror the title/body into data so the native side can display
          // them on the call screen. (FCM data values must be strings.)
          notif_title: payload.title || 'Spark',
          notif_body: payload.body || '',
        },
        android: {
          priority: 'high',
          ttl: 30 * 1000,
          // No `notification` block — pure data message, handled by our
          // FirebaseMessagingService.
        },
      }
    : {
        tokens,
        notification: {
          title: payload.title || 'Spark',
          body: payload.body || '',
        },
        data,
        android: {
          priority: 'high',
          ttl: 24 * 60 * 60 * 1000,
          notification: {
            channelId,
            sound: 'default',
            priority: 'high',
            defaultVibrateTimings: true,
          },
        },
      };

  try {
    const res = await app.messaging().sendEachForMulticast(message);

    // Prune any tokens FCM tells us are stale so we don't keep retrying.
    if (res.failureCount > 0) {
      const stale = [];
      res.responses.forEach((r, i) => {
        if (!r.success) {
          const code = r.error?.code || '';
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token'
          ) {
            stale.push(tokens[i]);
          }
        }
      });
      if (stale.length) {
        await User.updateOne(
          { _id: userId },
          { $pull: { pushTokens: { token: { $in: stale } } } }
        );
      }
    }

    return { sent: res.successCount, failed: res.failureCount };
  } catch (err) {
    console.error('[push] sendEachForMulticast error:', err.message);
    return { sent: 0, error: err.message };
  }
}

// Convenience wrappers — use these from routes/socket so call sites stay
// readable and we centralise the title/body strings.
async function pushNewMessage(receiverId, { senderName, text, matchId, mediaType }) {
  let body = text;
  if (!body) {
    if (mediaType === 'image') body = '📷 Photo';
    else if (mediaType === 'video') body = '🎬 Video';
    else if (mediaType === 'audio') body = '🎤 Voice message';
    else body = 'Sent you a message';
  }
  if (body.length > 120) body = body.slice(0, 117) + '…';

  return sendPush(receiverId, {
    title: senderName || 'Spark',
    body,
    channel: 'messages',
    data: { kind: 'message', matchId },
  });
}

async function pushNewMatch(receiverId, { otherName, otherUserId }) {
  return sendPush(receiverId, {
    title: "It's a match! 🔥",
    body: `You and ${otherName || 'someone'} liked each other`,
    channel: 'messages',
    data: { kind: 'match', userId: otherUserId },
  });
}

// Tell the callee's device to dismiss the ringing UI — caller hung up
// before they answered. Data-only, very short TTL — if the device isn't
// reachable in time the local 35s timeout in IncomingCallActivity will
// fire anyway.
async function pushCancelCall(receiverId, { matchId }) {
  return sendPush(receiverId, {
    title: '',
    body: '',
    channel: 'calls',
    data: { kind: 'callCancel', matchId: matchId || '' },
  });
}

async function pushIncomingCall(receiverId, { callerName, callType, matchId, callerId, callerPhoto }) {
  return sendPush(receiverId, {
    title: callerName || 'Spark',
    body: `Incoming ${callType === 'video' ? 'video' : 'voice'} call`,
    channel: 'calls',
    data: {
      kind: 'call',
      callType: callType || 'audio',
      matchId,
      callerId: callerId || '',
      callerName: callerName || '',
      callerPhoto: callerPhoto || '',
    },
  });
}

module.exports = {
  sendPush,
  pushNewMessage,
  pushNewMatch,
  pushIncomingCall,
  pushCancelCall,
};
