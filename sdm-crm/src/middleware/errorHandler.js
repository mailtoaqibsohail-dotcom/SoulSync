const logger = require('../utils/logger');

module.exports = (err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    user: req.user?.id
  });

  // Sequelize validation errors — return field-level details
  if (err.name === 'SequelizeValidationError') {
    return res.status(422).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({ field: e.path, message: e.message }))
    });
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(422).json({ error: 'Referenced record does not exist' });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: status < 500 ? err.message : 'Internal server error'
  });
};
