const { DataTypes } = require('sequelize');

/**
 * MOC stage forms — Risk Screening / ISR / PSSR / Closeout.
 *
 * One row per (moc_id, form_type). The `data` JSON column holds the
 * form-specific answers (booleans, text, action lists). The structure
 * is validated by the frontend; the backend treats it as opaque JSON
 * but enforces lifecycle effects on submit/approve (see mocFormService).
 *
 * Lifecycle:
 *   draft → submitted (locked from edit) → approved
 */
module.exports = (sequelize) => {
  const MocForm = sequelize.define('MocForm', {
    id:     { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    moc_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    form_type: {
      type: DataTypes.ENUM('risk_screening', 'isr', 'pssr', 'closeout'),
      allowNull: false
    },
    data:   { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
    status: {
      type: DataTypes.ENUM('draft', 'submitted', 'approved'),
      defaultValue: 'draft', allowNull: false
    },
    submitted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    submitted_at: { type: DataTypes.DATE,             allowNull: true },
    approved_by:  { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    approved_at:  { type: DataTypes.DATE,             allowNull: true },
    comments:     { type: DataTypes.TEXT,             allowNull: true }
  }, {
    tableName: 'moc_forms',
    indexes: [
      { unique: true, fields: ['moc_id', 'form_type'] },
      { fields: ['status'] }
    ]
  });

  MocForm.associate = (models) => {
    MocForm.belongsTo(models.MOC,  { foreignKey: 'moc_id',       as: 'moc' });
    MocForm.belongsTo(models.User, { foreignKey: 'submitted_by', as: 'submitter' });
    MocForm.belongsTo(models.User, { foreignKey: 'approved_by',  as: 'approver' });
  };

  return MocForm;
};
