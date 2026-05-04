const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    entity_type: {
      type: DataTypes.STRING(50),
      allowNull: false      // 'document', 'client', 'project', 'user'
    },
    entity_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false      // 'created', 'status_changed', 'pdf_generated', etc.
    },
    old_values: {
      type: DataTypes.JSON,
      allowNull: true
    },
    new_values: {
      type: DataTypes.JSON,
      allowNull: true
    },
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true       // null for system actions
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    user_agent: {
      type: DataTypes.STRING(500),
      allowNull: true
    }
  }, {
    tableName: 'audit_logs',
    updatedAt: false,       // audit rows are immutable
    indexes: [
      { fields: ['entity_type', 'entity_id'] },
      { fields: ['user_id'] },
      { fields: ['action'] },
      { fields: ['created_at'] }
    ]
  });

  AuditLog.associate = (models) => {
    AuditLog.belongsTo(models.User, { foreignKey: 'user_id', as: 'actor' });
  };

  return AuditLog;
};
