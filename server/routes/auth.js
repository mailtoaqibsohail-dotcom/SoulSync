const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Match = require('../models/Match');
const Message = require('../models/Message');
const Swipe = require('../models/Swipe');
const Report = require('../models/Report');
const { protect } = require('../middleware/auth');
const { sendOtpEmail, sendPasswordResetEmail, generateOtp } = require('../utils/mailer');

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

// ── Helper: issue a fresh OTP, persist, email it ──────────
const issueOtp = async (user) => {
  const code = generateOtp();
  user.otpCode = code;
  user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min
  user.otpAttempts = 0;
  await user.save({ validateBeforeSave: false });
  // Don't await failure — email hiccups shouldn't break signup. Log & move on.
  sendOtpEmail({ to: user.email, name: user.name, code }).catch((err) =>
    console.error('OTP email failed:', err.message)
  );
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

      const existingUser = await User.findOne({
        $or: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() },
          ...(phone ? [{ phone }] : []),
        ],
      });

      if (existingUser) {
        // Edge case: email exists but account was never verified → resend OTP
        // instead of forcing the user to pick a new email.
        if (
          existingUser.email === email.toLowerCase() &&
          existingUser.emailVerificationPending
        ) {
          await issueOtp(existingUser);
          return res.json({
            success: true,
            requiresVerification: true,
            email: existingUser.email,
            message: 'Verification code resent',
          });
        }
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
        isVerified: false,
        emailVerificationPending: true,
      });

      await issueOtp(user);

      // Don't return a token yet — they must verify first.
      res.status(201).json({
        success: true,
        requiresVerification: true,
        email: user.email,
        message: 'Account created. Check your email for a verification code.',
      });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ message: 'Server error during registration' });
    }
  }
);

// ── POST /api/auth/verify-otp ─────────────────────────────
router.post(
  '/verify-otp',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('code').trim().isLength({ min: 6, max: 6 }).withMessage('6-digit code required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { email, code } = req.body;
      const user = await User.findOne({ email: email.toLowerCase() })
        .select('+otpCode +otpExpires +otpAttempts');
      if (!user) return res.status(404).json({ message: 'Account not found' });

      if (!user.emailVerificationPending) {
        // Already verified → just log them in
        return sendToken(user, 200, res);
      }

      if (!user.otpCode || !user.otpExpires) {
        return res.status(400).json({ message: 'No code pending. Request a new one.' });
      }
      if (user.otpExpires < new Date()) {
        return res.status(400).json({ message: 'Code expired. Request a new one.' });
      }
      if (user.otpAttempts >= 5) {
        return res.status(429).json({ message: 'Too many attempts. Request a new code.' });
      }
      if (user.otpCode !== code.trim()) {
        user.otpAttempts += 1;
        await user.save({ validateBeforeSave: false });
        return res.status(400).json({ message: 'Invalid code' });
      }

      user.isVerified = true;
      user.emailVerificationPending = false;
      user.otpCode = undefined;
      user.otpExpires = undefined;
      user.otpAttempts = 0;
      user.isOnline = true;
      user.lastSeen = new Date();
      await user.save({ validateBeforeSave: false });

      sendToken(user, 200, res);
    } catch (err) {
      console.error('Verify OTP error:', err);
      res.status(500).json({ message: 'Verification failed' });
    }
  }
);

// ── POST /api/auth/resend-otp ─────────────────────────────
router.post(
  '/resend-otp',
  [body('email').isEmail().withMessage('Valid email required')],
  async (req, res) => {
    try {
      const user = await User.findOne({ email: req.body.email.toLowerCase() });
      if (!user) return res.status(404).json({ message: 'Account not found' });
      if (!user.emailVerificationPending) {
        return res.status(400).json({ message: 'Account already verified' });
      }
      await issueOtp(user);
      res.json({ success: true, message: 'Code resent' });
    } catch (err) {
      console.error('Resend OTP error:', err);
      res.status(500).json({ message: 'Failed to resend code' });
    }
  }
);

// ── POST /api/auth/forgot-password ────────────────────────
// Emails a 6-digit reset code. Always returns success regardless of whether
// the email exists — don't leak which addresses are registered.
router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('Valid email required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const email = req.body.email.toLowerCase();
      const user = await User.findOne({ email });
      if (user && user.isActive) {
        const code = generateOtp();
        user.otpCode = code;
        user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        user.otpAttempts = 0;
        await user.save({ validateBeforeSave: false });
        sendPasswordResetEmail({ to: user.email, name: user.name, code }).catch(
          (err) => console.error('Reset email failed:', err.message)
        );
      }
      // Generic response — don't reveal whether the email exists
      res.json({
        success: true,
        message: 'If an account exists for that email, a reset code has been sent.',
      });
    } catch (err) {
      console.error('Forgot password error:', err);
      res.status(500).json({ message: 'Failed to send reset code' });
    }
  }
);

// ── POST /api/auth/reset-password ─────────────────────────
// Verifies the OTP and sets a new password in one step.
router.post(
  '/reset-password',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('code').trim().isLength({ min: 6, max: 6 }).withMessage('6-digit code required'),
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
      const { email, code, newPassword } = req.body;
      const user = await User.findOne({ email: email.toLowerCase() })
        .select('+password +otpCode +otpExpires +otpAttempts');
      if (!user) return res.status(400).json({ message: 'Invalid code' });

      if (!user.otpCode || !user.otpExpires) {
        return res.status(400).json({ message: 'No reset pending. Request a new code.' });
      }
      if (user.otpExpires < new Date()) {
        return res.status(400).json({ message: 'Code expired. Request a new one.' });
      }
      if (user.otpAttempts >= 5) {
        return res.status(429).json({ message: 'Too many attempts. Request a new code.' });
      }
      if (user.otpCode !== code.trim()) {
        user.otpAttempts += 1;
        await user.save({ validateBeforeSave: false });
        return res.status(400).json({ message: 'Invalid code' });
      }

      user.password = newPassword; // pre-save hook hashes it
      user.otpCode = undefined;
      user.otpExpires = undefined;
      user.otpAttempts = 0;
      await user.save();

      res.json({ success: true, message: 'Password reset successful. You can now sign in.' });
    } catch (err) {
      console.error('Reset password error:', err);
      res.status(500).json({ message: 'Failed to reset password' });
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

      // Verification only blocks login for accounts that came through the new
      // OTP signup flow. Legacy accounts (emailVerificationPending=false) sign
      // in as before even if isVerified is still false.
      if (user.emailVerificationPending) {
        await issueOtp(user);
        return res.json({
          success: true,
          requiresVerification: true,
          email: user.email,
          message: 'Please verify your email. A new code was sent.',
        });
      }

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

// ── POST /api/auth/request-delete-otp ────────────────────
// Step 1 of account deletion: email the user a fresh OTP. They must then
// submit it to DELETE /delete-account to actually wipe the account.
router.post('/request-delete-otp', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'Account not found' });
    await issueOtp(user);
    res.json({ success: true, message: 'A confirmation code was sent to your email' });
  } catch (err) {
    console.error('request-delete-otp error:', err);
    res.status(500).json({ message: 'Failed to send confirmation code' });
  }
});

// ── DELETE /api/auth/delete-account ───────────────────────
// Hard delete. Accepts either `password` OR `code` (email OTP) for confirmation.
// Cascades to matches, messages, swipes, reports, and removes this user from
// every other user's arrays.
router.delete(
  '/delete-account',
  protect,
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id).select('+password +otpCode +otpExpires +otpAttempts');
      if (!user) return res.status(404).json({ message: 'Account not found' });

      const { password, code } = req.body || {};

      // Must supply exactly one confirmation method
      if (!password && !code) {
        return res.status(400).json({ message: 'Password or OTP code required' });
      }

      if (password) {
        if (!(await user.comparePassword(password))) {
          return res.status(401).json({ message: 'Incorrect password' });
        }
      } else {
        // Validate OTP
        if (!user.otpCode || !user.otpExpires) {
          return res.status(400).json({ message: 'No code pending. Request one first.' });
        }
        if (user.otpExpires < new Date()) {
          return res.status(400).json({ message: 'Code expired. Request a new one.' });
        }
        if (user.otpAttempts >= 5) {
          return res.status(429).json({ message: 'Too many attempts. Request a new code.' });
        }
        if (user.otpCode !== String(code).trim()) {
          user.otpAttempts = (user.otpAttempts || 0) + 1;
          await user.save({ validateBeforeSave: false });
          return res.status(400).json({ message: 'Invalid code' });
        }
      }

      const uid = user._id;

      // Cascade delete
      await Promise.all([
        Message.deleteMany({ $or: [{ sender: uid }, { receiver: uid }] }),
        Match.deleteMany({ users: uid }),
        Swipe.deleteMany({ $or: [{ from: uid }, { to: uid }] }),
        Report.deleteMany({ $or: [{ reporter: uid }, { reported: uid }] }),
        // Remove me from other users' legacy arrays
        User.updateMany(
          {},
          {
            $pull: {
              likedUsers: uid,
              dislikedUsers: uid,
              blockedUsers: uid,
              matches: uid,
              'sparksReceived': { from: uid },
            },
          }
        ),
      ]);

      await User.deleteOne({ _id: uid });

      res.json({ success: true, message: 'Account deleted' });
    } catch (err) {
      console.error('Delete account error:', err);
      res.status(500).json({ message: 'Error deleting account' });
    }
  }
);

module.exports = router;

