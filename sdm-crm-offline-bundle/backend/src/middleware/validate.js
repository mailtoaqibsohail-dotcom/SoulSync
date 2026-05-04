const { validationResult } = require('express-validator');

/**
 * Run after express-validator chains — returns 422 if any errors exist
 */
module.exports = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: 'Validation failed',
      details: errors.array().map((e) => ({ field: e.path, message: e.msg }))
    });
  }
  next();
};
