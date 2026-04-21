import React, { useRef, useState } from 'react';
import { FiCornerUpLeft } from 'react-icons/fi';
import { DEFAULT_AVATAR } from '../utils/defaults';

// Reaction options shown on long-press. Keep to 6 — fits on one row on
// narrow phones and covers the usual suspects.
const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '👍', '🔥'];

// Distance (px) the user must drag horizontally before we commit to
// "reply" mode. Below this the bubble just rubber-bands back.
const SWIPE_REPLY_THRESHOLD = 60;

// Long-press duration in ms — matches WhatsApp.
const LONG_PRESS_MS = 500;

/**
 * A single chat bubble with long-press reactions, swipe-to-reply, and
 * rendering of quoted-reply blocks and reaction chips.
 *
 * Kept presentational — the parent owns the `onReact` and `onReply` callbacks
 * so it can wire them to socket + state.
 */
const MessageBubble = ({
  msg,
  isMine,
  avatar,
  currentUserId,
  onReact,
  onReply,
  formatTime,
  children,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  // dragX is the current drag offset (negative for mine swiping left,
  // positive for theirs swiping right — directions flipped by sender).
  const [dragX, setDragX] = useState(0);
  const pressTimer = useRef(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const didLongPress = useRef(false);
  const didSwipe = useRef(false);
  // Track whether the pointer is actually pressed on THIS bubble. Without
  // this, onMouseMove fires on every hover and shifts unrelated bubbles
  // around while the user is trying to pick a reply target.
  const isPressing = useRef(false);
  // Timestamp of the last tap/click on this bubble — used to detect a
  // double-tap (two taps under 300 ms) which fires a heart reaction.
  const lastTapAt = useRef(0);

  const cancelPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const onPointerDown = (e) => {
    isPressing.current = true;
    didLongPress.current = false;
    didSwipe.current = false;
    startX.current = e.touches ? e.touches[0].clientX : e.clientX;
    startY.current = e.touches ? e.touches[0].clientY : e.clientY;
    pressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setShowPicker(true);
      // Haptic nudge on supported devices.
      if (navigator.vibrate) navigator.vibrate(15);
    }, LONG_PRESS_MS);
  };

  const onPointerMove = (e) => {
    // IMPORTANT: only react while the pointer is actually pressed on THIS
    // bubble. Without this guard, onMouseMove would fire on every hover —
    // swiping one message and then hovering over others made every bubble
    // jitter.
    if (!isPressing.current) return;

    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    const dx = x - startX.current;
    const dy = y - startY.current;
    // If the user moves more than ~8px, it's not a tap or long-press.
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) cancelPress();

    // Mine: swipe RIGHT to reply (drag to the left physically on your own
    // bubbles feels unnatural). Theirs: swipe LEFT to reply. We still allow
    // both directions to work — just pick whichever produced more motion.
    // Vertical-dominant gestures are scroll, not swipe.
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
      // Limit the visual drag so it doesn't fly off-screen.
      const bounded = Math.max(-120, Math.min(120, dx));
      setDragX(bounded);
      didSwipe.current = true;
    }
  };

  const onPointerUp = () => {
    if (!isPressing.current) return;
    isPressing.current = false;
    cancelPress();
    if (didSwipe.current && Math.abs(dragX) >= SWIPE_REPLY_THRESHOLD && onReply) {
      onReply(msg);
      if (navigator.vibrate) navigator.vibrate(10);
    } else if (!didSwipe.current && !didLongPress.current) {
      // Plain tap — check for double-tap. Two taps within 300 ms fires a
      // heart reaction (Instagram / WhatsApp behaviour). We only consider it
      // a "tap" if the user didn't swipe or long-press.
      const now = Date.now();
      if (now - lastTapAt.current < 300) {
        lastTapAt.current = 0;
        if (onReact) {
          onReact(msg, '❤️');
          if (navigator.vibrate) navigator.vibrate(12);
        }
      } else {
        lastTapAt.current = now;
      }
    }
    // Snap back.
    setDragX(0);
  };

  const pickReaction = (emoji) => {
    setShowPicker(false);
    if (onReact) onReact(msg, emoji);
  };

  // Group reactions by emoji for compact display (❤️ 2  👍 1 …)
  const reactionCounts = {};
  (msg.reactions || []).forEach((r) => {
    reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
  });
  const myReaction = (msg.reactions || []).find(
    (r) => (r.user?._id || r.user) === currentUserId
  );

  const reply = msg.replyTo;

  return (
    <div className={`chat-bubble-row ${isMine ? 'mine' : 'theirs'}`}>
      {!isMine && <img src={avatar || DEFAULT_AVATAR} alt="" className="chat-bubble__avatar" />}

      <div
        className="chat-bubble-wrap"
        style={{ transform: `translateX(${dragX}px)`, transition: dragX === 0 ? 'transform 0.2s ease' : 'none' }}
        onMouseDown={onPointerDown}
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onMouseLeave={onPointerUp}
        onTouchStart={onPointerDown}
        onTouchMove={onPointerMove}
        onTouchEnd={onPointerUp}
      >
        {/* Reply hint — appears under the drag as the user swipes. */}
        {Math.abs(dragX) > 20 && (
          <div className={`swipe-reply-hint ${dragX > 0 ? 'right' : 'left'}`}>
            <FiCornerUpLeft size={16} />
          </div>
        )}

        <div className={`chat-bubble ${isMine ? 'chat-bubble--mine' : 'chat-bubble--theirs'}`}>
          {/* Quoted reply preview */}
          {reply && (
            <div className="chat-reply-quote">
              <div className="chat-reply-quote__bar" />
              <div className="chat-reply-quote__body">
                <strong>{reply.sender?.name || 'Message'}</strong>
                <span>
                  {reply.text
                    ? (reply.text.length > 80 ? reply.text.slice(0, 80) + '…' : reply.text)
                    : reply.mediaType === 'image' ? '📷 Photo'
                    : reply.mediaType === 'video' ? '🎬 Video'
                    : reply.mediaType === 'audio' ? '🎤 Voice message'
                    : 'Message'}
                </span>
              </div>
            </div>
          )}

          {children}

          <span className="chat-bubble__time">{formatTime(msg.createdAt)}</span>

          {/* Reaction chips — hanging off the bottom edge */}
          {Object.keys(reactionCounts).length > 0 && (
            <div className={`chat-reactions ${isMine ? 'mine' : 'theirs'}`}>
              {Object.entries(reactionCounts).map(([emoji, count]) => (
                <button
                  key={emoji}
                  type="button"
                  className={`chat-reaction-chip ${myReaction?.emoji === emoji ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); pickReaction(emoji); }}
                >
                  <span>{emoji}</span>
                  {count > 1 && <span className="chat-reaction-chip__count">{count}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Emoji picker (long-press) */}
        {showPicker && (
          <>
            <div className="chat-reaction-backdrop" onClick={() => setShowPicker(false)} />
            <div className={`chat-reaction-picker ${isMine ? 'mine' : 'theirs'}`}>
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="chat-reaction-picker__btn"
                  onClick={() => pickReaction(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
