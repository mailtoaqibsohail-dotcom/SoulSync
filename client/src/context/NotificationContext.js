import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

// Module-level handoff for the incoming offer + buffered ICE candidates.
// We keep this outside React state because Call.jsx needs to consume the
// current values synchronously on mount (state updates would be async).
let pendingOffer = null;              // { offer, from, callType, matchId }
let bufferedIceCandidates = [];       // [{ candidate, from }]

export const NotificationProvider = ({ children }) => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState({}); // { matchId: count }
  const [matchPopup, setMatchPopup] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);   // { from, fromName, callType, matchId }

  const ringtoneRef = useRef(null);

  // ── iPhone-style "ping" for incoming messages ──────────
  const playPing = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;
      // Two quick sine pings at ~880Hz/1320Hz — similar to iPhone Tri-tone / Note
      const makePing = (freq, start, dur = 0.18) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.22, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(start); osc.stop(start + dur + 0.02);
      };
      makePing(880, now);
      makePing(1320, now + 0.12);
      setTimeout(() => ctx.close(), 500);
    } catch (err) { /* autoplay blocked — silent */ }
  };

  const totalUnreadMessages = Object.values(unreadMessages).reduce((a, b) => a + b, 0);
  const unreadNotifications = notifications.filter((n) => !n.read).length;

  const addNotification = useCallback((notif) => {
    setNotifications((prev) => [{ ...notif, id: Date.now(), read: false, time: new Date() }, ...prev]);
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const incrementUnread = useCallback((matchId) => {
    setUnreadMessages((prev) => ({ ...prev, [matchId]: (prev[matchId] || 0) + 1 }));
  }, []);

  const clearUnread = useCallback((matchId) => {
    setUnreadMessages((prev) => { const next = { ...prev }; delete next[matchId]; return next; });
  }, []);

  // ── Ringtone helpers ────────────────────────────────────
  const startRingtone = () => {
    try {
      if (!ringtoneRef.current) {
        // Simple beep-style loop synthesized via Web Audio — no asset needed.
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const gain = ctx.createGain();
        gain.gain.value = 0.08;
        gain.connect(ctx.destination);
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 520;
        osc.connect(gain);
        osc.start();
        // Pulsate on/off every 500ms to sound like a ring
        const interval = setInterval(() => {
          gain.gain.value = gain.gain.value > 0 ? 0 : 0.08;
        }, 500);
        ringtoneRef.current = { ctx, osc, interval };
      }
    } catch (err) {
      console.warn('Could not start ringtone:', err);
    }
  };

  const stopRingtone = () => {
    try {
      if (ringtoneRef.current) {
        clearInterval(ringtoneRef.current.interval);
        ringtoneRef.current.osc.stop();
        ringtoneRef.current.ctx.close();
        ringtoneRef.current = null;
      }
    } catch {}
  };

  // ── Incoming-call actions ───────────────────────────────
  const acceptCall = useCallback(() => {
    if (!incomingCall) return;
    stopRingtone();
    const { matchId, callType, from } = incomingCall;
    // Stash peer id so Call.jsx can pick it up (route params don't carry it otherwise)
    setIncomingCall(null);
    navigate(`/call/${matchId}?type=${callType}&userId=${user._id}&peerId=${from}&caller=false`);
  }, [incomingCall, navigate, user]);

  const rejectCall = useCallback(() => {
    if (!incomingCall) return;
    stopRingtone();
    socket?.emit('call:reject', { to: incomingCall.from, matchId: incomingCall.matchId });
    pendingOffer = null;
    bufferedIceCandidates = [];
    setIncomingCall(null);
  }, [incomingCall, socket]);

  // ── Socket subscriptions ────────────────────────────────
  useEffect(() => {
    if (!socket || !user) return;

    const onOffer = (data) => {
      // Ignore our own offer echo (shouldn't happen, but safe)
      if (data.from === user._id) return;
      // Save the offer so Call.jsx can consume it after navigation
      pendingOffer = data;
      bufferedIceCandidates = [];
      setIncomingCall({
        from: data.from,
        fromName: data.fromName || 'Someone',
        callType: data.callType,
        matchId: data.matchId,
      });
      startRingtone();
    };

    const onIce = (data) => {
      // If Call page hasn't mounted yet, buffer. If it has mounted, it owns the
      // listener (see Call.jsx) — but we still buffer harmlessly during the
      // brief window between accepting and the page setting up its peer conn.
      bufferedIceCandidates.push(data);
    };

    const onCancelled = () => {
      // Caller hung up before we answered
      stopRingtone();
      pendingOffer = null;
      bufferedIceCandidates = [];
      setIncomingCall(null);
    };

    const onNewMatch = (data) => {
      setMatchPopup(data);
      addNotification({ type: 'match', text: `You matched with ${data.user?.name}!`, user: data.user, matchId: data.matchId });
    };

    const onReceiveMessage = (msg) => {
      const currentPath = window.location.pathname;
      if (!currentPath.includes(msg.matchId)) {
        incrementUnread(msg.matchId);
        addNotification({
          type: 'message',
          text: `${msg.sender?.name || 'Someone'}: ${msg.text?.slice(0, 40) || 'Sent a photo'}`,
          matchId: msg.matchId,
          user: msg.sender,
        });
        playPing();
      }
    };

    const onSpark = ({ fromName, fromPhoto, from }) => {
      addNotification({
        type: 'spark',
        text: `🔥 ${fromName || 'Someone'} sent you a Spark!`,
        user: { _id: from, name: fromName, profilePhoto: fromPhoto },
      });
      playPing();
    };

    socket.on('call:offer', onOffer);
    socket.on('call:ice-candidate', onIce);
    socket.on('call:ended', onCancelled);
    socket.on('call:cancelled', onCancelled);
    socket.on('new_match', onNewMatch);
    socket.on('receive_message', onReceiveMessage);
    socket.on('spark_received', onSpark);

    return () => {
      socket.off('call:offer', onOffer);
      socket.off('call:ice-candidate', onIce);
      socket.off('call:ended', onCancelled);
      socket.off('call:cancelled', onCancelled);
      socket.off('new_match', onNewMatch);
      socket.off('receive_message', onReceiveMessage);
      socket.off('spark_received', onSpark);
    };
  }, [socket, user, addNotification, incrementUnread]);

  return (
    <NotificationContext.Provider value={{
      notifications, unreadNotifications, unreadMessages,
      totalUnreadMessages, matchPopup, setMatchPopup,
      addNotification, markAllRead, incrementUnread, clearUnread,
      incomingCall, acceptCall, rejectCall,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);

// Called by Call.jsx (callee side) to pick up the buffered offer + ICE candidates.
// Returns { offer, candidates } or null if there's nothing pending.
export const consumePendingCall = () => {
  if (!pendingOffer) return null;
  const out = { offer: pendingOffer.offer, from: pendingOffer.from, candidates: bufferedIceCandidates.slice() };
  pendingOffer = null;
  bufferedIceCandidates = [];
  return out;
};
