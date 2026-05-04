const sequelize = require('../config/database');

const Role = require('./Role')(sequelize);
const User = require('./User')(sequelize);
const Client = require('./Client')(sequelize);
const Project = require('./Project')(sequelize);
const SerialSequence = require('./SerialSequence')(sequelize);
const Document = require('./Document')(sequelize);
const AuditLog = require('./AuditLog')(sequelize);
const MOC = require('./MOC')(sequelize);
const MocApprovalStep = require('./MocApprovalStep')(sequelize);
const MocForm = require('./MocForm')(sequelize);

const models = { Role, User, Client, Project, SerialSequence, Document, AuditLog, MOC, MocApprovalStep, MocForm };

// Run associations
Object.values(models).forEach((model) => {
  if (typeof model.associate === 'function') {
    model.associate(models);
  }
});

module.exports = { sequelize, ...models };
