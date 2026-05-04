const jwt = require('jsonwebtoken');
const { User, Role } = require('../models');
const audit = require('../services/auditService');

function signToken(userId) {
  return jwt.sign(
    { sub: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      where: { email: email.toLowerCase(), is_active: true },
      include: [{ model: Role, as: 'role' }]
    });

    if (!user || !(await user.verifyPassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    user.last_login_at = new Date();
    await user.save();

    await audit.log({
      entityType: 'user',
      entityId: user.id,
      action: 'login',
      userId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      token: signToken(user.id),
      user: user.toSafeObject()
    });
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res) => {
  res.json({ user: req.user.toSafeObject() });
};

exports.changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;

    if (!(await req.user.verifyPassword(current_password))) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    req.user.password_hash = new_password;  // beforeUpdate hook will bcrypt this
    await req.user.save();

    await audit.log({
      entityType: 'user',
      entityId: req.user.id,
      action: 'password_changed',
      userId: req.user.id,
      ipAddress: req.ip
    });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};
