const Message = require('../models/Message');
const Match = require('../models/Match');
const User = require('../models/User');

// Map: userId → socketId (for direct delivery)
const onlineUsers = new Map();

const initSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    // ── User comes online ─────────────────────────────────
    socket.on('user_online', async (userId) => {
      onlineUsers.set(userId, socket.id);
      socket.join(userId); // join a room named after the userId

      await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });

      // Notify all matches that this user is online
      const user = await User.findById(userId).select('matches');
      if (user?.matches) {
        user.matches.forEach((matchId) => {
          socket.to(matchId.toString()).emit('friend_online', { userId });
        });
      }
    });

    // ── Send message ──────────────────────────────────────
    socket.on('send_message', async (data) => {
      try {
        const { matchId, senderId, receiverId, text, mediaUrl, mediaType } = data;

        // Verify the match exists and sender is part of it
        const match = await Match.findOne({
          _id: matchId,
          users: senderId,
          isActive: true,
        });
        if (!match) return;

        // Block check — either direction blocks delivery
        const [sender, receiver] = await Promise.all([
          User.findById(senderId).select('blockedUsers').lean(),
          User.findById(receiverId).select('blockedUsers').lean(),
        ]);
        const senderBlocked = (sender?.blockedUsers || []).some((id) => id.toString() === receiverId.toString());
        const receiverBlocked = (receiver?.blockedUsers || []).some((id) => id.toString() === senderId.toString());
        if (senderBlocked || receiverBlocked) {
          socket.emit('message_error', { message: 'Cannot send — user unavailable' });
          return;
        }

        // Apply disappearing-messages TTL based on match setting
        const mode = match.disappearing?.mode || 'never';
        let expireAt = null;
        if (mode === '24h') expireAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        // 'immediately' => expireAt set when receiver reads (messages_read handler)

        const message = await Message.create({
          matchId,
          sender: senderId,
          receiver: receiverId,
          text,
          mediaUrl,
          mediaType,
          expireAt,
        });

        // Update match last activity
        await Match.findByIdAndUpdate(matchId, {
          lastMessage: message._id,
          lastActivity: new Date(),
        });

        const populated = await message.populate('sender', 'name username profilePhoto');

        // FIX: Convert matchId to string on the emitted payload so client-side
        // string comparisons (msg.matchId?.toString() === matchId) work correctly.
        const payload = populated.toObject ? populated.toObject() : { ...populated };
        payload.matchId = matchId.toString();

        // Deliver to receiver
        io.to(receiverId).emit('receive_message', payload);

        // Confirm delivery to sender — client uses this to replace the optimistic message
        socket.emit('message_sent', payload);
      } catch (err) {
        console.error('Message error:', err);
        socket.emit('message_error', { message: 'Failed to send message' });
      }
    });

    // ── Typing indicator ──────────────────────────────────
    socket.on('typing_start', ({ matchId, senderId, receiverId }) => {
      // FIX: Emit matchId as a plain string so client comparisons work reliably
      socket.to(receiverId).emit('user_typing', {
        matchId: matchId ? matchId.toString() : matchId,
        userId: senderId,
      });
    });

    socket.on('typing_stop', ({ matchId, senderId, receiverId }) => {
      socket.to(receiverId).emit('user_stopped_typing', {
        matchId: matchId ? matchId.toString() : matchId,
        userId: senderId,
      });
    });

    // ── Mark messages read ────────────────────────────────
    // Does NOT delete immediately — even in 'immediately' mode we wait until
    // the user closes the chat, so they can still read the convo while it's open.
    socket.on('messages_read', async ({ matchId, userId }) => {
      await Message.updateMany(
        { matchId, receiver: userId, read: false },
        { read: true, readAt: new Date() }
      );
      const match = await Match.findById(matchId);
      const senderId = match?.users.find((id) => id.toString() !== userId.toString());
      if (senderId) {
        socket.to(senderId.toString()).emit('messages_read_ack', { matchId });
      }
    });

    // ── Chat window closed ────────────────────────────────
    // Fired by client when user leaves the chat page / closes the popup.
    // In 'immediately' mode: delete every read message in that match (both sides,
    // sender & receiver) so next time anyone opens the chat it's empty.
    socket.on('chat_closed', async ({ matchId, userId }) => {
      try {
        const match = await Match.findById(matchId);
        if (!match) return;
        const mode = match.disappearing?.mode || 'never';
        if (mode !== 'immediately') return;

        // Delete all READ messages in this match (both directions).
        // Unread messages survive — if the other user never opened them,
        // they should still arrive when they do.
        await Message.deleteMany({ matchId, read: true });

        // Tell any still-connected clients so their UI drops them too
        io.to(match.users[0].toString()).emit('messages_wiped', { matchId });
        io.to(match.users[1].toString()).emit('messages_wiped', { matchId });
      } catch (err) {
        console.error('chat_closed error:', err);
      }
    });

    // ── WebRTC Call Signaling ─────────────────────────────
    socket.on('call:offer', ({ to, offer, matchId, callType, from, fromName }) => {
      io.to(to).emit('call:offer', { offer, from, matchId, callType, fromName });
    });

    socket.on('call:answer', ({ to, answer, matchId }) => {
      io.to(to).emit('call:answer', { answer, matchId });
    });

    socket.on('call:ice-candidate', ({ to, candidate, matchId }) => {
      io.to(to).emit('call:ice-candidate', { candidate, matchId });
    });

    socket.on('call:end', ({ to, matchId }) => {
      io.to(to).emit('call:ended', { matchId });
    });

    socket.on('call:reject', ({ to, matchId }) => {
      io.to(to).emit('call:rejected', { matchId });
    });

    // ── Disconnect ────────────────────────────────────────
    socket.on('disconnect', async () => {
      let disconnectedUserId;
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          disconnectedUserId = userId;
          onlineUsers.delete(userId);
          break;
        }
      }

      if (disconnectedUserId) {
        await User.findByIdAndUpdate(disconnectedUserId, {
          isOnline: false,
          lastSeen: new Date(),
        });

        const user = await User.findById(disconnectedUserId).select('matches');
        if (user?.matches) {
          user.matches.forEach((matchId) => {
            socket.to(matchId.toString()).emit('friend_offline', {
              userId: disconnectedUserId,
            });
          });
        }
      }

      console.log('Socket disconnected:', socket.id);
    });
  });
};

module.exports = { initSocket, onlineUsers };
