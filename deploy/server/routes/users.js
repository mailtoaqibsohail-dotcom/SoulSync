const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

// ── GET /api/users/discover ───────────────────────────────
// Returns nearby users sorted by distance (closest first).
// Applies user preferences (age, distance, gender) — but if no results match,
// auto-relaxes filters and flags the response so the client can explain.
router.get('/discover', protect, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // FIX: Guard against users who haven't set location yet
    const coords = currentUser.location?.coordinates;
    const hasStoredCoords =
      Array.isArray(coords) && coords.length === 2 &&
      !(coords[0] === 0 && coords[1] === 0);

    const { lng, lat } = req.query;
    const qLng = parseFloat(lng);
    const qLat = parseFloat(lat);
    const hasQueryCoords = !isNaN(qLng) && !isNaN(qLat);

    if (!hasQueryCoords && !hasStoredCoords) {
      return res.json({
        success: true,
        users: [],
        reason: 'no_location',
        message: 'Please enable location access or set your location in your profile.',
      });
    }

    const userLng = hasQueryCoords ? qLng : coords[0];
    const userLat = hasQueryCoords ? qLat : coords[1];

    const prefs = currentUser.preferences || {};

    // Per-request overrides (query params beat stored preferences).
    // This powers the Discover page filter panel.
    const qDistance = parseInt(req.query.distanceKm, 10);
    const qMinAge = parseInt(req.query.minAge, 10);
    const qMaxAge = parseInt(req.query.maxAge, 10);
    const qGender = req.query.gender; // 'men' | 'women' | 'everyone'
    const qCity = (req.query.city || '').trim();
    const qCountry = (req.query.country || '').trim();
    const qHobbies = (req.query.hobbies || '')
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean);

    const distanceKm = Number.isFinite(qDistance) && qDistance > 0
      ? qDistance
      : (prefs.distance || 50);
    const maxDistance = distanceKm * 1000; // km → metres

    const ageRange = prefs.ageRange || {};
    const minAge = Number.isFinite(qMinAge) ? qMinAge : (ageRange.min ?? 18);
    const maxAge = Number.isFinite(qMaxAge) ? qMaxAge : (ageRange.max ?? 99);

    const today = new Date();
    const minDob = new Date(today.getFullYear() - maxAge, today.getMonth(), today.getDate());
    const maxDob = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate());

    // FIX: Default showMe to 'everyone' when missing — old bug was that
    // `undefined` fell through to filtering for 'woman' specifically.
    const genderPref = qGender || prefs.showMe || 'everyone';
    const genderFilter =
      genderPref === 'everyone'
        ? {}
        : genderPref === 'men'
          ? { gender: 'man' }
          : genderPref === 'women'
            ? { gender: 'woman' }
            : { gender: genderPref }; // allow raw values like 'non-binary'

    // Position (city/country) — case-insensitive substring match
    const locationFilter = {};
    if (qCity) locationFilter['location.city'] = { $regex: qCity, $options: 'i' };
    if (qCountry) locationFilter['location.country'] = { $regex: qCountry, $options: 'i' };

    // Hobbies — match if user has ANY of the selected hobbies
    const hobbiesFilter = qHobbies.length ? { hobbies: { $in: qHobbies } } : {};

    // Exclude self + users I've blocked + users who blocked me
    const excludeIds = [
      currentUser._id,
      ...(currentUser.blockedUsers || []),
    ];
    // Users who blocked me (so I don't see them in discover either)
    const blockedMe = await User.find({ blockedUsers: currentUser._id }).select('_id').lean();
    blockedMe.forEach((u) => excludeIds.push(u._id));

    const projectStage = {
      $project: {
        name: 1,
        username: 1,
        dateOfBirth: 1,
        gender: 1,
        bio: 1,
        photos: 1,
        profilePhoto: 1,
        isOnline: 1,
        lastSeen: 1,
        isVerified: 1,
        distance: { $round: [{ $divide: ['$distance', 1000] }, 1] },
        'location.city': 1,
        'location.country': 1,
        age: {
          $dateDiff: {
            startDate: '$dateOfBirth',
            endDate: '$$NOW',
            unit: 'year',
          },
        },
      },
    };

    const runSearch = async (maxDist, query) =>
      User.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [userLng, userLat] },
            distanceField: 'distance',
            maxDistance: maxDist,
            spherical: true,
            query,
          },
        },
        { $limit: 100 },
        projectStage,
      ]);

    // Try 1: strict filters (user preferences + query overrides applied)
    let users = await runSearch(maxDistance, {
      _id: { $nin: excludeIds },
      isActive: true,
      dateOfBirth: { $gte: minDob, $lte: maxDob },
      ...genderFilter,
      ...locationFilter,
      ...hobbiesFilter,
    });
    let relaxed = false;

    // FIX: if strict filters return nothing, auto-relax so the grid isn't empty.
    // Client will show a banner explaining what happened.
    // Note: we only relax when the user didn't explicitly ask for filters — if
    // they've actively applied filters we respect them and return [].
    const userAppliedFilters =
      Number.isFinite(qMinAge) ||
      Number.isFinite(qMaxAge) ||
      qGender ||
      Number.isFinite(qDistance) ||
      qCity ||
      qCountry ||
      qHobbies.length > 0;

    if (users.length === 0 && !userAppliedFilters) {
      users = await runSearch(500 * 1000 /* 500 km */, {
        _id: { $nin: excludeIds },
        isActive: true,
      });
      relaxed = true;
    }

    res.json({
      success: true,
      users,
      relaxed,
      appliedPreferences: {
        distanceKm,
        ageRange: { min: minAge, max: maxAge },
        showMe: genderPref,
        city: qCity || null,
        country: qCountry || null,
        hobbies: qHobbies,
      },
    });
  } catch (err) {
    console.error('Discover error:', err);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// ── GET /api/users/search ─────────────────────────────────
// Nearby users (sorted by distance) with optional username filter.
// Email/phone filters removed — Grindr-style app shouldn't expose those.
router.get('/search', protect, async (req, res) => {
  try {
    const { username, nearby, lat, lng, page = 1, limit = 100 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {
      _id: { $ne: req.user._id },
      isActive: true,
      blockedUsers: { $nin: [req.user._id] },
    };

    if (username) query.username = { $regex: username, $options: 'i' };

    // Resolve coords: prefer query params, fall back to the user's stored location.
    let userLng = parseFloat(lng);
    let userLat = parseFloat(lat);
    if (nearby === 'true' && (isNaN(userLng) || isNaN(userLat))) {
      const me = await User.findById(req.user._id).select('location').lean();
      const coords = me?.location?.coordinates;
      if (Array.isArray(coords) && coords.length === 2 && !(coords[0] === 0 && coords[1] === 0)) {
        userLng = coords[0];
        userLat = coords[1];
      }
    }

    const hasCoords = !isNaN(userLng) && !isNaN(userLat);

    if (nearby === 'true' && hasCoords) {
      const users = await User.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [userLng, userLat] },
            distanceField: 'distance',
            // FIX: 500 km so we don't cut off smaller cities / rural areas.
            // Client can scroll; the list is already sorted closest-first.
            maxDistance: 500 * 1000,
            spherical: true,
            query,
          },
        },
        { $skip: skip },
        { $limit: parseInt(limit) },
        {
          $project: {
            name: 1, username: 1, dateOfBirth: 1, gender: 1,
            profilePhoto: 1, photos: 1, isOnline: 1, isVerified: 1,
            distance: { $round: [{ $divide: ['$distance', 1000] }, 1] },
          },
        },
      ]);
      return res.json({ success: true, users });
    }

    // No coords available → plain list (still excludes self + blocked)
    const users = await User.find(query)
      .select('name username dateOfBirth gender profilePhoto photos isOnline isVerified')
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ success: true, users });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ message: 'Error searching users' });
  }
});

// ── GET /api/users/blocked ────────────────────────────────
// IMPORTANT: must sit BEFORE /:id so Express doesn't treat "blocked"
// as a user id param.
router.get('/blocked', protect, async (req, res) => {
  try {
    const me = await User.findById(req.user._id)
      .populate('blockedUsers', 'name username profilePhoto photos')
      .lean();
    res.json({ success: true, blocked: me?.blockedUsers || [] });
  } catch (err) {
    console.error('Blocked list error:', err);
    res.status(500).json({ message: 'Error loading blocked users' });
  }
});

// ── POST /api/users/unblock/:id ───────────────────────────
router.post('/unblock/:id', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { blockedUsers: req.params.id },
    });
    res.json({ success: true, message: 'User unblocked' });
  } catch (err) {
    res.status(500).json({ message: 'Error unblocking user' });
  }
});

// ── GET /api/users/:id ────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || !user.isActive) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ success: true, user: user.toPublicProfile() });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching user' });
  }
});

// ── PATCH /api/users/profile ──────────────────────────────
router.patch('/profile', protect, async (req, res) => {
  try {
    const allowedFields = ['name', 'bio', 'gender', 'interestedIn', 'dateOfBirth', 'preferences', 'profilePhoto', 'coverPhoto'];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, user: user.toPublicProfile() });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ message: 'Error updating profile' });
  }
});

// ── PATCH /api/users/location ─────────────────────────────
router.patch('/location', protect, async (req, res) => {
  try {
    const { lat, lng, city, country } = req.body;

    await User.findByIdAndUpdate(req.user._id, {
      location: {
        type: 'Point',
        coordinates: [parseFloat(lng), parseFloat(lat)],
        city: city || '',
        country: country || '',
      },
    });

    res.json({ success: true, message: 'Location updated' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating location' });
  }
});

// ── POST /api/users/photos ────────────────────────────────
router.post('/photos', protect, upload.array('photos', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No photos uploaded' });
    }

    const urls = req.files.map((f) => f.path);
    const user = await User.findById(req.user._id);

    if (user.photos.length + urls.length > 5) {
      return res.status(400).json({ message: 'Maximum 5 photos allowed' });
    }

    user.photos = [...user.photos, ...urls];
    if (!user.profilePhoto) user.profilePhoto = urls[0];
    await user.save();

    res.json({ success: true, photos: user.photos });
  } catch (err) {
    console.error('Photo upload error:', err);
    res.status(500).json({ message: 'Error uploading photos' });
  }
});

// ── POST /api/users/profile-photo ────────────────────────
// Upload a dedicated profile picture (circular avatar). Independent of the
// photos[] array so the user can change it without touching gallery photos.
router.post('/profile-photo', protect, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No photo uploaded' });
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profilePhoto: req.file.path },
      { new: true }
    );
    res.json({ success: true, user: user.toPublicProfile() });
  } catch (err) {
    console.error('Profile photo upload error:', err);
    res.status(500).json({ message: 'Error uploading profile photo' });
  }
});

// ── POST /api/users/cover-photo ──────────────────────────
// Upload a dedicated cover photo (Facebook-style banner).
router.post('/cover-photo', protect, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No photo uploaded' });
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { coverPhoto: req.file.path },
      { new: true }
    );
    res.json({ success: true, user: user.toPublicProfile() });
  } catch (err) {
    console.error('Cover photo upload error:', err);
    res.status(500).json({ message: 'Error uploading cover photo' });
  }
});

// ── DELETE /api/users/photos/:index ──────────────────────
router.delete('/photos/:index', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const idx = parseInt(req.params.index);

    if (idx < 0 || idx >= user.photos.length) {
      return res.status(400).json({ message: 'Invalid photo index' });
    }

    user.photos.splice(idx, 1);
    if (user.profilePhoto === user.photos[idx]) {
      user.profilePhoto = user.photos[0] || '';
    }
    await user.save();

    res.json({ success: true, photos: user.photos });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting photo' });
  }
});

// ── POST /api/users/block/:id ─────────────────────────────
router.post('/block/:id', protect, async (req, res) => {
  try {
    const targetId = req.params.id;
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { blockedUsers: targetId },
      $pull: { matches: targetId, likedUsers: targetId },
    });
    // Deactivate any match between them so it disappears from inbox
    const Match = require('../models/Match');
    await Match.updateMany(
      { users: { $all: [req.user._id, targetId] } },
      { isActive: false }
    );
    res.json({ success: true, message: 'User blocked' });
  } catch (err) {
    res.status(500).json({ message: 'Error blocking user' });
  }
});

// ── POST /api/users/spark/:id ─────────────────────────────
// Send a "spark" notification (Grindr tap). Stores on recipient + emits socket event.
router.post('/spark/:id', protect, async (req, res) => {
  try {
    const targetId = req.params.id;
    if (targetId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot spark yourself' });
    }
    const target = await User.findById(targetId);
    if (!target || !target.isActive) return res.status(404).json({ message: 'User not found' });
    // Block check — both directions
    const blocked =
      (target.blockedUsers || []).some((id) => id.toString() === req.user._id.toString()) ||
      (req.user.blockedUsers || []).some((id) => id.toString() === targetId);
    if (blocked) return res.status(403).json({ message: 'Unavailable' });

    await User.findByIdAndUpdate(targetId, {
      $push: { sparksReceived: { from: req.user._id, at: new Date() } },
    });

    const io = req.app.get('io');
    io.to(targetId).emit('spark_received', {
      from: req.user._id,
      fromName: req.user.name,
      fromPhoto: req.user.profilePhoto || req.user.photos?.[0] || '',
    });

    res.json({ success: true, message: 'Spark sent!' });
  } catch (err) {
    console.error('Spark error:', err);
    res.status(500).json({ message: 'Error sending spark' });
  }
});


// ── POST /api/users/report/:id ────────────────────────────
router.post('/report/:id', protect, async (req, res) => {
  try {
    // In production: save to a Report model and notify admins
    console.log(`User ${req.user._id} reported user ${req.params.id}: ${req.body.reason}`);
    res.json({ success: true, message: 'Report submitted. Thank you.' });
  } catch (err) {
    res.status(500).json({ message: 'Error submitting report' });
  }
});

module.exports = router;
