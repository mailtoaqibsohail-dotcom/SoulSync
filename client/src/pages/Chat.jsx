import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNotifications } from '../context/NotificationContext';
import {
  FiSend, FiArrowLeft, FiImage, FiMic, FiVideo,
  FiPhone, FiX, FiClock, FiEye, FiMoreVertical, FiCheck
} from 'react-icons/fi';
import { playSendSound, playReceiveSound } from '../utils/sounds';
import { DEFAULT_AVATAR } from '../utils/defaults';
import MessageBubble from '../components/MessageBubble';
import './Chat.css';

const Chat = ({ matchId: matchIdProp, embedded = false, onMatchLoaded, onMessagesChange }) => {
  // Support two modes:
  //   - Route mode: rendered at /chat/:matchId — pulls matchId from the URL.
  //   - Embedded mode: Inbox renders this inside a pane and passes matchId +
  //     embedded={true} so we swap out the standalone-page chrome (back
  //     button, header card) for the inbox layout.
  const params = useParams();
  const matchId = matchIdProp || params.matchId;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();
  const { clearUnread } = useNotifications();

  const [messages, setMessages] = useState([]);
  const [match, setMatch] = useState(null);
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMedia, setShowMedia] = useState(false);

  // Disappearing photo state
  const [pendingMedia, setPendingMedia] = useState(null); // { file, preview, type }
  const [disappearing, setDisappearing] = useState(false);

  // Recording state
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunks = useRef([]);

  // Options menu + disappearing-messages state
  const [showOptions, setShowOptions] = useState(false);
  const [disappearMode, setDisappearMode] = useState('never'); // 'never' | 'immediately' | '24h'

  // Reply composer — set when a user swipe-to-replies on a message. Cleared
  // after the next send, or when the user taps the X in the banner.
  const [replyingTo, setReplyingTo] = useState(null);

  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // Load messages
  useEffect(() => {
    const load = async () => {
      try {
        const [msgRes, matchRes] = await Promise.all([
          axios.get(`/api/matches/${matchId}/messages`),
          axios.get('/api/matches'),
        ]);
        setMessages(msgRes.data.messages);
        const found = matchRes.data.matches.find(
          (m) => m.matchId.toString() === matchId
        );
        setMatch(found || null);
        if (found?.disappearing) setDisappearMode(found.disappearing);
        // Notify parent (Inbox) of the loaded match so the right-panel
        // profile can re-render without re-fetching.
        if (onMatchLoaded) onMatchLoaded({ match: found, messages: msgRes.data.messages });
      } catch (err) {
        console.error('Chat load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
    clearUnread(matchId);
  }, [matchId, clearUnread]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const onReceive = (msg) => {
      // FIX: Compare matchId as strings — the populated message from server
      // has matchId as a MongoDB ObjectId object, so call toString()
      if (msg.matchId?.toString() === matchId) {
        setMessages((prev) => {
          // Avoid duplicate if we already added an optimistic copy
          const alreadyExists = prev.some(
            (m) => m._id === msg._id
          );
          if (alreadyExists) return prev;
          return [...prev, msg];
        });
        // Don't play receive sound for our own echoes (defensive — server
        // filters but a misrouted echo shouldn't beep the sender).
        if (msg.sender?._id !== user._id && msg.sender !== user._id) {
          playReceiveSound();
        }
        socket.emit('messages_read', { matchId, userId: user._id });
      }
    };

    const onTypingStart = ({ matchId: mid }) => {
      if (mid?.toString() === matchId) setIsTyping(true);
    };
    const onTypingStop = ({ matchId: mid }) => {
      if (mid?.toString() === matchId) setIsTyping(false);
    };

    // FIX: Store handler references so we can remove the exact listeners on cleanup
    const onDisappearChanged = ({ matchId: mid, mode }) => {
      if (mid === matchId) setDisappearMode(mode);
    };

    // Reaction update broadcast from server — patch the single message in
    // place so we don't have to reload the whole conversation.
    const onReacted = ({ matchId: mid, messageId, reactions }) => {
      if (mid?.toString() !== matchId) return;
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
      );
    };

    socket.on('receive_message', onReceive);
    socket.on('user_typing', onTypingStart);
    socket.on('user_stopped_typing', onTypingStop);
    socket.on('disappearing_changed', onDisappearChanged);
    socket.on('message_reacted', onReacted);
    socket.emit('messages_read', { matchId, userId: user._id });

    return () => {
      socket.off('receive_message', onReceive);
      socket.off('user_typing', onTypingStart);
      socket.off('user_stopped_typing', onTypingStop);
      socket.off('disappearing_changed', onDisappearChanged);
      socket.off('message_reacted', onReacted);
      // Tell server the chat closed — triggers deletion in 'immediately' mode
      socket.emit('chat_closed', { matchId, userId: user._id });
    };
  }, [socket, matchId, user._id]);

  // Change disappearing-messages mode
  const applyDisappearing = async (mode) => {
    try {
      await axios.patch(`/api/matches/${matchId}/disappearing`, { mode });
      setDisappearMode(mode);
      setShowOptions(false);
    } catch { alert('Failed to update'); }
  };

  useEffect(() => {
    // Double-rAF: wait for the layout after the new message renders (and for
    // sticky bars to settle) before scrolling, otherwise the target is still
    // clipped behind the input bar on mobile.
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      });
    });
    // Propagate messages up to Inbox so the right-panel Media/Links tabs
    // can derive their grid from them without re-fetching.
    if (onMessagesChange) onMessagesChange(messages);
    return () => cancelAnimationFrame(id);
  }, [messages, onMessagesChange]);

  // Mobile keyboard handling: the virtual keyboard shrinks the visualViewport
  // but leaves `window.innerHeight` unchanged, so a plain 100vh page keeps its
  // bottom under the keyboard. We expose the current visualViewport height as
  // a CSS var `--vvh` and Chat.css uses it as the page height.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const sync = () => {
      document.documentElement.style.setProperty('--vvh', `${vv.height}px`);
      // Also nudge the view to the bottom when the keyboard opens, so the
      // input stays visible.
      bottomRef.current?.scrollIntoView({ block: 'end' });
    };
    sync();
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    return () => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
      document.documentElement.style.removeProperty('--vvh');
    };
  }, []);

  // Send text message
  const handleSend = useCallback(() => {
    if (!text.trim() || !socket || !match) return;

    const trimmed = text.trim();

    // Optimistic update — add message immediately to UI
    const optimisticMsg = {
      _id: `optimistic-${Date.now()}`,
      matchId,
      sender: user,
      text: trimmed,
      // Embed the reply preview on the optimistic bubble so the user sees
      // the quote immediately; server confirmation will replace it with the
      // server-populated version that has the canonical replyTo doc.
      replyTo: replyingTo
        ? { _id: replyingTo._id, text: replyingTo.text, mediaType: replyingTo.mediaType, sender: replyingTo.sender }
        : null,
      createdAt: new Date().toISOString(),
      read: false,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setText('');
    const replyToId = replyingTo?._id || null;
    setReplyingTo(null);

    // FIX: Ensure receiverId comes from match.user._id (the "other" user)
    socket.emit('send_message', {
      matchId,
      senderId: user._id,
      receiverId: match.user._id,
      text: trimmed,
      replyTo: replyToId,
    });
    playSendSound();
  }, [text, socket, match, matchId, user, replyingTo]);

  // React to a message (called from MessageBubble long-press picker or
  // chip tap). Optimistic: we don't paint locally — the server broadcast
  // reaches us within ~1 frame and patches the message.
  const handleReact = useCallback((msg, emoji) => {
    if (!socket || !msg?._id) return;
    socket.emit('message_react', {
      matchId,
      messageId: msg._id,
      userId: user._id,
      emoji,
    });
  }, [socket, matchId, user._id]);

  // Swipe-to-reply — set the replying state; the banner above the input
  // bar renders and the next send will include replyTo.
  const handleReply = useCallback((msg) => {
    setReplyingTo(msg);
  }, []);

  // Send media (photo/video)
  const handleMediaSelect = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setPendingMedia({ file, preview, type });
    setShowMedia(false);
  };

  const sendMedia = async () => {
    if (!pendingMedia || !match) return;
    const formData = new FormData();
    formData.append('media', pendingMedia.file);
    formData.append('matchId', matchId);
    formData.append('receiverId', match.user._id);
    formData.append('disappearing', disappearing ? 'true' : 'false');
    formData.append('mediaType', pendingMedia.type);

    // Optimistic message
    const tempMsg = {
      _id: `optimistic-${Date.now()}`,
      matchId,
      sender: user,
      mediaUrl: pendingMedia.preview,
      mediaType: pendingMedia.type,
      disappearing,
      viewed: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    setPendingMedia(null);
    setDisappearing(false);

    try {
      // FIX: Do NOT manually set Content-Type for FormData — axios must set it
      // automatically so the multipart boundary is included in the header.
      await axios.post('/api/matches/send-media', formData);
    } catch (err) {
      console.error('Media send failed:', err);
    }
  };

  // Voice recording
  // FIX: Detect a supported mimeType — Safari doesn't support audio/webm,
  // Chrome/Firefox do. We must match the actual recorded format so the
  // blob's bytes and the Content-Type we claim on upload agree.
  const pickAudioMimeType = () => {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4;codecs=mp4a.40.2',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/ogg',
    ];
    if (typeof MediaRecorder === 'undefined') return '';
    for (const t of candidates) {
      if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickAudioMimeType();
      const mr = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunks.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunks.current.push(e.data);
      };
      mr.onstop = () => {
        // FIX: Use the MediaRecorder's actual mimeType, not a hardcoded one.
        // This prevents Safari-MP4-as-webm mismatches that make Cloudinary reject the file.
        const actualType = mr.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(audioChunks.current, { type: actualType });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setRecording(true);
    } catch (err) {
      console.error('Mic error:', err);
      alert('Microphone permission denied or not available');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const sendVoice = async () => {
    if (!audioBlob || !match) return;

    // FIX: Guard against empty recordings (e.g. user stopped before any data arrived)
    if (audioBlob.size === 0) {
      alert('Recording is empty — please try again');
      setAudioBlob(null);
      return;
    }

    // FIX: Match filename extension to actual blob type so Cloudinary/multer
    // can detect the format correctly.
    const type = audioBlob.type || 'audio/webm';
    const ext = type.includes('mp4') ? 'm4a'
              : type.includes('ogg') ? 'ogg'
              : type.includes('wav') ? 'wav'
              : 'webm';

    const formData = new FormData();
    formData.append('media', audioBlob, `voice.${ext}`);
    formData.append('matchId', matchId);
    formData.append('receiverId', match.user._id);
    formData.append('mediaType', 'audio');

    const tempMsg = {
      _id: `optimistic-${Date.now()}`,
      matchId,
      sender: user,
      mediaType: 'audio',
      mediaUrl: URL.createObjectURL(audioBlob),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    setAudioBlob(null);

    try {
      // FIX: No manual Content-Type — axios must set multipart boundary itself
      const res = await axios.post('/api/matches/send-media', formData);
      console.log('Voice sent:', res.data?.message?.mediaUrl);
    } catch (err) {
      // FIX: Surface the real error to the user and log details
      const serverMsg = err.response?.data?.message;
      const status = err.response?.status;
      console.error('Voice send failed:', status, serverMsg, err);
      alert(`Voice send failed${status ? ` (${status})` : ''}: ${serverMsg || err.message}`);
      // Roll back the optimistic message
      setMessages((prev) => prev.filter((m) => m._id !== tempMsg._id));
    }
  };

  // Typing
  const handleTyping = (e) => {
    setText(e.target.value);
    if (!socket || !match) return;
    socket.emit('typing_start', {
      matchId,
      senderId: user._id,
      receiverId: match.user._id,
    });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('typing_stop', {
        matchId,
        senderId: user._id,
        receiverId: match.user._id,
      });
    }, 1500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Video / Audio Call
  const startCall = (type) => {
    navigate(
      `/call/${matchId}?type=${type}&userId=${user._id}&peerId=${match?.user?._id}&caller=true`
    );
  };

  const formatTime = (d) =>
    new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (loading) return <div className="chat-loading"><div className="spinner" /></div>;

  return (
    <div className={`chat-page ${embedded ? 'chat-page--embedded' : ''}`}>
      {/* Header — embedded mode hides the back button (Inbox shows the list
          next to the chat already, no need to navigate back). */}
      <div className="chat-header card">
        {!embedded && (
          <Link to="/matches" className="chat-back"><FiArrowLeft size={22} /></Link>
        )}
        {match && (
          <>
            {/* Center — name (clickable → profile) */}
            <Link to={`/profile/${match.user._id}`} className="chat-header__center">
              <img
                src={match.user.profilePhoto || match.user.photos?.[0] || DEFAULT_AVATAR}
                alt={match.user.name}
                className="chat-header__avatar"
              />
              <div className="chat-header__info">
                <h3>{match.user.name}</h3>
                <span className={`chat-header__status ${match.user.isOnline ? 'online' : ''}`}>
                  {match.user.isOnline ? '● Online' : 'Offline'}
                </span>
              </div>
            </Link>

            {/* Right — call buttons + options menu */}
            <div className="chat-header__calls">
              <button className="chat-call-btn" onClick={() => startCall('audio')} title="Voice call">
                <FiPhone size={18} />
              </button>
              <button className="chat-call-btn" onClick={() => startCall('video')} title="Video call">
                <FiVideo size={18} />
              </button>
              <button className="chat-call-btn" onClick={() => setShowOptions((v) => !v)} title="More options">
                <FiMoreVertical size={18} />
              </button>
            </div>
          </>
        )}

        {showOptions && (
          <div className="chat-options-menu" onMouseLeave={() => setShowOptions(false)}>
            <div className="chat-options-menu__header">
              <FiClock size={14} /> Disappearing messages
            </div>
            {[
              { key: 'immediately', label: 'After reading' },
              { key: '24h', label: 'After 24 hours' },
              { key: 'never', label: 'Never' },
            ].map((opt) => (
              <button
                key={opt.key}
                className={`chat-options-menu__item ${disappearMode === opt.key ? 'active' : ''}`}
                onClick={() => applyDisappearing(opt.key)}
              >
                <span>{opt.label}</span>
                {disappearMode === opt.key && <FiCheck size={16} />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((msg) => {
          const isMine = (msg.sender?._id || msg.sender) === user._id;
          return (
            <MessageBubble
              key={msg._id}
              msg={msg}
              isMine={isMine}
              avatar={match?.user?.profilePhoto}
              currentUserId={user._id}
              onReact={handleReact}
              onReply={handleReply}
              formatTime={formatTime}
            >
              {msg.text && <span>{msg.text}</span>}
              {msg.mediaType === 'image' && (
                <DisappearingImage msg={msg} isMine={isMine} />
              )}
              {msg.mediaType === 'video' && (
                <video src={msg.mediaUrl} controls className="chat-media-video" />
              )}
              {msg.mediaType === 'audio' && msg.mediaUrl && (
                <audio src={msg.mediaUrl} controls preload="metadata" className="chat-media-audio" />
              )}
            </MessageBubble>
          );
        })}

        {isTyping && (
          <div className="chat-bubble-row theirs">
            <div className="chat-bubble chat-bubble--theirs typing-indicator">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Pending media preview */}
      {pendingMedia && (
        <div className="pending-media card">
          {pendingMedia.type === 'image' && <img src={pendingMedia.preview} alt="preview" />}
          {pendingMedia.type === 'video' && <video src={pendingMedia.preview} />}
          <div className="pending-media__controls">
            <label className="disappearing-toggle">
              <input
                type="checkbox"
                checked={disappearing}
                onChange={(e) => setDisappearing(e.target.checked)}
              />
              <FiClock size={14} />
              <span>View once (10s)</span>
            </label>
            <div className="pending-media__btns">
              <button
                className="btn-outline"
                style={{ padding: '8px 16px' }}
                onClick={() => setPendingMedia(null)}
              >
                <FiX size={16} />
              </button>
              <button
                className="btn-primary"
                style={{ padding: '8px 20px' }}
                onClick={sendMedia}
              >
                <FiSend size={16} /> Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice note preview */}
      {audioBlob && (
        <div className="pending-media card" style={{ padding: '12px 16px' }}>
          <audio src={URL.createObjectURL(audioBlob)} controls />
          <div className="pending-media__btns" style={{ marginTop: 8 }}>
            <button
              className="btn-outline"
              style={{ padding: '8px 16px' }}
              onClick={() => setAudioBlob(null)}
            >
              <FiX size={16} />
            </button>
            <button
              className="btn-primary"
              style={{ padding: '8px 20px' }}
              onClick={sendVoice}
            >
              <FiSend size={16} /> Send
            </button>
          </div>
        </div>
      )}

      {/* Media picker */}
      {showMedia && (
        <div className="media-picker card">
          <label className="media-picker__btn">
            <FiImage size={22} /> Photo
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.heic,.heif,.avif,.tiff,.tif,.bmp"
              onChange={(e) => handleMediaSelect(e, 'image')}
              style={{ display: 'none' }}
              multiple={false}
            />
          </label>
          <label className="media-picker__btn">
            <FiVideo size={22} /> Video
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={(e) => handleMediaSelect(e, 'video')}
              style={{ display: 'none' }}
            />
          </label>
          <button
            className="media-picker__btn"
            onClick={() => {
              setShowMedia(false);
              recording ? stopRecording() : startRecording();
            }}
          >
            <FiMic size={22} /> {recording ? 'Stop' : 'Voice'}
          </button>
        </div>
      )}

      {/* Reply banner — appears above the input bar when composing a reply.
          Sender name + first line of the original; X to cancel. */}
      {replyingTo && (
        <div className="chat-reply-banner">
          <div className="chat-reply-banner__body">
            <strong>
              Replying to {(replyingTo.sender?._id || replyingTo.sender) === user._id
                ? 'yourself'
                : (replyingTo.sender?.name || 'message')}
            </strong>
            <span>
              {replyingTo.text
                ? (replyingTo.text.length > 80 ? replyingTo.text.slice(0, 80) + '…' : replyingTo.text)
                : replyingTo.mediaType === 'image' ? '📷 Photo'
                : replyingTo.mediaType === 'video' ? '🎬 Video'
                : replyingTo.mediaType === 'audio' ? '🎤 Voice message'
                : 'Message'}
            </span>
          </div>
          <button
            className="chat-reply-banner__close"
            onClick={() => setReplyingTo(null)}
            aria-label="Cancel reply"
          >
            <FiX size={18} />
          </button>
        </div>
      )}

      {/* Input bar */}
      <div className="chat-input-bar card">
        <button
          className={`chat-media-toggle ${showMedia ? 'active' : ''}`}
          onClick={() => setShowMedia(!showMedia)}
        >
          <FiImage size={20} />
        </button>

        {recording ? (
          <div className="recording-indicator">
            <span className="rec-dot" /> Recording...
            <button
              className="chat-input__send"
              onClick={stopRecording}
              style={{ background: 'var(--pink)' }}
            >
              <FiMic size={18} />
            </button>
          </div>
        ) : (
          <>
            <textarea
              className="chat-input__field"
              placeholder="Type a message..."
              value={text}
              onChange={handleTyping}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            {text.trim() ? (
              <button className="chat-input__send" onClick={handleSend}>
                <FiSend size={20} />
              </button>
            ) : (
              <button
                className="chat-input__send"
                style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}
                onClick={startRecording}
              >
                <FiMic size={20} />
              </button>
            )}
          </>
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        type="file"
        accept="image/*,.heic,.heif,.avif,.tiff,.tif,.bmp"
        style={{ display: 'none' }}
        ref={fileInputRef}
        onChange={(e) => handleMediaSelect(e, 'image')}
      />
    </div>
  );
};

// Disappearing image component — shows image for 10s then hides
const DisappearingImage = ({ msg, isMine }) => {
  const [viewed, setViewed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);

  const handleView = () => {
    if (isMine || viewed) return;
    setViewed(true);
    setTimeLeft(10);
  };

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      setViewed(false);
      setTimeLeft(null);
      return;
    }
    const t = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);

  if (msg.disappearing && !isMine) {
    if (!viewed) return (
      <div className="disappearing-placeholder" onClick={handleView}>
        <FiEye size={20} />
        <span>Tap to view (once)</span>
      </div>
    );
    return (
      <div className="disappearing-viewing">
        <img src={msg.mediaUrl} alt="disappearing" className="chat-media-img" />
        <div className="disappearing-timer">{timeLeft}s</div>
      </div>
    );
  }

  return <img src={msg.mediaUrl} alt="media" className="chat-media-img" />;
};

export default Chat;
