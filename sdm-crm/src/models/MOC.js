const { DataTypes } = require('sequelize');

/**
 * Management of Change (MOC) record.
 * Implements the MariEnergies MSP-HSE-08 lifecycle:
 *   Stage 1 - Request, risk evaluation, approval
 *   Stage 2 - Work pack development & functional review
 *   Stage 3 - Execution + Pre-Startup Safety Review (PSSR)
 *   Stage 4 - Closeout
 */
module.exports = (sequelize) => {
  const MOC = sequelize.define('MOC', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },

    // Annexure E numbering: MOC-OPS-FieldName-2026-0001 / DISP-OPS-...-0001
    moc_number: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    doc_kind: { type: DataTypes.ENUM('moc', 'dispensation'), defaultValue: 'moc' },

    // Header (Stage 1 — Request Form)
    title: { type: DataTypes.STRING(500), allowNull: false },
    department_code: { type: DataTypes.STRING(20), allowNull: false }, // OPS / CIVIL
    field_name: { type: DataTypes.STRING(120), allowNull: false },     // Mari/Daharki/etc — used in numbering
    facility: { type: DataTypes.STRING(200), allowNull: true },
    area_unit: { type: DataTypes.STRING(200), allowNull: true },

    // Classification
    duration: { type: DataTypes.ENUM('permanent', 'temporary'), allowNull: false },
    expiry_date: { type: DataTypes.DATEONLY, allowNull: true }, // for temporary (max 180 days)
    type_subcategory: {
      type: DataTypes.ENUM(
        'facility', 'technology', 'operations', 'analytical_method',
        'document_psi', 'subtle', 'emergency', 'approved_project'
      ),
      allowNull: false
    },
    category: { type: DataTypes.ENUM('A', 'B', 'C', 'D'), allowNull: false }, // A=Safety,B=Production,C=Regulatory,D=Maintenance
    priority: { type: DataTypes.ENUM('1', '2', '3'), allowNull: false },      // 1=Immediate,2=6mo,3=>6mo
    classification: { type: DataTypes.ENUM('minor', 'major', 'pending'), defaultValue: 'pending' },
    risk_level:     { type: DataTypes.ENUM('low', 'high', 'pending'), defaultValue: 'pending' },
    is_capital_project: { type: DataTypes.BOOLEAN, defaultValue: false },

    // Stage 1 narrative
    background: { type: DataTypes.TEXT, allowNull: true },
    proposed_modification: { type: DataTypes.TEXT, allowNull: true },
    anticipated_benefit: { type: DataTypes.TEXT, allowNull: true },
    job_dependency: {
      type: DataTypes.ENUM('plant_shutdown', 'equipment_shutdown', 'load_reduction', 'normal_work'),
      allowNull: true
    },
    required_completion_date: { type: DataTypes.DATEONLY, allowNull: true },

    // Lifecycle
    stage:  { type: DataTypes.TINYINT.UNSIGNED, defaultValue: 1 },
    status: {
      type: DataTypes.ENUM(
        'draft', 'revision_required', 'in_review', 'approved', 'rejected',
        'in_execution', 'pssr', 'closed', 'cancelled', 'expired'
      ),
      defaultValue: 'draft'
    },

    // People
    originator_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    jre_user_id:   { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    client_id:     { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    project_id:    { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },

    // Stage timestamps
    initiated_at:         { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    approved_at:          { type: DataTypes.DATE, allowNull: true },
    rejected_at:          { type: DataTypes.DATE, allowNull: true },
    rejection_reason:     { type: DataTypes.TEXT, allowNull: true },
    execution_started_at: { type: DataTypes.DATE, allowNull: true },
    pssr_completed_at:    { type: DataTypes.DATE, allowNull: true },
    closed_at:            { type: DataTypes.DATE, allowNull: true },
    expiry_warned_at:     { type: DataTypes.DATE, allowNull: true },
    expired_at:           { type: DataTypes.DATE, allowNull: true },

    // Stage 3B PSSR
    pssr_conducted:           { type: DataTypes.BOOLEAN, allowNull: true },
    pssr_changes_communicated:{ type: DataTypes.BOOLEAN, allowNull: true },
    pssr_cat_a_actions_closed:{ type: DataTypes.BOOLEAN, allowNull: true },
    pssr_approved_for_startup:{ type: DataTypes.BOOLEAN, allowNull: true },

    // Stage 4 Closeout
    closeout_drawings_redlined:    { type: DataTypes.BOOLEAN, allowNull: true },
    closeout_procedures_updated:   { type: DataTypes.BOOLEAN, allowNull: true },
    closeout_cat_b_actions_closed: { type: DataTypes.BOOLEAN, allowNull: true },
    closeout_construction_dossier: { type: DataTypes.BOOLEAN, allowNull: true },
    closeout_temp_reverted:        { type: DataTypes.BOOLEAN, allowNull: true },
    closeout_verification_record:  { type: DataTypes.BOOLEAN, allowNull: true },
    closeout_summary:              { type: DataTypes.TEXT, allowNull: true },

    notes: { type: DataTypes.TEXT, allowNull: true }
  }, {
    tableName: 'mocs',
    indexes: [
      { unique: true, fields: ['moc_number'] },
      { fields: ['status'] },
      { fields: ['stage'] },
      { fields: ['department_code'] },
      { fields: ['classification'] },
      { fields: ['expiry_date'] },
      { fields: ['originator_id'] },
      { fields: ['jre_user_id'] }
    ]
  });

  MOC.associate = (models) => {
    MOC.belongsTo(models.User,    { foreignKey: 'originator_id', as: 'originator' });
    MOC.belongsTo(models.User,    { foreignKey: 'jre_user_id',   as: 'jre' });
    MOC.belongsTo(models.Client,  { foreignKey: 'client_id',     as: 'client' });
    MOC.belongsTo(models.Project, { foreignKey: 'project_id',    as: 'project' });
    MOC.hasMany(models.MocApprovalStep, { foreignKey: 'moc_id', as: 'approval_steps' });
    MOC.hasMany(models.MocForm,         { foreignKey: 'moc_id', as: 'forms' });
    MOC.hasMany(models.AuditLog, {
      foreignKey: 'entity_id',
      scope: { entity_type: 'moc' },
      as: 'audit_trail',
      constraints: false
    });
  };

  return MOC;
};
