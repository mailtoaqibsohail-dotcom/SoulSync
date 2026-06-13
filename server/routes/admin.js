const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Match = require('../models/Match');
const Message = require('../models/Message');
const Swipe = require('../models/Swipe');
const Report = require('../models/Report');
const { requireAdmin } = require('../middleware/adminAuth');
const { deleteUserCascade } = require('../utils/deleteUser');

// Admin token: distinct payload so it can never satisfy the user `protect`
// middleware (which expects { id }), and a user token can never satisfy
// requireAdmin (which expects { kind:'admin', adminId }).
const signAdminToken = (adminId) =>
  jwt.sign({ adminId, kind: 'admin' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// ── Pagination helper (mirrors routes/users.js discover) ──
const paginate = (req) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
  return { page, limit, skip: (page - 1) * limit };
};

// ══════════════════════════════════════════════════════════
//  AUTH (public — no requireAdmin)
// ══════════════════════════════════════════════════════════

// POST /api/admin/auth/login
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }
    const admin = await Admin.findOne({ email: email.toLowerCase().trim() }).select('+password');
    // Same generic message for unknown email vs wrong password (no enumeration).
    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (!admin.isActive) {
      return res.status(403).json({ message: 'Admin account disabled' });
    }
    admin.lastLogin = new Date();
    await admin.save();
    res.json({ success: true, token: signAdminToken(admin._id), admin: admin.toSafe() });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Everything below requires a valid admin token.
router.use(requireAdmin);

// GET /api/admin/auth/me
router.get('/auth/me', (req, res) => {
  res.json({ admin: req.admin.toSafe() });
});

// ══════════════════════════════════════════════════════════
//  STATS
// ══════════════════════════════════════════════════════════

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      onlineNow,
      verifiedUsers,
      newToday,
      new7d,
      planAgg,
      totalMatches,
      totalSwipes,
      totalMessages,
      pendingReports,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isOnline: true }),
      User.countDocuments({ isVerified: true }),
      User.countDocuments({ createdAt: { $gte: startOfToday } }),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      User.aggregate([{ $group: { _id: '$plan', count: { $sum: 1 } } }]),
      Match.countDocuments(),
      Swipe.countDocuments(),
      Message.countDocuments(),
      Report.countDocuments({ status: 'pending' }),
    ]);

    const plans = { free: 0, premium: 0 };
    planAgg.forEach((p) => { plans[p._id || 'free'] = p.count; });

    res.json({
      users: { total: totalUsers, active: activeUsers, online: onlineNow, verified: verifiedUsers, newToday, new7d },
      plans,
      matches: totalMatches,
      swipes: totalSwipes,
      messages: totalMessages,
      pendingReports,
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ message: 'Failed to load stats' });
  }
});

// ══════════════════════════════════════════════════════════
//  USERS
// ══════════════════════════════════════════════════════════

// GET /api/admin/users?page&limit&search&status&plan&verified&sort
router.get('/users', async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req);
    const { search, status, plan, verified, sort } = req.query;

    const filter = {};
    if (search) {
      const rx = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: rx }, { username: rx }, { email: rx }];
    }
    if (status === 'active') filter.isActive = true;
    if (status === 'banned') filter.isActive = false;
    if (plan === 'free' || plan === 'premium') filter.plan = plan;
    if (verified === 'true') filter.isVerified = true;
    if (verified === 'false') filter.isVerified = false;

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      lastSeen: { lastSeen: -1 },
      name: { name: 1 },
    };
    const sortBy = sortMap[sort] || sortMap.newest;

    const [items, total] = await Promise.all([
      User.find(filter)
        .select('name username email phone plan planExpiresAt isActive isVerified isOnline gender createdAt lastSeen profilePhoto')
        .sort(sortBy)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Admin users list error:', err);
    res.status(500).json({ message: 'Failed to load users' });
  }
});

// GET /api/admin/users/:id — full profile + every setting + activity counts
router.get('/users/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const uid = user._id;

    const [swipesGiven, swipesReceived, matchCount, messagesSent, reportsAgainst] = await Promise.all([
      Swipe.countDocuments({ from: uid }),
      Swipe.countDocuments({ to: uid }),
      Match.countDocuments({ users: uid }),
      Message.countDocuments({ sender: uid }),
      Report.countDocuments({ reported: uid }),
    ]);

    // Full document (password is select:false so never present) + the age
    // virtual + isPremium. toObject with virtuals on.
    const data = user.toObject({ virtuals: true });
    delete data.otpCode;
    delete data.otpExpires;

    res.json({
      user: data,
      stats: { swipesGiven, swipesReceived, matchCount, messagesSent, reportsAgainst },
    });
  } catch (err) {
    console.error('Admin user detail error:', err);
    res.status(500).json({ message: 'Failed to load user' });
  }
});

// Fields an admin may write. Nested objects (preferences, settings) merged below.
const SCALAR_FIELDS = [
  'name', 'bio', 'email', 'phone', 'gender', 'profilePhoto', 'coverPhoto',
  'isVerified', 'isActive',
];

// PATCH /api/admin/users/:id — edit any profile field, settings, status, plan
router.patch('/users/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const b = req.body || {};

    for (const f of SCALAR_FIELDS) {
      if (b[f] !== undefined) user[f] = b[f];
    }
    if (Array.isArray(b.interestedIn)) user.interestedIn = b.interestedIn;
    if (Array.isArray(b.hobbies)) user.hobbies = b.hobbies;
    if (Array.isArray(b.photos)) user.photos = b.photos;

    // Nested preferences
    if (b.preferences && typeof b.preferences === 'object') {
      if (b.preferences.ageRange) {
        if (b.preferences.ageRange.min !== undefined) user.preferences.ageRange.min = b.preferences.ageRange.min;
        if (b.preferences.ageRange.max !== undefined) user.preferences.ageRange.max = b.preferences.ageRange.max;
      }
      if (b.preferences.distance !== undefined) user.preferences.distance = b.preferences.distance;
      if (b.preferences.showMe !== undefined) user.preferences.showMe = b.preferences.showMe;
    }

    // Settings toggles
    if (b.settings && typeof b.settings === 'object') {
      for (const k of ['notificationsEnabled', 'showOnlineStatus', 'showLastSeen', 'readReceipts']) {
        if (b.settings[k] !== undefined) user.settings[k] = Boolean(b.settings[k]);
      }
    }

    // Plan / subscription
    if (b.plan === 'free' || b.plan === 'premium') {
      if (b.plan === 'premium' && user.plan !== 'premium') {
        user.premiumSince = user.premiumSince || new Date();
      }
      if (b.plan === 'free') {
        user.planExpiresAt = null;
        user.premiumSince = null;
      }
      user.plan = b.plan;
    }
    if (b.planExpiresAt !== undefined) {
      user.planExpiresAt = b.planExpiresAt ? new Date(b.planExpiresAt) : null;
    }

    await user.save();
    const data = user.toObject({ virtuals: true });
    delete data.otpCode;
    delete data.otpExpires;
    res.json({ success: true, user: data });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Email or username already in use' });
    }
    console.error('Admin user update error:', err);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// DELETE /api/admin/users/:id — hard delete + cascade
router.delete('/users/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }
    const user = await User.findById(req.params.id).select('_id');
    if (!user) return res.status(404).json({ message: 'User not found' });
    await deleteUserCascade(user._id);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    console.error('Admin user delete error:', err);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// ══════════════════════════════════════════════════════════
//  REPORTS
// ══════════════════════════════════════════════════════════

// GET /api/admin/reports?status&page&limit
router.get('/reports', async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req);
    const filter = {};
    if (['pending', 'reviewed', 'dismissed', 'actioned'].includes(req.query.status)) {
      filter.status = req.query.status;
    }
    const [items, total] = await Promise.all([
      Report.find(filter)
        .populate('reporter', 'name username email profilePhoto')
        .populate('reported', 'name username email profilePhoto isActive')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Report.countDocuments(filter),
    ]);
    res.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Admin reports list error:', err);
    res.status(500).json({ message: 'Failed to load reports' });
  }
});

// PATCH /api/admin/reports/:id — update status
router.patch('/reports/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid report id' });
    }
    const { status } = req.body || {};
    if (!['pending', 'reviewed', 'dismissed', 'actioned'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!report) return res.status(404).json({ message: 'Report not found' });
    res.json({ success: true, report });
  } catch (err) {
    console.error('Admin report update error:', err);
    res.status(500).json({ message: 'Failed to update report' });
  }
});

module.exports = router;
