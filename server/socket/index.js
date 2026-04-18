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

        const message = await Message.create({
          matchId,
          sender: senderId,
          receiver: receiverId,
          text,
          mediaUrl,
          mediaType,
        });

        // Update match last activity
        await Match.findByIdAndUpdate(matchId, {
          lastMessage: message._id,
          lastActivity: new Date(),
        });

        const populated = await message.populate('sender', 'name username profilePhoto');

        // Deliver to receiver
        io.to(receiverId).emit('receive_message', populated);

        // Confirm delivery to sender
        socket.emit('message_sent', populated);
      } catch (err) {
        console.error('Message error:', err);
        socket.emit('message_error', { message: 'Failed to send message' });
      }
    });

    // ── Typing indicator ──────────────────────────────────
    socket.on('typing_start', ({ matchId, senderId, receiverId }) => {
      socket.to(receiverId).emit('user_typing', { matchId, userId: senderId });
    });

    socket.on('typing_stop', ({ matchId, senderId, receiverId }) => {
      socket.to(receiverId).emit('user_stopped_typing', { matchId, userId: senderId });
    });

    // ── Mark messages read ────────────────────────────────
    socket.on('messages_read', async ({ matchId, userId }) => {
      await Message.updateMany(
        { matchId, receiver: userId, read: false },
        { read: true, readAt: new Date() }
      );
      // Notify sender that messages were read
      const match = await Match.findById(matchId);
      const senderId = match?.users.find((id) => id.toString() !== userId.toString());
      if (senderId) {
        socket.to(senderId.toString()).emit('messages_read_ack', { matchId });
      }
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
