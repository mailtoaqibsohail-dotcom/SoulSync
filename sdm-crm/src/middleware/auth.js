const jwt = require('jsonwebtoken');
const { User, Role } = require('../models');

/**
 * requireAuth — verifies JWT, attaches req.user (with role)
 */
exports.requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(payload.sub, {
      include: [{ model: Role, as: 'role' }]
    });

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    next(err);
  }
};

/**
 * requirePermission('documents:approve') — checks role permissions array
 */
exports.requirePermission = (permission) => (req, res, next) => {
  const perms = req.user?.role?.permissions || [];
  if (!perms.includes(permission) && !perms.includes('*')) {
    return res.status(403).json({ error: `Permission denied: requires '${permission}'` });
  }
  next();
};
