const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Match = require('../models/Match');
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

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

    // Add to likedUsers
    await User.findByIdAndUpdate(currentUserId, {
      $addToSet: { likedUsers: targetId },
    });

    // Check if the other person already liked us — mutual match!
    const isMatch = targetUser.likedUsers.includes(currentUserId);

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
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { dislikedUsers: req.params.userId },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Error processing dislike' });
  }
});

// ── GET /api/matches ──────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const matches = await Match.find({
      users: req.user._id,
      isActive: true,
    })
      .populate('users', 'name username profilePhoto photos isOnline lastSeen isVerified')
      .populate('lastMessage')
      .sort({ lastActivity: -1 });

    // Format: return the "other" user in each match
    const formatted = matches.map((match) => {
      const other = match.users.find((u) => u._id.toString() !== req.user._id.toString());
      return {
        matchId: match._id,
        user: other,
        lastMessage: match.lastMessage,
        lastActivity: match.lastActivity,
        createdAt: match.createdAt,
      };
    });

    res.json({ success: true, matches: formatted });
  } catch (err) {
    console.error('Get matches error:', err);
    res.status(500).json({ message: 'Error fetching matches' });
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
    const otherUserId = match.users.find((id) => id.toString() !== req.user._id.toString());
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
      .populate('sender', 'name username profilePhoto');

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
