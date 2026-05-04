const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const rateLimit = require('express-rate-limit');

// Strict limiter on login — 50 attempts per 15 min per IP (multiple users
// may share the same NAT/office IP, so this needs headroom).
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: 'Too many login attempts, please try again in 15 minutes.' }
});

router.post('/login', loginLimiter,
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate,
  ctrl.login
);

router.get('/me', requireAuth, ctrl.me);

router.post('/change-password', requireAuth,
  body('current_password').notEmpty(),
  body('new_password').isLength({ min: 8 }),
  validate,
  ctrl.changePassword
);

module.exports = router;
