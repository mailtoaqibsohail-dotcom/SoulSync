const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Match = require('../models/Match');
const Message = require('../models/Message');
const Swipe = require('../models/Swipe');
const { protect } = require('../middleware/auth');
const { uploadMedia, cloudinary } = require('../config/cloudinary');

// ── POST /api/matches/like/:userId ────────────────────────
router.post('/like/:userId', protect, async (req, res) => {
  try {
    const targetId = req.params.userId;
    const currentUserId = req.user._id;

    if (targetId === currentUserId.toString()) {
      return res.status(400).json({ message: 'Cannot like yourself' });
    }

    const targetUser = await User.findById(targetId);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    // Record the like as a Swipe doc (upsert so re-liking is idempotent)
    await Swipe.findOneAndUpdate(
      { from: currentUserId, to: targetId },
      { from: currentUserId, to: targetId, action: 'like' },
      { upsert: true, new: true }
    );

    // Check if the other person already liked us — mutual match!
    const reciprocal = await Swipe.findOne({
      from: targetId,
      to: currentUserId,
      action: 'like',
    }).lean();
    const isMatch = !!reciprocal;

    if (isMatch) {
      // Create match record
      const match = await Match.create({
        users: [currentUserId, targetId],
        initiator: currentUserId,
      });

      // Add each other to matches array
      await User.findByIdAndUpdate(currentUserId, {
        $addToSet: { matches: targetId },
      });
      await User.findByIdAndUpdate(targetId, {
        $addToSet: { matches: currentUserId },
      });

      // Emit socket event (handled in socket/index.js)
      req.app.get('io').to(targetId.toString()).emit('new_match', {
        matchId: match._id,
        user: req.user.toPublicProfile ? req.user.toPublicProfile() : req.user,
      });

      return res.json({ success: true, isMatch: true, matchId: match._id });
    }

    res.json({ success: true, isMatch: false });
  } catch (err) {
    console.error('Like error:', err);
    res.status(500).json({ message: 'Error processing like' });
  }
});

// ── POST /api/matches/dislike/:userId ─────────────────────
router.post('/dislike/:userId', protect, async (req, res) => {
  try {
    await Swipe.findOneAndUpdate(
      { from: req.user._id, to: req.params.userId },
      { from: req.user._id, to: req.params.userId, action: 'dislike' },
      { upsert: true, new: true }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Dislike error:', err);
    res.status(500).json({ message: 'Error processing dislike' });
  }
});

// ── POST /api/matches/start/:userId ───────────────────────
// Grindr-style: open a conversation with any user without requiring a mutual like.
// Creates a Match record if one doesn't already exist, then returns its matchId.
// This is the single entry point for "tap profile → start chatting".
router.post('/start/:userId', protect, async (req, res) => {
  try {
    const targetId = req.params.userId;
    const currentUserId = req.user._id;

    if (targetId === currentUserId.toString()) {
      return res.status(400).json({ message: 'Cannot start a chat with yourself' });
    }

    const targetUser = await User.findById(targetId);
    if (!targetUser || !targetUser.isActive) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Blocked either way? Refuse.
    const blockedEitherWay =
      (targetUser.blockedUsers || []).some((id) => id.toString() === currentUserId.toString()) ||
      (req.user.blockedUsers || []).some((id) => id.toString() === targetId);
    if (blockedEitherWay) {
      return res.status(403).json({ message: 'Cannot start a chat with this user' });
    }

    // Find existing match between the two users (in any order)
    let match = await Match.findOne({
      users: { $all: [currentUserId, targetId] },
      isActive: true,
    });

    if (!match) {
      match = await Match.create({
        users: [currentUserId, targetId],
        initiator: currentUserId,
      });
      // Add to both users' matches arrays so the inbox picks it up
      await User.findByIdAndUpdate(currentUserId, { $addToSet: { matches: targetId } });
      await User.findByIdAndUpdate(targetId, { $addToSet: { matches: currentUserId } });

      // Let the other user know a new conversation was started with them
      req.app.get('io').to(targetId.toString()).emit('new_match', {
        matchId: match._id.toString(),
        user: req.user.toPublicProfile ? req.user.toPublicProfile() : req.user,
      });
    }

    res.json({ success: true, matchId: match._id.toString() });
  } catch (err) {
    console.error('Start chat error:', err);
    res.status(500).json({ message: 'Error starting chat' });
  }
});

// ── POST /api/matches/send-media ──────────────────────────
// FIX: Moved BEFORE /:matchId routes so Express doesn't try to parse
// "send-media" as a :matchId parameter for DELETE /:matchId etc.
router.post('/send-media', protect, uploadMedia.single('media'), async (req, res) => {
  try {
    const { matchId, receiverId, disappearing, mediaType } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Verify match exists and sender belongs to it
    const match = await Match.findOne({
      _id: matchId,
      users: req.user._id,
      isActive: true,
    });
    if (!match) {
      return res.status(403).json({ message: 'Match not found' });
    }

    // multer-storage-cloudinary already uploaded the file to Cloudinary.
    // req.file.path is the Cloudinary secure URL — use it directly.
    // Never re-upload: calling cloudinary.uploader.upload() on an already-uploaded
    // Cloudinary URL causes a redundant fetch-and-re-upload that breaks audio.
    const isAudio = mediaType === 'audio' || req.file.mimetype.startsWith('audio');
    const isVideo = mediaType === 'video' || req.file.mimetype.startsWith('video');
    let mediaUrl = req.file.path;
    const resolvedType = isAudio ? 'audio' : isVideo ? 'video' : 'image';

    // FIX: Safari cannot play webm/ogg audio. Force Cloudinary to deliver audio
    // as MP3 (universally supported) by rewriting the extension in the URL.
    // Cloudinary transcodes on-demand and caches the MP3 version.
    if (isAudio) {
      mediaUrl = mediaUrl.replace(/\.(webm|ogg|wav|m4a|mp4)(\?.*)?$/i, '.mp3$2');
      // If no extension was present, append .mp3
      if (!/\.mp3(\?.*)?$/i.test(mediaUrl)) {
        mediaUrl = mediaUrl.replace(/(\?.*)?$/, '.mp3$1');
      }
    }

    // Save message to DB
    const message = await Message.create({
      matchId,
      sender: req.user._id,
      receiver: receiverId,
      mediaUrl,
      mediaType: resolvedType,
      disappearing: disappearing === 'true',
      read: false,
    });

    // Update match last activity
    await Match.findByIdAndUpdate(matchId, {
      lastMessage: message._id,
      lastActivity: new Date(),
    });

    const populated = await message.populate('sender', 'name username profilePhoto');

    // FIX: Emit with matchId as a plain string for consistent client comparisons
    const payload = populated.toObject ? populated.toObject() : { ...populated };
    payload.matchId = matchId.toString();

    // Emit to receiver via socket
    const io = req.app.get('io');
    io.to(receiverId).emit('receive_message', payload);

    res.json({ success: true, message: payload });
  } catch (err) {
    console.error('Send media error:', err);
    res.status(500).json({ message: 'Failed to send media' });
  }
});

// ── GET /api/matches ──────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    // Get my blocked list to filter matches where I've blocked the other user
    const me = await User.findById(req.user._id).select('blockedUsers').lean();
    const myBlocked = (me?.blockedUsers || []).map((id) => id.toString());

    const matches = await Match.find({
      users: req.user._id,
      isActive: true,
    })
      .populate('users', 'name username profilePhoto photos isOnline lastSeen isVerified blockedUsers')
      .populate('lastMessage')
      .sort({ lastActivity: -1 });

    // Format: return the "other" user in each match; hide matches with blocked users either way
    const formatted = matches
      .map((match) => {
        const other = match.users.find(
          (u) => u._id.toString() !== req.user._id.toString()
        );
        return { match, other };
      })
      .filter(({ other }) => {
        if (!other) return false;
        // I blocked them?
        if (myBlocked.includes(other._id.toString())) return false;
        // They blocked me?
        const theirBlocked = (other.blockedUsers || []).map((id) => id.toString());
        if (theirBlocked.includes(req.user._id.toString())) return false;
        return true;
      })
      .map(({ match, other }) => ({
        matchId: match._id.toString(),
        user: {
          _id: other._id,
          name: other.name,
          username: other.username,
          profilePhoto: other.profilePhoto,
          photos: other.photos,
          isOnline: other.isOnline,
          lastSeen: other.lastSeen,
          isVerified: other.isVerified,
        },
        lastMessage: match.lastMessage,
        lastActivity: match.lastActivity,
        createdAt: match.createdAt,
        disappearing: match.disappearing?.mode || 'never',
      }));

    res.json({ success: true, matches: formatted });
  } catch (err) {
    console.error('Get matches error:', err);
    res.status(500).json({ message: 'Error fetching matches' });
  }
});

// ── PATCH /api/matches/:matchId/disappearing ──────────────
// Set disappearing-messages mode for the conversation.
router.patch('/:matchId/disappearing', protect, async (req, res) => {
  try {
    const { mode } = req.body; // 'never' | 'immediately' | '24h'
    if (!['never', 'immediately', '24h'].includes(mode)) {
      return res.status(400).json({ message: 'Invalid mode' });
    }
    const match = await Match.findById(req.params.matchId);
    if (!match || !match.users.includes(req.user._id)) {
      return res.status(404).json({ message: 'Match not found' });
    }
    match.disappearing = { mode };
    await match.save();

    // Notify the other user so their UI updates in real time
    const otherId = match.users.find((id) => id.toString() !== req.user._id.toString());
    req.app.get('io').to(otherId.toString()).emit('disappearing_changed', {
      matchId: match._id.toString(),
      mode,
    });

    res.json({ success: true, mode });
  } catch (err) {
    console.error('Disappearing update error:', err);
    res.status(500).json({ message: 'Error updating setting' });
  }
});

// ── DELETE /api/matches/:matchId ──────────────────────────
router.delete('/:matchId', protect, async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId);
    if (!match || !match.users.includes(req.user._id)) {
      return res.status(404).json({ message: 'Match not found' });
    }

    match.isActive = false;
    await match.save();

    // Remove from both users' matches arrays
    const otherUserId = match.users.find(
      (id) => id.toString() !== req.user._id.toString()
    );
    await User.findByIdAndUpdate(req.user._id, { $pull: { matches: otherUserId } });
    await User.findByIdAndUpdate(otherUserId, { $pull: { matches: req.user._id } });

    res.json({ success: true, message: 'Match removed' });
  } catch (err) {
    res.status(500).json({ message: 'Error removing match' });
  }
});

// ── GET /api/matches/:matchId/messages ────────────────────
router.get('/:matchId/messages', protect, async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const match = await Match.findById(req.params.matchId);
    if (!match || !match.users.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorised' });
    }

    const messages = await Message.find({ matchId: req.params.matchId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('sender', 'name username profilePhoto')
      // Populate replyTo so the client can render quote previews without a
      // second round-trip. Keep the projection narrow — just what the quote
      // block needs.
      .populate({
        path: 'replyTo',
        select: 'text mediaType sender',
        populate: { path: 'sender', select: 'name' },
      });

    // Mark messages as read
    await Message.updateMany(
      { matchId: req.params.matchId, receiver: req.user._id, read: false },
      { read: true, readAt: new Date() }
    );

    res.json({ success: true, messages: messages.reverse() });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ message: 'Error fetching messages' });
  }
});

module.exports = router;
