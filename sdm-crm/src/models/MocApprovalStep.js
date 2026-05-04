const { DataTypes } = require('sequelize');

/**
 * One row in the MOC approval chain.
 *
 * Engine rules (see services/mocWorkflow.js):
 *   - The lowest-seq step with status='pending' is the *active* step.
 *   - Only the assignee of the active step can act on it.
 *   - 'classify' must be the first step. Approving it creates the 'approve' chain.
 *   - 'forward_sme' on any step inserts a new 'sme' step with seq = parent.seq+1
 *     (later steps are shifted up by +10 to make room).
 *   - SME approval reactivates its parent step.
 *   - When no pending steps remain, the MOC moves to status='approved', stage=2.
 */
module.exports = (sequelize) => {
  const MocApprovalStep = sequelize.define('MocApprovalStep', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    moc_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    seq:    { type: DataTypes.INTEGER, allowNull: false },
    step_type: {
      type: DataTypes.ENUM('classify', 'approve', 'sme', 'hierarchy'),
      allowNull: false
    },
    // For 'hierarchy' steps: the position this step represents
    // (e.g. 'manager_production'). Null for legacy classify/approve/sme.
    position_code: { type: DataTypes.STRING(40), allowNull: true },
    assignee_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    // If assignee delegated, original holder is preserved for the audit trail.
    original_assignee_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    delegated_at: { type: DataTypes.DATE, allowNull: true },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'forwarded', 'skipped', 'cancelled'),
      defaultValue: 'pending',
      allowNull: false
    },
    comments:    { type: DataTypes.TEXT, allowNull: true },
    decision_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    decision_at: { type: DataTypes.DATE, allowNull: true },

    classification_set: { type: DataTypes.ENUM('minor', 'major'), allowNull: true },
    risk_level_set:     { type: DataTypes.ENUM('low', 'high'),    allowNull: true },

    forwarded_to_step_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    parent_step_id:       { type: DataTypes.INTEGER.UNSIGNED, allowNull: true }
  }, {
    tableName: 'moc_approval_steps',
    indexes: [
      { fields: ['moc_id', 'seq'] },
      { fields: ['assignee_user_id', 'status'] }
    ]
  });

  MocApprovalStep.associate = (models) => {
    MocApprovalStep.belongsTo(models.MOC,  { foreignKey: 'moc_id', as: 'moc' });
    MocApprovalStep.belongsTo(models.User, { foreignKey: 'assignee_user_id',          as: 'assignee' });
    MocApprovalStep.belongsTo(models.User, { foreignKey: 'original_assignee_user_id', as: 'originalAssignee' });
    MocApprovalStep.belongsTo(models.User, { foreignKey: 'decision_by',                as: 'decider' });
  };

  return MocApprovalStep;
};
