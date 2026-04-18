const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

// ── GET /api/users/discover ───────────────────────────────
// Returns nearby users filtered by age, gender, preferences
router.get('/discover', protect, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const { lng, lat } = req.query;

    const userLng = parseFloat(lng) || currentUser.location.coordinates[0];
    const userLat = parseFloat(lat) || currentUser.location.coordinates[1];
    const maxDistance = (currentUser.preferences.distance || 50) * 1000; // km → metres

    const { min: minAge, max: maxAge } = currentUser.preferences.ageRange;

    // Calculate date range for age filtering
    const today = new Date();
    const minDob = new Date(today.getFullYear() - maxAge, today.getMonth(), today.getDate());
    const maxDob = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate());

    // Build gender filter
    const genderPref = currentUser.preferences.showMe;
    const genderFilter =
      genderPref === 'everyone' ? {} : { gender: genderPref === 'men' ? 'man' : 'woman' };

    // Users to exclude
    const excludeIds = [
      currentUser._id,
      ...currentUser.likedUsers,
      ...currentUser.dislikedUsers,
      ...currentUser.blockedUsers,
    ];

    const users = await User.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [userLng, userLat] },
          distanceField: 'distance',
          maxDistance,
          spherical: true,
          query: {
            _id: { $nin: excludeIds },
            isActive: true,
            dateOfBirth: { $gte: minDob, $lte: maxDob },
            ...genderFilter,
          },
        },
      },
      { $limit: 20 },
      {
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
          distance: { $round: [{ $divide: ['$distance', 1000] }, 1] }, // metres → km
          'location.city': 1,
          'location.country': 1,
        },
      },
    ]);

    res.json({ success: true, users });
  } catch (err) {
    console.error('Discover error:', err);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// ── GET /api/users/search ─────────────────────────────────
// Search by username, email, phone, or nearby
router.get('/search', protect, async (req, res) => {
  try {
    const { username, email, phone, nearby, lat, lng, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {
      _id: { $ne: req.user._id },
      isActive: true,
      blockedUsers: { $nin: [req.user._id] },
    };

    if (username) query.username = { $regex: username, $options: 'i' };
    if (email) query.email = email.toLowerCase();
    if (phone) query.phone = phone;

    if (nearby === 'true' && lat && lng) {
      const users = await User.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
            distanceField: 'distance',
            maxDistance: 100000, // 100 km
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
    const allowedFields = ['name', 'bio', 'gender', 'interestedIn', 'dateOfBirth', 'preferences'];
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
router.post('/photos', protect, upload.array('photos', 6), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No photos uploaded' });
    }

    const urls = req.files.map((f) => f.path);
    const user = await User.findById(req.user._id);

    if (user.photos.length + urls.length > 6) {
      return res.status(400).json({ message: 'Maximum 6 photos allowed' });
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
    res.json({ success: true, message: 'User blocked' });
  } catch (err) {
    res.status(500).json({ message: 'Error blocking user' });
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
