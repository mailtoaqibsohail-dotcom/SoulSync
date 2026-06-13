const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Gate for every admin route. Verifies a token whose payload carries
// `kind: 'admin'` — a normal user token (payload { id }) lacks this and is
// rejected with 403, so the two auth domains can never cross over.
const requireAdmin = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ message: 'Not authorised — no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.kind !== 'admin' || !decoded.adminId) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const admin = await Admin.findById(decoded.adminId);
    if (!admin) {
      return res.status(401).json({ message: 'Admin no longer exists' });
    }
    if (!admin.isActive) {
      return res.status(403).json({ message: 'Admin account disabled' });
    }

    req.admin = admin;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = { requireAdmin };
