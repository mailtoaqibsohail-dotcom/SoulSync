const { Client, User, Role } = require('../models');
const audit = require('../services/auditService');

// Cached lookup for the "client" role id
let _clientRoleId = null;
async function getClientRoleId() {
  if (_clientRoleId) return _clientRoleId;
  const r = await Role.findOne({ where: { name: 'client' } });
  if (!r) throw new Error('Client role not found in roles table');
  _clientRoleId = r.id;
  return _clientRoleId;
}

exports.create = async (req, res, next) => {
  try {
    const { code, company_name, contact_name, contact_email, contact_phone, address } = req.body;

    const client = await Client.create({
      code: code.toUpperCase(),
      company_name,
      contact_name,
      contact_email,
      contact_phone,
      address
    });

    await audit.log({
      entityType: 'client', entityId: client.id,
      action: 'created', newValues: client.toJSON(),
      userId: req.user.id, ipAddress: req.ip
    });

    res.status(201).json({ client });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Client code already exists' });
    }
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const clients = await Client.findAll({
      where: { is_active: true },
      order: [['company_name', 'ASC']]
    });
    res.json({ clients });
  } catch (err) {
    next(err);
  }
};

exports.get = async (req, res, next) => {
  try {
    const client = await Client.findByPk(req.params.id, {
      include: ['projects']
    });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json({ client });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/clients/:id/login — create a client-portal user for this client
exports.createLogin = async (req, res, next) => {
  try {
    const { email, password, first_name, last_name } = req.body;
    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({ error: 'email, password, first_name and last_name are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const role_id = await getClientRoleId();

    const user = await User.create({
      email: email.toLowerCase(),
      password_hash: password, // hashed by beforeCreate hook
      first_name,
      last_name,
      role_id,
      department_code: 'GEN',
      client_id: client.id
    });

    await audit.log({
      entityType: 'user', entityId: user.id,
      action: 'client_login_created',
      newValues: { email, client_id: client.id, client_code: client.code },
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

// ── GET /api/clients/:id/logins — list client-portal users for this client
exports.listLogins = async (req, res, next) => {
  try {
    const role_id = await getClientRoleId();
    const users = await User.findAll({
      where: { client_id: req.params.id, role_id },
      attributes: { exclude: ['password_hash'] },
      order: [['first_name', 'ASC']]
    });
    res.json({ users });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const old = client.toJSON();
    await client.update(req.body);

    await audit.log({
      entityType: 'client', entityId: client.id,
      action: 'updated', oldValues: old, newValues: client.toJSON(),
      userId: req.user.id, ipAddress: req.ip
    });

    res.json({ client });
  } catch (err) {
    next(err);
  }
};
