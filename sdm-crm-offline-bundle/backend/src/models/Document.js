const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Document = sequelize.define('Document', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    // e.g. PFE-ENG-2026-0001  — unique, immutable once assigned
    serial_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    title: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    doc_type_code: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    department_code: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    version: {
      type: DataTypes.TINYINT.UNSIGNED,
      defaultValue: 1
    },
    status: {
      type: DataTypes.ENUM('draft', 'under_review', 'approved', 'issued', 'cancelled'),
      defaultValue: 'draft'
    },
    // Template variable values (filled fields)
    content: {
      type: DataTypes.JSON,
      allowNull: true
    },
    // Relative path under UPLOADS_DIR (system-generated PDF)
    file_path: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    // User-uploaded source file
    attachment_path: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    attachment_original_name: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    attachment_mime: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    attachment_size: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    client_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    project_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    created_by: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    reviewed_by: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    approved_by: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    issued_by: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    issued_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Optional: notes visible to all collaborators
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'documents',
    indexes: [
      { unique: true, fields: ['serial_number'] },
      { fields: ['status'] },
      { fields: ['doc_type_code'] },
      { fields: ['department_code'] },
      { fields: ['client_id'] },
      { fields: ['project_id'] },
      { fields: ['created_by'] }
    ]
  });

  Document.associate = (models) => {
    Document.belongsTo(models.Client, { foreignKey: 'client_id', as: 'client' });
    Document.belongsTo(models.Project, { foreignKey: 'project_id', as: 'project' });
    Document.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
    Document.belongsTo(models.User, { foreignKey: 'approved_by', as: 'approver' });
    Document.belongsTo(models.User, { foreignKey: 'issued_by', as: 'issuer' });
    // constraints: false — entity_id is polymorphic (references users, clients, etc. too)
    Document.hasMany(models.AuditLog, {
      foreignKey: 'entity_id',
      scope: { entity_type: 'document' },
      as: 'audit_trail',
      constraints: false
    });
  };

  return Document;
};
