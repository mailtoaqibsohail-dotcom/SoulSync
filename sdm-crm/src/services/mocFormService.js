/**
 * MOC form upsert + approval, with lifecycle side-effects:
 *
 *   risk_screening  approved → suggests classification/risk on parent MOC
 *                              (only fills if MOC still 'pending')
 *   isr             approved → MOC.stage = max(stage, 2)
 *   pssr            approved + approved_for_startup=true → MOC.stage = max(stage, 3),
 *                              status='in_execution', pssr_completed_at=now,
 *                              writes the 4 PSSR booleans onto MOC for quick lookup
 *   closeout        approved → MOC.stage = 4, status='closed', closed_at=now,
 *                              copies 6 closeout booleans + summary onto MOC
 */
const { MOC, MocForm, sequelize } = require('../models');

class FormError extends Error { constructor(s, m){ super(m); this.status = s; } }

const VALID_TYPES = ['risk_screening', 'isr', 'pssr', 'closeout'];

async function upsert(mocId, formType, data, user) {
  if (!VALID_TYPES.includes(formType)) throw new FormError(400, 'Invalid form_type');
  const moc = await MOC.findByPk(mocId);
  if (!moc) throw new FormError(404, 'MOC not found');

  let form = await MocForm.findOne({ where: { moc_id: mocId, form_type: formType } });
  if (form && form.status !== 'draft') {
    throw new FormError(409, `Form is ${form.status}, cannot edit. Reopen it first.`);
  }
  if (form) {
    await form.update({ data });
  } else {
    form = await MocForm.create({ moc_id: mocId, form_type: formType, data, status: 'draft' });
  }
  return form;
}

async function submit(mocId, formType, user) {
  const form = await MocForm.findOne({ where: { moc_id: mocId, form_type: formType } });
  if (!form) throw new FormError(404, 'Form not found — fill it first');
  if (form.status !== 'draft') throw new FormError(409, `Form is ${form.status}`);
  await form.update({
    status: 'submitted',
    submitted_by: user.id,
    submitted_at: new Date()
  });
  return form;
}

async function reopen(mocId, formType, user) {
  const form = await MocForm.findOne({ where: { moc_id: mocId, form_type: formType } });
  if (!form) throw new FormError(404, 'Form not found');
  if (form.status === 'approved') {
    throw new FormError(409, 'Approved forms cannot be reopened — create an addendum instead');
  }
  await form.update({
    status: 'draft',
    submitted_by: null, submitted_at: null
  });
  return form;
}

async function approve(mocId, formType, user, comments) {
  const t = await sequelize.transaction();
  try {
    const form = await MocForm.findOne({
      where: { moc_id: mocId, form_type: formType }, transaction: t
    });
    if (!form) throw new FormError(404, 'Form not found');
    if (form.status !== 'submitted') {
      throw new FormError(409, `Form must be submitted before approval (currently ${form.status})`);
    }
    if (form.submitted_by === user.id) {
      throw new FormError(403, 'You cannot approve your own submission');
    }

    const moc = await MOC.findByPk(mocId, { transaction: t });
    if (!moc) throw new FormError(404, 'MOC not found');

    await form.update({
      status: 'approved',
      approved_by: user.id,
      approved_at: new Date(),
      comments: comments || form.comments
    }, { transaction: t });

    const d = form.data || {};
    const now = new Date();

    if (formType === 'risk_screening') {
      const patch = {};
      if (moc.classification === 'pending' && (d.classification === 'minor' || d.classification === 'major')) {
        patch.classification = d.classification;
      }
      if (moc.risk_level === 'pending' && (d.risk_level === 'low' || d.risk_level === 'high')) {
        patch.risk_level = d.risk_level;
      }
      if (Object.keys(patch).length) await moc.update(patch, { transaction: t });
    }

    if (formType === 'isr') {
      if (moc.stage < 2) await moc.update({ stage: 2 }, { transaction: t });
    }

    if (formType === 'pssr') {
      const patch = {
        pssr_conducted:            !!d.conducted,
        pssr_changes_communicated: !!d.changes_communicated,
        pssr_cat_a_actions_closed: !!d.cat_a_actions_closed,
        pssr_approved_for_startup: !!d.approved_for_startup,
        pssr_completed_at: now
      };
      if (d.approved_for_startup) {
        patch.stage = Math.max(moc.stage, 3);
        patch.status = 'in_execution';
        if (!moc.execution_started_at) patch.execution_started_at = now;
      }
      await moc.update(patch, { transaction: t });
    }

    if (formType === 'closeout') {
      await moc.update({
        closeout_drawings_redlined:    !!d.drawings_redlined,
        closeout_procedures_updated:   !!d.procedures_updated,
        closeout_cat_b_actions_closed: !!d.cat_b_actions_closed,
        closeout_construction_dossier: !!d.construction_dossier,
        closeout_temp_reverted:        !!d.temp_reverted,
        closeout_verification_record:  !!d.verification_record,
        closeout_summary: d.summary || null,
        stage: 4, status: 'closed', closed_at: now
      }, { transaction: t });
    }

    await t.commit();
    return form;
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

async function listForMoc(mocId) {
  return MocForm.findAll({
    where: { moc_id: mocId },
    include: [
      { association: 'submitter', attributes: ['id', 'first_name', 'last_name'] },
      { association: 'approver',  attributes: ['id', 'first_name', 'last_name'] }
    ],
    order: [['form_type', 'ASC']]
  });
}

module.exports = { upsert, submit, reopen, approve, listForMoc, FormError, VALID_TYPES };
