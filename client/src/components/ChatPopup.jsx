import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNotifications } from '../context/NotificationContext';
import { useChatPopup } from '../context/ChatPopupContext';
import {
  FiX, FiMinus, FiSend, FiImage, FiPhone, FiVideo, FiMaximize2
} from 'react-icons/fi';
import { DEFAULT_AVATAR } from '../utils/defaults';
import './ChatPopup.css';

const ChatPopup = ({ matchId, user: matchUser, minimised, index }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { clearUnread } = useNotifications();
  const { closeChat, toggleMinimise } = useChatPopup();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);
  const fileInputRef = useRef(null);

  // Load messages when first opened
  useEffect(() => {
    if (minimised || loaded) return;
    axios.get(`/api/matches/${matchId}/messages`)
      .then(({ data }) => {
        setMessages(data.messages);
        setLoaded(true);
      })
      .catch(console.error);
    clearUnread(matchId);
  }, [matchId, minimised, loaded, clearUnread]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const onMessage = (msg) => {
      // FIX: Compare as strings — msg.matchId may be an ObjectId from the server
      if (msg.matchId?.toString() === matchId) {
        setMessages((prev) => {
          // Avoid duplicate if an optimistic copy already exists
          const alreadyExists = prev.some((m) => m._id === msg._id);
          if (alreadyExists) return prev;
          return [...prev, msg];
        });
        socket.emit('messages_read', { matchId, userId: user._id });
      }
    };

    const onTypingStart = ({ matchId: mid }) => {
      if (mid?.toString() === matchId) setIsTyping(true);
    };
    const onTypingStop = ({ matchId: mid }) => {
      if (mid?.toString() === matchId) setIsTyping(false);
    };

    socket.on('receive_message', onMessage);
    socket.on('user_typing', onTypingStart);
    socket.on('user_stopped_typing', onTypingStop);

    return () => {
      socket.off('receive_message', onMessage);
      socket.off('user_typing', onTypingStart);
      socket.off('user_stopped_typing', onTypingStop);
      // Trigger disappearing-messages deletion in 'immediately' mode
      socket.emit('chat_closed', { matchId, userId: user._id });
    };
  }, [socket, matchId, user._id]);

  // Scroll to bottom
  useEffect(() => {
    if (!minimised) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, minimised]);

  const handleSend = useCallback(() => {
    if (!text.trim() || !socket) return;

    const trimmed = text.trim();

    // Optimistic update
    const optimisticMsg = {
      _id: `optimistic-${Date.now()}`,
      matchId,
      sender: user,
      text: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setText('');

    socket.emit('send_message', {
      matchId,
      senderId: user._id,
      receiverId: matchUser._id,
      text: trimmed,
    });
  }, [text, socket, matchId, user, matchUser]);

  const handleTyping = (e) => {
    setText(e.target.value);
    socket?.emit('typing_start', {
      matchId,
      senderId: user._id,
      receiverId: matchUser._id,
    });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket?.emit('typing_stop', {
        matchId,
        senderId: user._id,
        receiverId: matchUser._id,
      });
    }, 1500);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // FIX: Actually upload the file to the server after the optimistic preview.
  // The old code only added a local preview but never sent the file.
  const handleImageSend = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset input so the same file can be selected again
    e.target.value = '';

    // Optimistic preview
    const url = URL.createObjectURL(file);
    const optimisticMsg = {
      _id: `optimistic-${Date.now()}`,
      matchId,
      sender: user,
      mediaUrl: url,
      mediaType: 'image',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    // Upload to server
    const formData = new FormData();
    formData.append('media', file);
    formData.append('matchId', matchId);
    formData.append('receiverId', matchUser._id);
    formData.append('mediaType', 'image');

    try {
      // FIX: No manual Content-Type — let axios set the multipart boundary
      await axios.post('/api/matches/send-media', formData);
    } catch (err) {
      console.error('Image send failed:', err);
    }
  };

  const formatTime = (d) =>
    new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Position: stack from right, each popup is 328px wide + 12px gap
  const rightOffset = 16 + index * (328 + 12);

  return (
    <div
      className={`chat-popup ${minimised ? 'minimised' : ''}`}
      style={{ right: rightOffset }}
    >
      {/* Header */}
      <div className="chat-popup__header" onClick={() => toggleMinimise(matchId)}>
        <div className="chat-popup__header-left">
          <div className="chat-popup__avatar-wrap">
            <img
              src={matchUser.profilePhoto || matchUser.photos?.[0] || DEFAULT_AVATAR}
              alt={matchUser.name}
              className="chat-popup__avatar"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/profile/${matchUser._id}`);
              }}
            />
            {matchUser.isOnline && <span className="chat-popup__online-dot" />}
          </div>
          <div className="chat-popup__header-info">
            <span
              className="chat-popup__name"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/profile/${matchUser._id}`);
              }}
            >
              {matchUser.name}
            </span>
            <span className="chat-popup__status">
              {matchUser.isOnline ? '● Online' : 'Offline'}
            </span>
          </div>
        </div>

        <div className="chat-popup__header-actions" onClick={(e) => e.stopPropagation()}>
          <button
            className="chat-popup__icon-btn"
            title="Voice call"
            onClick={() =>
              navigate(
                `/call/${matchId}?type=audio&userId=${user._id}&peerId=${matchUser._id}&caller=true`
              )
            }
          >
            <FiPhone size={14} />
          </button>
          <button
            className="chat-popup__icon-btn"
            title="Video call"
            onClick={() =>
              navigate(
                `/call/${matchId}?type=video&userId=${user._id}&peerId=${matchUser._id}&caller=true`
              )
            }
          >
            <FiVideo size={14} />
          </button>
          <button
            className="chat-popup__icon-btn"
            title="Open full chat"
            onClick={() => {
              closeChat(matchId);
              navigate(`/chat/${matchId}`);
            }}
          >
            <FiMaximize2 size={14} />
          </button>
          <button
            className="chat-popup__icon-btn"
            title="Minimise"
            onClick={() => toggleMinimise(matchId)}
          >
            <FiMinus size={14} />
          </button>
          <button
            className="chat-popup__icon-btn chat-popup__icon-btn--close"
            title="Close"
            onClick={() => closeChat(matchId)}
          >
            <FiX size={14} />
          </button>
        </div>
      </div>

      {/* Body — hidden when minimised */}
      {!minimised && (
        <>
          <div className="chat-popup__messages">
            {messages.map((msg) => {
              const isMine = (msg.sender?._id || msg.sender) === user._id;
              return (
                <div
                  key={msg._id}
                  className={`chat-popup__bubble-row ${isMine ? 'mine' : 'theirs'}`}
                >
                  {!isMine && (
                    <img
                      src={matchUser.profilePhoto || DEFAULT_AVATAR}
                      alt=""
                      className="chat-popup__msg-avatar"
                    />
                  )}
                  <div className={`chat-popup__bubble ${isMine ? 'mine' : 'theirs'}`}>
                    {msg.text && <span>{msg.text}</span>}
                    {msg.mediaType === 'image' && (
                      <img src={msg.mediaUrl} alt="img" className="chat-popup__img" />
                    )}
                    {/* FIX: Popup was missing audio/video rendering —
                        receiver would only see the timestamp for voice notes. */}
                    {msg.mediaType === 'audio' && msg.mediaUrl && (
                      <audio
                        src={msg.mediaUrl}
                        controls
                        preload="metadata"
                        className="chat-popup__audio"
                        style={{ width: '100%', marginTop: 4 }}
                      />
                    )}
                    {msg.mediaType === 'video' && msg.mediaUrl && (
                      <video
                        src={msg.mediaUrl}
                        controls
                        preload="metadata"
                        className="chat-popup__video"
                        style={{ width: '100%', marginTop: 4, borderRadius: 8 }}
                      />
                    )}
                    <span className="chat-popup__time">{formatTime(msg.createdAt)}</span>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="chat-popup__bubble-row theirs">
                <div className="chat-popup__bubble theirs typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="chat-popup__input-bar">
            <button
              className="chat-popup__media-btn"
              onClick={() => fileInputRef.current.click()}
            >
              <FiImage size={16} />
            </button>
            <input
              className="chat-popup__input"
              placeholder="Type a message..."
              value={text}
              onChange={handleTyping}
              onKeyDown={handleKey}
            />
            <button
              className="chat-popup__send-btn"
              onClick={handleSend}
              disabled={!text.trim()}
            >
              <FiSend size={15} />
            </button>
            <input
              type="file"
              accept="image/*,.heic,.heif,.avif,.tiff,.tif,.bmp"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleImageSend}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default ChatPopup;
