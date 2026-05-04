const { Project, Client } = require('../models');
const audit = require('../services/auditService');

exports.create = async (req, res, next) => {
  try {
    const { code, name, client_id, description, status, start_date, end_date } = req.body;

    const client = await Client.findByPk(client_id);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const project = await Project.create({
      code: code.toUpperCase(),
      name,
      client_id,
      description,
      status: status || 'active',
      start_date,
      end_date
    });

    await audit.log({
      entityType: 'project', entityId: project.id,
      action: 'created', newValues: project.toJSON(),
      userId: req.user.id, ipAddress: req.ip
    });

    res.status(201).json({ project });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Project code already exists' });
    }
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const { client_id, status } = req.query;
    const where = {};
    if (client_id) where.client_id = client_id;
    if (status) where.status = status;

    const projects = await Project.findAll({
      where,
      include: [{ model: Client, as: 'client', attributes: ['id', 'code', 'company_name'] }],
      order: [['created_at', 'DESC']]
    });
    res.json({ projects });
  } catch (err) {
    next(err);
  }
};

exports.get = async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id, {
      include: [{ model: Client, as: 'client' }]
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({ project });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const old = project.toJSON();
    await project.update(req.body);
    await audit.log({
      entityType: 'project', entityId: project.id,
      action: 'updated', oldValues: old, newValues: project.toJSON(),
      userId: req.user.id
    });
    res.json({ project });
  } catch (err) {
    next(err);
  }
};
