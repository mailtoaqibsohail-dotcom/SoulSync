/**
 * MOC WORKFLOW ENGINE — Mari Energies hierarchy approval chain.
 *
 * Per MSP-HSE-08:
 *   - JRE initiates (Stage 1) and submits.
 *   - On submit, the system builds the full hierarchy chain based on
 *     classification (minor|major) + is_capital_project flag.
 *   - Each step is held by the user occupying that hierarchy position.
 *   - Steps are sequential: only the lowest-seq pending step is active.
 *   - Approve → advance to next.
 *   - Reject → MOC.status='revision_required', remaining pending steps
 *     are cancelled; originator can edit and resubmit, which rebuilds
 *     the chain from the top.
 *   - Delegate → assignee re-routes the step to a subordinate; original
 *     holder is preserved on the step for the audit trail.
 */

const { MOC, MocApprovalStep, User, sequelize } = require('../models');
const { Op } = require('sequelize');
const chains = require('./mocChains');

const SEQ_GAP = 10;

class WorkflowError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function getActiveStep(mocId, transaction = null) {
  return MocApprovalStep.findOne({
    where: { moc_id: mocId, status: 'pending' },
    order: [['seq', 'ASC']],
    transaction
  });
}

async function getSteps(mocId) {
  return MocApprovalStep.findAll({
    where: { moc_id: mocId },
    include: [
      { association: 'assignee',         attributes: ['id', 'first_name', 'last_name', 'email', 'moc_position'] },
      { association: 'originalAssignee', attributes: ['id', 'first_name', 'last_name', 'email'] },
      { association: 'decider',          attributes: ['id', 'first_name', 'last_name', 'email'] }
    ],
    order: [['seq', 'ASC']]
  });
}

/**
 * Find the user holding a given hierarchy position. Returns null if none.
 * For department-scoped positions (currently 'field_in_charge') we prefer
 * the user whose department_code matches the MOC; if none, fall back to
 * any active user with that position.
 */
async function findHolder(positionCode, moc, transaction) {
  const baseWhere = {
    moc_position: positionCode,
    is_active: true,
    client_id: null
  };

  if (positionCode === 'field_in_charge' && moc.department_code) {
    const scoped = await User.findOne({
      where: { ...baseWhere, department_code: moc.department_code },
      transaction
    });
    if (scoped) return scoped;
  }
  return User.findOne({ where: baseWhere, transaction });
}

/**
 * Build the full hierarchy chain for an MOC. Wipes any pre-existing
 * pending/cancelled steps (used both on first submit and on resubmit
 * after revision_required).
 */
async function buildHierarchyChain(moc, transaction) {
  const positions = chains.chainFor(moc);
  if (!positions || positions.length === 0) {
    throw new WorkflowError(500, 'No approval chain defined for this MOC');
  }

  // Wipe any existing not-yet-decided steps so resubmission starts clean.
  await MocApprovalStep.destroy({
    where: { moc_id: moc.id, status: { [Op.in]: ['pending', 'cancelled'] } },
    transaction
  });

  let seq = SEQ_GAP;
  for (const code of positions) {
    const holder = await findHolder(code, moc, transaction);
    if (!holder) {
      throw new WorkflowError(400, `No active user is assigned to position "${chains.positionLabel(code)}". Ask an admin to assign one before submitting.`);
    }
    await MocApprovalStep.create({
      moc_id: moc.id,
      seq,
      step_type: 'hierarchy',
      position_code: code,
      assignee_user_id: holder.id,
      original_assignee_user_id: holder.id,
      status: 'pending'
    }, { transaction });
    seq += SEQ_GAP;
  }
}

async function submitForReview(moc, transaction) {
  if (!moc.classification || moc.classification === 'pending') {
    throw new WorkflowError(400, 'Classification (minor/major) must be set before submission');
  }
  // Allow submit from draft OR revision_required (after a rejection).
  if (!['draft', 'revision_required'].includes(moc.status)) {
    throw new WorkflowError(409, `Cannot submit MOC in status: ${moc.status}`);
  }
  await buildHierarchyChain(moc, transaction);
  await moc.update({
    status: 'in_review',
    stage: 1,
    rejection_reason: null,
    rejected_at: null
  }, { transaction });
}

/**
 * Returns true if `subordinateId` is in the manager-chain below `assigneeId`
 * (transitive). i.e. subordinate.manager_user_id (→ manager → …) eventually
 * reaches assigneeId.
 */
async function isSubordinate(subordinateId, assigneeId, transaction) {
  if (!subordinateId || !assigneeId || subordinateId === assigneeId) return false;
  const seen = new Set();
  let cursor = await User.findByPk(subordinateId, { transaction });
  while (cursor && cursor.manager_user_id && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    if (cursor.manager_user_id === assigneeId) return true;
    cursor = await User.findByPk(cursor.manager_user_id, { transaction });
  }
  return false;
}

async function actOnStep(stepId, user, action, payload = {}) {
  const t = await sequelize.transaction();
  try {
    const step = await MocApprovalStep.findByPk(stepId, { transaction: t });
    if (!step) throw new WorkflowError(404, 'Step not found');
    const moc = await MOC.findByPk(step.moc_id, { transaction: t });
    if (!moc) throw new WorkflowError(404, 'MOC not found');

    if (step.status !== 'pending') {
      throw new WorkflowError(409, `Step is ${step.status}, no action possible`);
    }
    if (step.assignee_user_id !== user.id) {
      throw new WorkflowError(403, 'Only the current assignee can act on this step');
    }
    const active = await getActiveStep(moc.id, t);
    if (active.id !== step.id) {
      throw new WorkflowError(409, 'There is an earlier pending step that must act first');
    }

    const now = new Date();
    const comments = payload.comments || null;

    // ── DELEGATE ───────────────────────────────────────────
    if (action === 'delegate') {
      const targetId = Number(payload.delegate_to_user_id);
      if (!targetId) throw new WorkflowError(400, 'delegate_to_user_id is required');
      if (targetId === user.id) throw new WorkflowError(400, 'Cannot delegate to yourself');

      const target = await User.findByPk(targetId, { transaction: t });
      if (!target || !target.is_active || target.client_id) {
        throw new WorkflowError(400, 'Target user not found or inactive');
      }
      const ok = await isSubordinate(targetId, user.id, t);
      if (!ok) {
        throw new WorkflowError(403, 'You may only delegate to a user reporting up to you');
      }

      await step.update({
        assignee_user_id: targetId,
        delegated_at: now,
        comments: comments
          ? `[Delegated by ${user.first_name} ${user.last_name}] ${comments}`
          : `Delegated by ${user.first_name} ${user.last_name}`
      }, { transaction: t });

      await t.commit();
      return { step, moc };
    }

    // ── REJECT ─────────────────────────────────────────────
    if (action === 'reject') {
      if (!comments) throw new WorkflowError(400, 'Rejection requires comments');

      await step.update({
        status: 'rejected', comments,
        decision_by: user.id, decision_at: now
      }, { transaction: t });

      // Cancel every later pending step so the chain stops cleanly.
      await MocApprovalStep.update(
        { status: 'cancelled' },
        {
          where: { moc_id: moc.id, status: 'pending', seq: { [Op.gt]: step.seq } },
          transaction: t
        }
      );

      await moc.update({
        status: 'revision_required',
        rejected_at: now,
        rejection_reason: comments
      }, { transaction: t });

      await t.commit();
      return { step, moc };
    }

    // ── APPROVE ────────────────────────────────────────────
    if (action === 'approve') {
      await step.update({
        status: 'approved', comments,
        decision_by: user.id, decision_at: now
      }, { transaction: t });

      const remaining = await MocApprovalStep.findOne({
        where: { moc_id: moc.id, status: 'pending' },
        transaction: t
      });

      if (!remaining) {
        await moc.update({
          status: 'approved', stage: 2, approved_at: now
        }, { transaction: t });
      }

      await t.commit();
      return { step, moc };
    }

    throw new WorkflowError(400, `Unknown action: ${action}`);
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

module.exports = {
  submitForReview,
  actOnStep,
  getActiveStep,
  getSteps,
  buildHierarchyChain,
  isSubordinate,
  WorkflowError
};
