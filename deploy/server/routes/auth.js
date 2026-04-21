const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// ── Helper: sign JWT ──────────────────────────────────────
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const sendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  res.status(statusCode).json({
    success: true,
    token,
    user: user.toPublicProfile(),
  });
};

// ── POST /api/auth/register ───────────────────────────────
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('username')
      .trim()
      .notEmpty()
      .withMessage('Username is required')
      .matches(/^[a-z0-9_.]+$/i)
      .withMessage('Username can only contain letters, numbers, underscores, dots'),
    body('email').isEmail().withMessage('Enter a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('dateOfBirth').notEmpty().withMessage('Date of birth is required'),
    body('gender').notEmpty().withMessage('Gender is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, username, email, phone, password, dateOfBirth, gender, interestedIn } =
        req.body;

      // Check if user exists
      const existingUser = await User.findOne({
        $or: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() },
          ...(phone ? [{ phone }] : []),
        ],
      });

      if (existingUser) {
        if (existingUser.email === email.toLowerCase()) {
          return res.status(409).json({ message: 'Email already registered' });
        }
        if (existingUser.username === username.toLowerCase()) {
          return res.status(409).json({ message: 'Username already taken' });
        }
        if (phone && existingUser.phone === phone) {
          return res.status(409).json({ message: 'Phone number already registered' });
        }
      }

      // Validate age (must be 18+)
      const dob = new Date(dateOfBirth);
      const age = Math.floor((Date.now() - dob) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 18) {
        return res.status(400).json({ message: 'You must be at least 18 years old' });
      }

      const user = await User.create({
        name,
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        phone,
        password,
        dateOfBirth: dob,
        gender,
        interestedIn: interestedIn || ['everyone'],
      });

      sendToken(user, 201, res);
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ message: 'Server error during registration' });
    }
  }
);

// ── POST /api/auth/login ──────────────────────────────────
router.post(
  '/login',
  [
    body('identifier').trim().notEmpty().withMessage('Email, username, or phone is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { identifier, password } = req.body;

      // Find by email, username, or phone
      const user = await User.findOne({
        $or: [
          { email: identifier.toLowerCase() },
          { username: identifier.toLowerCase() },
          { phone: identifier },
        ],
      }).select('+password');

      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      if (!user.isActive) {
        return res.status(401).json({ message: 'Account has been deactivated' });
      }

      // Update online status
      user.isOnline = true;
      user.lastSeen = new Date();
      await user.save({ validateBeforeSave: false });

      sendToken(user, 200, res);
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ message: 'Server error during login' });
    }
  }
);

// ── POST /api/auth/logout ─────────────────────────────────
router.post('/logout', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      isOnline: false,
      lastSeen: new Date(),
    });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error during logout' });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, user: user.toPublicProfile() });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── PATCH /api/auth/update-password ──────────────────────
router.patch(
  '/update-password',
  protect,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user._id).select('+password');

      if (!(await user.comparePassword(currentPassword))) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      user.password = newPassword;
      await user.save();

      res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;
