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

      // Flush undelivered messages for this user. Any messages sitting in the
      // DB addressed to them but not yet delivered get marked delivered now,
      // and we ping their senders so the read-receipt ticks update.
      try {
        const pending = await Message.find({
          receiver: userId,
          delivered: { $ne: true },
        }).select('_id sender matchId').lean();

        if (pending.length) {
          const ids = pending.map((m) => m._id);
          await Message.updateMany(
            { _id: { $in: ids } },
            { delivered: true, deliveredAt: new Date() }
          );
          pending.forEach((m) => {
            io.to(m.sender.toString()).emit('message_delivered', {
              matchId: m.matchId.toString(),
              messageId: m._id.toString(),
            });
          });
        }
      } catch (err) {
        console.error('deliver-flush error:', err);
      }
    });

    // ── Send message ──────────────────────────────────────
    socket.on('send_message', async (data) => {
      try {
        const { matchId, senderId, receiverId, text, mediaUrl, mediaType, replyTo } = data;

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

        // If the receiver is currently connected, mark delivered right away.
        const receiverOnline = onlineUsers.has(receiverId.toString());
        const message = await Message.create({
          matchId,
          sender: senderId,
          receiver: receiverId,
          text,
          mediaUrl,
          mediaType,
          replyTo: replyTo || null,
          expireAt,
          delivered: receiverOnline,
          deliveredAt: receiverOnline ? new Date() : undefined,
        });

        // Update match last activity
        await Match.findByIdAndUpdate(matchId, {
          lastMessage: message._id,
          lastActivity: new Date(),
        });

        // Populate sender plus a lightweight preview of the replied-to
        // message so the receiving client can render the quote block without
        // an extra fetch.
        const populated = await message.populate([
          { path: 'sender', select: 'name username profilePhoto' },
          { path: 'replyTo', select: 'text mediaType sender', populate: { path: 'sender', select: 'name' } },
        ]);

        // FIX: Convert matchId to string on the emitted payload so client-side
        // string comparisons (msg.matchId?.toString() === matchId) work correctly.
        const payload = populated.toObject ? populated.toObject() : { ...populated };
        payload.matchId = matchId.toString();

        // Deliver to receiver
        io.to(receiverId).emit('receive_message', payload);

        // Confirm delivery to sender — client uses this to replace the optimistic message
        socket.emit('message_sent', payload);

        // If we were able to mark delivered above, tell the sender to paint
        // two ticks. Otherwise they'll get a 'message_delivered' event later
        // when the receiver comes online (see user_online handler below).
        if (receiverOnline) {
          socket.emit('message_delivered', {
            matchId: matchId.toString(),
            messageId: message._id.toString(),
          });
        }
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
      // Grab ids first so we can tell the sender which messages were read
      const unread = await Message.find({
        matchId,
        receiver: userId,
        read: false,
      }).select('_id').lean();

      if (unread.length) {
        await Message.updateMany(
          { _id: { $in: unread.map((m) => m._id) } },
          { read: true, readAt: new Date(), delivered: true, deliveredAt: new Date() }
        );
      }

      const match = await Match.findById(matchId);
      const senderId = match?.users.find((id) => id.toString() !== userId.toString());
      if (senderId) {
        socket.to(senderId.toString()).emit('messages_read_ack', {
          matchId: matchId.toString(),
          messageIds: unread.map((m) => m._id.toString()),
        });
      }
    });

    // ── React to a message ────────────────────────────────
    // Toggle-ish semantics: sending the same emoji you already reacted with
    // removes your reaction; sending a different emoji replaces it; one
    // reaction per user per message.
    socket.on('message_react', async ({ matchId, messageId, userId, emoji }) => {
      try {
        if (!messageId || !userId) return;
        const msg = await Message.findById(messageId);
        if (!msg) return;

        // Verify the reactor is part of the match (prevents cross-chat abuse).
        const match = await Match.findOne({ _id: msg.matchId, users: userId });
        if (!match) return;

        const existing = msg.reactions.find((r) => r.user.toString() === userId.toString());
        if (existing && existing.emoji === emoji) {
          // Same emoji — toggle off.
          msg.reactions = msg.reactions.filter((r) => r.user.toString() !== userId.toString());
        } else if (existing) {
          existing.emoji = emoji;
          existing.createdAt = new Date();
        } else {
          msg.reactions.push({ user: userId, emoji, createdAt: new Date() });
        }
        await msg.save();

        // Broadcast to both sides of the match (match.users is a 2-tuple).
        const payload = {
          matchId: (matchId || msg.matchId).toString(),
          messageId: msg._id.toString(),
          reactions: msg.reactions.map((r) => ({
            user: r.user.toString(),
            emoji: r.emoji,
          })),
        };
        match.users.forEach((u) => {
          io.to(u.toString()).emit('message_reacted', payload);
        });
      } catch (err) {
        console.error('message_react error:', err);
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
