const { User, Role } = require('../models');
const audit = require('../services/auditService');

exports.create = async (req, res, next) => {
  try {
    const { email, password, first_name, last_name, role_id, department_code, moc_position, manager_user_id } = req.body;

    const user = await User.create({
      email: email.toLowerCase(),
      password_hash: password,   // beforeCreate hook bcrypts this
      first_name,
      last_name,
      role_id,
      department_code: (department_code || 'GEN').toUpperCase(),
      moc_position:    moc_position    || null,
      manager_user_id: manager_user_id || null
    });

    await audit.log({
      entityType: 'user', entityId: user.id,
      action: 'created',
      newValues: { email, department_code },
      userId: req.user.id, ipAddress: req.ip
    });

    res.status(201).json({ user: user.toSafeObject() });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const users = await User.findAll({
      include: [{ model: Role, as: 'role' }],
      attributes: { exclude: ['password_hash'] },
      order: [['first_name', 'ASC']]
    });
    res.json({ users });
  } catch (err) {
    next(err);
  }
};

// Lightweight picker for assignment dropdowns (JRE, approvers, SMEs).
// Returns active staff users only — no client-portal users, no password hashes.
exports.picker = async (req, res, next) => {
  try {
    const users = await User.findAll({
      where: { is_active: true, client_id: null },
      include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }],
      attributes: ['id', 'first_name', 'last_name', 'email', 'department_code', 'moc_position'],
      order: [['first_name', 'ASC']]
    });
    res.json({ users });
  } catch (err) { next(err); }
};

// PATCH /api/users/:id — admin updates user metadata (incl. MOC position + manager).
exports.update = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const editable = ['first_name', 'last_name', 'department_code', 'role_id', 'moc_position', 'manager_user_id', 'is_active'];
    const patch = {};
    for (const k of editable) if (k in req.body) patch[k] = req.body[k];
    if (patch.department_code) patch.department_code = String(patch.department_code).toUpperCase();
    if (patch.moc_position    === '') patch.moc_position    = null;
    if (patch.manager_user_id === '') patch.manager_user_id = null;
    if (Number(patch.manager_user_id) === Number(user.id)) {
      return res.status(400).json({ error: 'A user cannot be their own manager' });
    }

    const old = user.toSafeObject();
    await user.update(patch);
    await audit.log({
      entityType: 'user', entityId: user.id,
      action: 'updated', oldValues: old, newValues: user.toSafeObject(),
      userId: req.user.id, ipAddress: req.ip
    });
    res.json({ user: user.toSafeObject() });
  } catch (err) { next(err); }
};

exports.deactivate = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await user.update({ is_active: false });
    await audit.log({
      entityType: 'user', entityId: user.id,
      action: 'deactivated', userId: req.user.id
    });
    res.json({ message: 'User deactivated' });
  } catch (err) {
    next(err);
  }
};
