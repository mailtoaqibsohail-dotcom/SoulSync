import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { FiSend, FiArrowLeft } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import './Chat.css';

const Chat = () => {
  const { matchId } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [match, setMatch] = useState(null);
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);

  // Load messages
  useEffect(() => {
    const load = async () => {
      try {
        const [msgRes, matchRes] = await Promise.all([
          axios.get(`/api/matches/${matchId}/messages`),
          axios.get('/api/matches'),
        ]);
        setMessages(msgRes.data.messages);
        const found = matchRes.data.matches.find((m) => m.matchId === matchId);
        setMatch(found);
      } catch (err) {
        console.error('Chat load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [matchId]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('receive_message', (msg) => {
      if (msg.matchId === matchId) {
        setMessages((prev) => [...prev, msg]);
        socket.emit('messages_read', { matchId, userId: user._id });
      }
    });

    socket.on('user_typing', ({ matchId: mid }) => {
      if (mid === matchId) setIsTyping(true);
    });
    socket.on('user_stopped_typing', ({ matchId: mid }) => {
      if (mid === matchId) setIsTyping(false);
    });

    // Mark messages as read
    socket.emit('messages_read', { matchId, userId: user._id });

    return () => {
      socket.off('receive_message');
      socket.off('user_typing');
      socket.off('user_stopped_typing');
    };
  }, [socket, matchId, user._id]);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!text.trim() || !socket || !match) return;

    const receiverId = match.user._id;

    socket.emit('send_message', {
      matchId,
      senderId: user._id,
      receiverId,
      text: text.trim(),
    });

    // Optimistic update
    setMessages((prev) => [
      ...prev,
      {
        _id: Date.now().toString(),
        matchId,
        sender: user,
        receiver: { _id: receiverId },
        text: text.trim(),
        createdAt: new Date().toISOString(),
        read: false,
      },
    ]);
    setText('');
  };

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

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (loading) return <div className="chat-loading"><div className="spinner" /></div>;

  return (
    <div className="chat-page">
      {/* Header */}
      <div className="chat-header card">
        <Link to="/matches" className="chat-back">
          <FiArrowLeft size={22} />
        </Link>
        {match && (
          <>
            <img
              src={match.user.profilePhoto || match.user.photos?.[0] || '/placeholder.jpg'}
              alt={match.user.name}
              className="chat-header__avatar"
            />
            <div className="chat-header__info">
              <h3>{match.user.name}</h3>
              <span className={`chat-header__status ${match.user.isOnline ? 'online' : ''}`}>
                {match.user.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((msg) => {
          const isMine = (msg.sender?._id || msg.sender) === user._id;
          return (
            <div key={msg._id} className={`chat-bubble-row ${isMine ? 'mine' : 'theirs'}`}>
              {!isMine && (
                <img
                  src={match?.user?.profilePhoto || '/placeholder.jpg'}
                  alt=""
                  className="chat-bubble__avatar"
                />
              )}
              <div className={`chat-bubble ${isMine ? 'chat-bubble--mine' : 'chat-bubble--theirs'}`}>
                {msg.text}
                <span className="chat-bubble__time">{formatTime(msg.createdAt)}</span>
              </div>
            </div>
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

      {/* Input */}
      <div className="chat-input-bar card">
        <textarea
          className="chat-input__field"
          placeholder="Type a message..."
          value={text}
          onChange={handleTyping}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          className="chat-input__send"
          onClick={handleSend}
          disabled={!text.trim()}
        >
          <FiSend size={20} />
        </button>
      </div>
    </div>
  );
};

export default Chat;
