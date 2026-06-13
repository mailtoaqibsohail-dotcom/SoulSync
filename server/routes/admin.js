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
const AdminAction = require('../models/AdminAction');
const { requireAdmin } = require('../middleware/adminAuth');
const { deleteUserCascade } = require('../utils/deleteUser');

// Admin token: distinct payload so it can never satisfy the user `protect`
// middleware (which expects { id }), and a user token can never satisfy
// requireAdmin (which expects { kind:'admin', adminId }).
const signAdminToken = (adminId) =>
  jwt.sign({ adminId, kind: 'admin' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const paginate = (req) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
  return { page, limit, skip: (page - 1) * limit };
};

// Append-only audit log. Never throws into the request path.
async function logAction(req, { action, targetType = 'user', targetId, targetLabel = '', details = {} }) {
  try {
    await AdminAction.create({
      admin: req.admin._id,
      adminEmail: req.admin.email,
      action,
      targetType,
      targetId,
      targetLabel,
      details,
    });
  } catch (e) {
    console.error('audit log failed:', e.message);
  }
}

const label = (u) => (u ? `${u.name} (@${u.username})` : 'unknown');

// ══════════════════════════════════════════════════════════
//  AUTH (public)
// ══════════════════════════════════════════════════════════

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }
    const admin = await Admin.findOne({ email: email.toLowerCase().trim() }).select('+password');
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

router.use(requireAdmin);

router.get('/auth/me', (req, res) => {
  res.json({ admin: req.admin.toSafe() });
});

// ══════════════════════════════════════════════════════════
//  STATS  (Phase 1 — launch-health metrics)
// ══════════════════════════════════════════════════════════

router.get('/stats', async (req, res) => {
  try {
    const now = Date.now();
    const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
    const since7d = new Date(now - 7 * 864e5);
    const since24h = new Date(now - 864e5);

    const [
      totalUsers, activeUsers, onlineNow, verifiedUsers, newToday, new7d,
      planAgg, totalMatches, totalSwipes, totalMessages, pendingReports,
      dau, wau, genderAgg, ageBuckets, noPhotos, noBio, topCities, matchesWithMsgAgg,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isOnline: true }),
      User.countDocuments({ isVerified: true }),
      User.countDocuments({ createdAt: { $gte: startOfToday } }),
      User.countDocuments({ createdAt: { $gte: since7d } }),
      User.aggregate([{ $group: { _id: '$plan', count: { $sum: 1 } } }]),
      Match.countDocuments(),
      Swipe.countDocuments(),
      Message.countDocuments(),
      Report.countDocuments({ status: 'pending' }),
      // DAU / WAU — real engagement (seen recently), not registration
      User.countDocuments({ lastSeen: { $gte: since24h } }),
      User.countDocuments({ lastSeen: { $gte: since7d } }),
      // Gender ratio — #1 health risk for a dating app
      User.aggregate([{ $group: { _id: '$gender', count: { $sum: 1 } } }]),
      // Age distribution
      User.aggregate([
        { $match: { dateOfBirth: { $ne: null } } },
        { $project: { age: { $dateDiff: { startDate: '$dateOfBirth', endDate: '$$NOW', unit: 'year' } } } },
        { $bucket: { groupBy: '$age', boundaries: [18, 25, 35, 45, 55, 200], default: 'other', output: { count: { $sum: 1 } } } },
      ]),
      // Profile completeness
      User.countDocuments({ $or: [{ photos: { $size: 0 } }, { photos: { $exists: false } }] }),
      User.countDocuments({ $or: [{ bio: '' }, { bio: { $exists: false } }] }),
      // Geographic density
      User.aggregate([
        { $match: { 'location.city': { $nin: ['', null] } } },
        { $group: { _id: '$location.city', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
      // Matches that have at least one message (core-loop health)
      Message.aggregate([{ $group: { _id: '$matchId' } }, { $count: 'n' }]),
    ]);

    const plans = { free: 0, premium: 0 };
    planAgg.forEach((p) => { plans[p._id || 'free'] = p.count; });

    const gender = { man: 0, woman: 0, 'non-binary': 0, other: 0 };
    genderAgg.forEach((g) => { gender[g._id || 'other'] = (gender[g._id || 'other'] || 0) + g.count; });

    const ageLabels = { 18: '18–24', 25: '25–34', 35: '35–44', 45: '45–54', 55: '55+' };
    const ages = ageBuckets.map((b) => ({
      range: ageLabels[b._id] || String(b._id),
      count: b.count,
    }));

    const matchesWithMessages = matchesWithMsgAgg[0]?.n || 0;

    res.json({
      users: { total: totalUsers, active: activeUsers, online: onlineNow, verified: verifiedUsers, newToday, new7d, dau, wau },
      plans,
      gender,
      ages,
      completeness: { noPhotos, noBio, total: totalUsers },
      topCities: topCities.map((c) => ({ city: c._id, count: c.count })),
      coreLoop: {
        matches: totalMatches,
        matchesWithMessages,
        chatRate: totalMatches ? Math.round((matchesWithMessages / totalMatches) * 100) : 0,
        messagesPerMatch: totalMatches ? +(totalMessages / totalMatches).toFixed(1) : 0,
      },
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

// Signups per day for the last 30 days (growth chart)
router.get('/stats/growth', async (req, res) => {
  try {
    const since = new Date(Date.now() - 30 * 864e5);
    const rows = await User.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    res.json({ days: rows.map((r) => ({ date: r._id, count: r.count })) });
  } catch (err) {
    console.error('Admin growth error:', err);
    res.status(500).json({ message: 'Failed to load growth' });
  }
});

// ══════════════════════════════════════════════════════════
//  USERS
// ══════════════════════════════════════════════════════════

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
      newest: { createdAt: -1 }, oldest: { createdAt: 1 },
      lastSeen: { lastSeen: -1 }, name: { name: 1 },
    };
    const sortBy = sortMap[sort] || sortMap.newest;

    const [items, total] = await Promise.all([
      User.find(filter)
        .select('name username email phone plan planExpiresAt isActive isVerified isOnline gender createdAt lastSeen profilePhoto')
        .sort(sortBy).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ]);
    res.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Admin users list error:', err);
    res.status(500).json({ message: 'Failed to load users' });
  }
});

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

    const data = user.toObject({ virtuals: true });
    delete data.otpCode;
    delete data.otpExpires;

    res.json({ user: data, stats: { swipesGiven, swipesReceived, matchCount, messagesSent, reportsAgainst } });
  } catch (err) {
    console.error('Admin user detail error:', err);
    res.status(500).json({ message: 'Failed to load user' });
  }
});

const SCALAR_FIELDS = ['name', 'bio', 'email', 'phone', 'gender', 'profilePhoto', 'coverPhoto'];

router.patch('/users/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const b = req.body || {};
    const before = { isActive: user.isActive, isVerified: user.isVerified, plan: user.plan };

    for (const f of SCALAR_FIELDS) if (b[f] !== undefined) user[f] = b[f];
    if (Array.isArray(b.interestedIn)) user.interestedIn = b.interestedIn;
    if (Array.isArray(b.hobbies)) user.hobbies = b.hobbies;
    if (Array.isArray(b.photos)) user.photos = b.photos;

    if (b.preferences && typeof b.preferences === 'object') {
      if (b.preferences.ageRange) {
        if (b.preferences.ageRange.min !== undefined) user.preferences.ageRange.min = b.preferences.ageRange.min;
        if (b.preferences.ageRange.max !== undefined) user.preferences.ageRange.max = b.preferences.ageRange.max;
      }
      if (b.preferences.distance !== undefined) user.preferences.distance = b.preferences.distance;
      if (b.preferences.showMe !== undefined) user.preferences.showMe = b.preferences.showMe;
    }

    if (b.settings && typeof b.settings === 'object') {
      for (const k of ['notificationsEnabled', 'showOnlineStatus', 'showLastSeen', 'readReceipts']) {
        if (b.settings[k] !== undefined) user.settings[k] = Boolean(b.settings[k]);
      }
    }

    // Ban / suspend with reason
    if (b.isActive !== undefined && b.isActive !== before.isActive) {
      user.isActive = Boolean(b.isActive);
      if (!user.isActive) {
        user.banReason = b.banReason || '';
        user.bannedAt = new Date();
        user.bannedBy = req.admin._id;
      } else {
        user.banReason = '';
        user.bannedAt = null;
        user.bannedBy = null;
      }
    }
    if (b.isVerified !== undefined) user.isVerified = Boolean(b.isVerified);

    if (b.plan === 'free' || b.plan === 'premium') {
      if (b.plan === 'premium' && user.plan !== 'premium') user.premiumSince = user.premiumSince || new Date();
      if (b.plan === 'free') { user.planExpiresAt = null; user.premiumSince = null; }
      user.plan = b.plan;
    }
    if (b.planExpiresAt !== undefined) user.planExpiresAt = b.planExpiresAt ? new Date(b.planExpiresAt) : null;

    await user.save();

    // Audit — log the specific meaningful change(s)
    if (b.isActive !== undefined && b.isActive !== before.isActive) {
      await logAction(req, { action: user.isActive ? 'unban' : 'ban', targetId: user._id, targetLabel: label(user), details: { reason: user.banReason || undefined } });
    }
    if (b.isVerified !== undefined && b.isVerified !== before.isVerified) {
      await logAction(req, { action: user.isVerified ? 'verify' : 'unverify', targetId: user._id, targetLabel: label(user) });
    }
    if (b.plan && b.plan !== before.plan) {
      await logAction(req, { action: 'set_plan', targetId: user._id, targetLabel: label(user), details: { from: before.plan, to: b.plan } });
    }
    if (b.settings) await logAction(req, { action: 'edit_settings', targetId: user._id, targetLabel: label(user) });
    if (SCALAR_FIELDS.some((f) => b[f] !== undefined) || b.preferences || b.hobbies || b.photos) {
      await logAction(req, { action: 'edit_profile', targetId: user._id, targetLabel: label(user) });
    }

    const data = user.toObject({ virtuals: true });
    delete data.otpCode; delete data.otpExpires;
    res.json({ success: true, user: data });
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
    if (err.code === 11000) return res.status(409).json({ message: 'Email or username already in use' });
    console.error('Admin user update error:', err);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid user id' });
    const user = await User.findById(req.params.id).select('name username');
    if (!user) return res.status(404).json({ message: 'User not found' });
    const lbl = label(user);
    await deleteUserCascade(user._id);
    await logAction(req, { action: 'delete_user', targetId: req.params.id, targetLabel: lbl });
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    console.error('Admin user delete error:', err);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// ── Admin notes on a user (Phase 2) ──
router.post('/users/:id/notes', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid user id' });
    const text = (req.body?.text || '').trim();
    if (!text) return res.status(400).json({ message: 'Note text required' });
    const user = await User.findById(req.params.id).select('name username adminNotes');
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.adminNotes.push({ text: text.slice(0, 1000), by: req.admin._id, byName: req.admin.name, at: new Date() });
    await user.save({ validateBeforeSave: false });
    await logAction(req, { action: 'add_note', targetId: user._id, targetLabel: label(user) });
    res.json({ success: true, adminNotes: user.adminNotes });
  } catch (err) {
    console.error('Admin add note error:', err);
    res.status(500).json({ message: 'Failed to add note' });
  }
});

// ── Per-photo moderation: remove one photo (Phase 3) ──
router.delete('/users/:id/photos', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid user id' });
    const url = req.body?.url || req.query.url;
    if (!url) return res.status(400).json({ message: 'Photo url required' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.photos = (user.photos || []).filter((p) => p !== url);
    if (user.profilePhoto === url) user.profilePhoto = user.photos[0] || '';
    await user.save({ validateBeforeSave: false });
    await logAction(req, { action: 'remove_photo', targetType: 'photo', targetId: user._id, targetLabel: label(user), details: { url } });
    res.json({ success: true, photos: user.photos, profilePhoto: user.profilePhoto });
  } catch (err) {
    console.error('Admin remove photo error:', err);
    res.status(500).json({ message: 'Failed to remove photo' });
  }
});

// ── Activity history for investigation (Phase 3) ──
router.get('/users/:id/activity', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid user id' });
    const uid = req.params.id;
    const [swipes, matches, messages] = await Promise.all([
      Swipe.find({ from: uid }).sort({ createdAt: -1 }).limit(25)
        .populate('to', 'name username profilePhoto').lean(),
      Match.find({ users: uid }).sort({ lastActivity: -1 }).limit(25)
        .populate('users', 'name username profilePhoto').lean(),
      Message.find({ $or: [{ sender: uid }, { receiver: uid }] }).sort({ createdAt: -1 }).limit(25)
        .populate('sender', 'name username').populate('receiver', 'name username').lean(),
    ]);
    res.json({ swipes, matches, messages });
  } catch (err) {
    console.error('Admin activity error:', err);
    res.status(500).json({ message: 'Failed to load activity' });
  }
});

// ── "View as user" — read-only preview of this user's Discover feed (Phase 3) ──
// Answers "why am I getting no matches": shows the candidate pool size + sample.
router.get('/users/:id/discover-preview', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid user id' });
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ message: 'User not found' });

    const coords = u.location?.coordinates?.length === 2 ? u.location.coordinates : [0, 0];
    const showMe = u.preferences?.showMe || 'everyone';
    const genderQuery = showMe === 'men' ? { gender: 'man' } : showMe === 'women' ? { gender: 'woman' } : {};
    const min = u.preferences?.ageRange?.min ?? 18;
    const max = u.preferences?.ageRange?.max ?? 100;
    const maxDistance = (u.preferences?.distance || 50) * 1000;

    const [blockedMe, mySwipes] = await Promise.all([
      User.find({ blockedUsers: u._id }).select('_id').lean(),
      Swipe.find({ from: u._id }).select('to').lean(),
    ]);
    const exclude = [u._id, ...(u.blockedUsers || []), ...blockedMe.map((x) => x._id), ...mySwipes.map((s) => s.to)];

    const base = [
      {
        $geoNear: {
          near: { type: 'Point', coordinates: coords },
          distanceField: 'distance',
          maxDistance,
          spherical: true,
          query: { _id: { $nin: exclude }, isActive: true, emailVerificationPending: { $ne: true }, ...genderQuery },
        },
      },
      { $addFields: { age: { $dateDiff: { startDate: '$dateOfBirth', endDate: '$$NOW', unit: 'year' } } } },
      { $match: { age: { $gte: min, $lte: max } } },
    ];

    const [countRes, candidates] = await Promise.all([
      User.aggregate([...base, { $count: 'n' }]),
      User.aggregate([
        ...base,
        { $limit: 12 },
        { $project: { name: 1, username: 1, age: 1, gender: 1, profilePhoto: 1, 'location.city': 1, distanceKm: { $round: [{ $divide: ['$distance', 1000] }, 1] } } },
      ]),
    ]);

    res.json({
      criteria: { showMe, ageRange: { min, max }, distanceKm: u.preferences?.distance || 50, city: u.location?.city || '', alreadySwiped: mySwipes.length },
      poolSize: countRes[0]?.n || 0,
      candidates,
    });
  } catch (err) {
    console.error('Admin discover-preview error:', err);
    res.status(500).json({ message: 'Failed to build preview' });
  }
});

// ── Bulk actions (Phase 2) ──
router.post('/users/bulk', async (req, res) => {
  try {
    const { ids, action, reason } = req.body || {};
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: 'No users selected' });
    const valid = ids.filter((id) => mongoose.isValidObjectId(id));
    let update;
    if (action === 'ban') update = { isActive: false, banReason: reason || '', bannedAt: new Date(), bannedBy: req.admin._id };
    else if (action === 'unban') update = { isActive: true, banReason: '', bannedAt: null, bannedBy: null };
    else if (action === 'verify') update = { isVerified: true };
    else if (action === 'unverify') update = { isVerified: false };
    else return res.status(400).json({ message: 'Invalid action' });

    const result = await User.updateMany({ _id: { $in: valid } }, update);
    await logAction(req, { action: `bulk_${action}`, targetType: 'user', targetLabel: `${valid.length} users`, details: { count: valid.length, reason } });
    res.json({ success: true, modified: result.modifiedCount ?? result.nModified ?? valid.length });
  } catch (err) {
    console.error('Admin bulk error:', err);
    res.status(500).json({ message: 'Bulk action failed' });
  }
});

// ══════════════════════════════════════════════════════════
//  REPORTS
// ══════════════════════════════════════════════════════════

router.get('/reports', async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req);
    const filter = {};
    if (['pending', 'reviewed', 'dismissed', 'actioned'].includes(req.query.status)) filter.status = req.query.status;
    const [items, total] = await Promise.all([
      Report.find(filter)
        .populate('reporter', 'name username email profilePhoto')
        .populate('reported', 'name username email profilePhoto isActive')
        .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Report.countDocuments(filter),
    ]);
    res.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Admin reports list error:', err);
    res.status(500).json({ message: 'Failed to load reports' });
  }
});

// Report drill-down: report + reported user's photos + their recent messages (Phase 2)
router.get('/reports/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid report id' });
    const report = await Report.findById(req.params.id)
      .populate('reporter', 'name username email profilePhoto')
      .populate('reported', 'name username email profilePhoto photos bio isActive isVerified createdAt')
      .lean();
    if (!report) return res.status(404).json({ message: 'Report not found' });

    let recentMessages = [];
    if (report.reported?._id) {
      recentMessages = await Message.find({ sender: report.reported._id })
        .sort({ createdAt: -1 }).limit(20)
        .select('text mediaType matchId createdAt').lean();
    }
    res.json({ report, recentMessages });
  } catch (err) {
    console.error('Admin report detail error:', err);
    res.status(500).json({ message: 'Failed to load report' });
  }
});

router.patch('/reports/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid report id' });
    const { status } = req.body || {};
    if (!['pending', 'reviewed', 'dismissed', 'actioned'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const report = await Report.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!report) return res.status(404).json({ message: 'Report not found' });
    await logAction(req, { action: 'resolve_report', targetType: 'report', targetId: report._id, details: { status } });
    res.json({ success: true, report });
  } catch (err) {
    console.error('Admin report update error:', err);
    res.status(500).json({ message: 'Failed to update report' });
  }
});

// ══════════════════════════════════════════════════════════
//  AUDIT LOG (Phase 2)
// ══════════════════════════════════════════════════════════

router.get('/audit', async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req);
    const filter = {};
    if (req.query.action) filter.action = req.query.action;
    const [items, total] = await Promise.all([
      AdminAction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AdminAction.countDocuments(filter),
    ]);
    res.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Admin audit error:', err);
    res.status(500).json({ message: 'Failed to load audit log' });
  }
});

module.exports = router;
