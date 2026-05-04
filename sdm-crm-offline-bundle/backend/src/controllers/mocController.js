const { MOC, User, Client, Project, MocApprovalStep, sequelize } = require('../models');
const { generateMocNumber } = require('../services/mocNumberGenerator');
const workflow = require('../services/mocWorkflow');
const formSvc = require('../services/mocFormService');
const kpiSvc  = require('../services/mocKpi');
const auditSvc = require('../services/mocAuditService');
const { streamAuditPdf } = require('../services/mocAuditPdf');
const audit = require('../services/auditService');

// ── POST /api/mocs — Stage 1 Request Form
exports.create = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const {
      doc_kind = 'moc',
      title,
      department_code,
      field_name,
      facility,
      area_unit,
      duration,
      expiry_date,
      type_subcategory,
      category,
      priority,
      classification,
      risk_level,
      is_capital_project,
      background,
      proposed_modification,
      anticipated_benefit,
      job_dependency,
      required_completion_date,
      client_id,
      project_id,
      jre_user_id,
      notes
    } = req.body;

    if (duration === 'temporary') {
      if (!expiry_date) {
        await t.rollback();
        return res.status(400).json({ error: 'expiry_date is required for temporary MOCs' });
      }
      const days = Math.ceil((new Date(expiry_date) - new Date()) / 86400000);
      if (days > 180) {
        await t.rollback();
        return res.status(400).json({ error: 'Temporary MOC expiry cannot exceed 180 days (MSP-HSE-08 §6.7)' });
      }
    }

    const moc_number = await generateMocNumber(doc_kind, department_code, field_name, t);

    const moc = await MOC.create({
      moc_number,
      doc_kind,
      title,
      department_code,
      field_name,
      facility,
      area_unit,
      duration,
      expiry_date: duration === 'temporary' ? expiry_date : null,
      type_subcategory,
      category,
      priority,
      classification: classification || 'pending',
      risk_level:     risk_level     || 'pending',
      is_capital_project: !!is_capital_project,
      background,
      proposed_modification,
      anticipated_benefit,
      job_dependency,
      required_completion_date,
      client_id,
      project_id,
      jre_user_id,
      originator_id: req.user.id,
      notes,
      stage: 1,
      status: 'draft'
    }, { transaction: t });

    await audit.log({
      entityType: 'moc', entityId: moc.id,
      action: 'created', newValues: moc.toJSON(),
      userId: req.user.id, ipAddress: req.ip,
      transaction: t
    });

    await t.commit();
    res.status(201).json({ moc });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// ── GET /api/mocs
exports.list = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.status)         where.status = req.query.status;
    if (req.query.stage)          where.stage = req.query.stage;
    if (req.query.department)     where.department_code = req.query.department;
    if (req.query.classification) where.classification = req.query.classification;
    if (req.query.kind)           where.doc_kind = req.query.kind;

    // Client portal users see only their own MOCs
    if (req.user.client_id) where.client_id = req.user.client_id;

    const mocs = await MOC.findAll({
      where,
      include: [
        { model: User,    as: 'originator', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: User,    as: 'jre',        attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: Client,  as: 'client',     attributes: ['id', 'code', 'company_name'] },
        { model: Project, as: 'project',    attributes: ['id', 'code', 'name'] }
      ],
      order: [['initiated_at', 'DESC']]
    });
    res.json({ mocs });
  } catch (err) { next(err); }
};

// ── GET /api/mocs/:id
exports.get = async (req, res, next) => {
  try {
    const moc = await MOC.findByPk(req.params.id, {
      include: [
        { model: User,    as: 'originator', attributes: ['id', 'first_name', 'last_name', 'email', 'department_code'] },
        { model: User,    as: 'jre',        attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: Client,  as: 'client',     attributes: ['id', 'code', 'company_name'] },
        { model: Project, as: 'project',    attributes: ['id', 'code', 'name'] }
      ]
    });
    if (!moc) return res.status(404).json({ error: 'MOC not found' });
    if (req.user.client_id && moc.client_id !== req.user.client_id) {
      return res.status(404).json({ error: 'MOC not found' });
    }
    res.json({ moc });
  } catch (err) { next(err); }
};

// ── PATCH /api/mocs/:id — edit Stage 1 fields while still in draft
exports.update = async (req, res, next) => {
  try {
    const moc = await MOC.findByPk(req.params.id);
    if (!moc) return res.status(404).json({ error: 'MOC not found' });
    if (!['draft', 'revision_required'].includes(moc.status)) {
      return res.status(409).json({ error: 'Only draft or revision-required MOCs can be edited' });
    }

    const editable = [
      'title', 'facility', 'area_unit',
      'duration', 'expiry_date', 'type_subcategory',
      'category', 'priority', 'classification', 'risk_level',
      'is_capital_project',
      'background', 'proposed_modification', 'anticipated_benefit',
      'job_dependency', 'required_completion_date',
      'client_id', 'project_id', 'jre_user_id', 'notes'
    ];
    const patch = {};
    for (const k of editable) if (k in req.body) patch[k] = req.body[k];

    const old = moc.toJSON();
    await moc.update(patch);

    await audit.log({
      entityType: 'moc', entityId: moc.id,
      action: 'updated', oldValues: old, newValues: moc.toJSON(),
      userId: req.user.id, ipAddress: req.ip
    });

    res.json({ moc });
  } catch (err) { next(err); }
};

// ── POST /api/mocs/:id/submit — draft → in_review (creates classify step)
exports.submit = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const moc = await MOC.findByPk(req.params.id, { transaction: t });
    if (!moc) { await t.rollback(); return res.status(404).json({ error: 'MOC not found' }); }
    if (!['draft', 'revision_required'].includes(moc.status)) {
      await t.rollback();
      return res.status(409).json({ error: `Cannot submit MOC in status: ${moc.status}` });
    }
    if (moc.originator_id !== req.user.id) {
      await t.rollback();
      return res.status(403).json({ error: 'Only the originator can submit this MOC' });
    }

    await workflow.submitForReview(moc, t);

    await audit.log({
      entityType: 'moc', entityId: moc.id,
      action: 'submitted_for_review',
      userId: req.user.id, ipAddress: req.ip,
      transaction: t
    });
    await t.commit();
    res.json({ moc });
  } catch (err) {
    await t.rollback();
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

// ── GET /api/mocs/:id/steps — full approval chain
exports.getSteps = async (req, res, next) => {
  try {
    const moc = await MOC.findByPk(req.params.id);
    if (!moc) return res.status(404).json({ error: 'MOC not found' });
    if (req.user.client_id && moc.client_id !== req.user.client_id) {
      return res.status(404).json({ error: 'MOC not found' });
    }
    const steps = await workflow.getSteps(moc.id);
    const active = steps.find(s => s.status === 'pending');
    res.json({
      steps,
      active_step_id: active ? active.id : null,
      can_act: active ? active.assignee_user_id === req.user.id : false
    });
  } catch (err) { next(err); }
};

// ── POST /api/mocs/:id/steps/:stepId/act — act on the active step
exports.actOnStep = async (req, res, next) => {
  try {
    const { action, comments, classification, risk_level, approvers, sme_user_id, question } = req.body;
    if (!['approve', 'reject', 'forward_sme', 'delegate'].includes(action)) {
      return res.status(400).json({ error: 'action must be approve, reject, forward_sme, or delegate' });
    }
    const result = await workflow.actOnStep(req.params.stepId, req.user, action, {
      comments, classification, risk_level, approvers, sme_user_id, question,
      delegate_to_user_id: req.body.delegate_to_user_id
    });
    if (String(result.step.moc_id) !== String(req.params.id)) {
      return res.status(400).json({ error: 'Step does not belong to this MOC' });
    }

    await audit.log({
      entityType: 'moc', entityId: result.moc.id,
      action: `step_${action}`,
      newValues: { step_id: result.step.id, classification, risk_level, comments },
      userId: req.user.id, ipAddress: req.ip
    });

    res.json({ step: result.step, moc: result.moc });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

// ── KPI dashboard
exports.kpi = async (req, res, next) => {
  try {
    const data = await kpiSvc.snapshot();
    res.json(data);
  } catch (err) { next(err); }
};

// ── GET /api/mocs/delegatees — users the caller may delegate a step to
exports.delegatees = async (req, res, next) => {
  try {
    // BFS through reports tree.
    const all = await User.findAll({
      where: { is_active: true, client_id: null },
      attributes: ['id', 'first_name', 'last_name', 'email', 'department_code', 'moc_position', 'manager_user_id']
    });
    const byManager = new Map();
    for (const u of all) {
      const k = u.manager_user_id || 0;
      if (!byManager.has(k)) byManager.set(k, []);
      byManager.get(k).push(u);
    }
    const out = [];
    const visited = new Set();
    const queue = [...(byManager.get(req.user.id) || [])];
    while (queue.length) {
      const u = queue.shift();
      if (visited.has(u.id)) continue;
      visited.add(u.id);
      out.push(u);
      queue.push(...(byManager.get(u.id) || []));
    }
    res.json({ users: out });
  } catch (err) { next(err); }
};

// ── Minute Sheet (PDF)
exports.minuteSheet = async (req, res, next) => {
  try {
    const moc = await MOC.findByPk(req.params.id, {
      include: [{ association: 'originator', attributes: ['id','first_name','last_name','email','department_code','moc_position'] }]
    });
    if (!moc) return res.status(404).json({ error: 'MOC not found' });
    if (req.user.client_id && moc.client_id !== req.user.client_id) {
      return res.status(404).json({ error: 'MOC not found' });
    }
    const steps = await workflow.getSteps(moc.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${moc.moc_number}-minute-sheet.pdf"`);
    require('../services/mocMinuteSheetPdf').streamMinuteSheet(moc, steps, res);
  } catch (err) { next(err); }
};

// ── Audit aggregates (JSON)
exports.audit = async (req, res, next) => {
  try {
    const data = await auditSvc.buildAudit({ from: req.query.from, to: req.query.to });
    res.json(data);
  } catch (err) { next(err); }
};

// ── Audit report (PDF stream)
exports.auditPdf = async (req, res, next) => {
  try {
    const data = await auditSvc.buildAudit({ from: req.query.from, to: req.query.to });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="moc-audit-${Date.now()}.pdf"`);
    streamAuditPdf(data, res);
  } catch (err) { next(err); }
};

// ── MOCs awaiting action by the current user
exports.myActions = async (req, res, next) => {
  try {
    const steps = await MocApprovalStep.findAll({
      where: { assignee_user_id: req.user.id, status: 'pending' },
      include: [{
        model: MOC, as: 'moc',
        attributes: ['id', 'moc_number', 'title', 'department_code', 'field_name', 'stage', 'status', 'classification', 'risk_level']
      }],
      order: [['created_at', 'ASC']]
    });
    res.json({ actions: steps });
  } catch (err) { next(err); }
};

// ── Forms (Risk Screening / ISR / PSSR / Closeout) ─────────
exports.listForms = async (req, res, next) => {
  try {
    const moc = await MOC.findByPk(req.params.id);
    if (!moc) return res.status(404).json({ error: 'MOC not found' });
    if (req.user.client_id && moc.client_id !== req.user.client_id) {
      return res.status(404).json({ error: 'MOC not found' });
    }
    const forms = await formSvc.listForMoc(moc.id);
    res.json({ forms });
  } catch (err) { next(err); }
};

exports.saveForm = async (req, res, next) => {
  try {
    const form = await formSvc.upsert(req.params.id, req.params.formType, req.body.data || {}, req.user);
    await audit.log({
      entityType: 'moc', entityId: form.moc_id,
      action: `form_${req.params.formType}_saved`,
      userId: req.user.id, ipAddress: req.ip
    });
    res.json({ form });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

exports.submitForm = async (req, res, next) => {
  try {
    const form = await formSvc.submit(req.params.id, req.params.formType, req.user);
    await audit.log({
      entityType: 'moc', entityId: form.moc_id,
      action: `form_${req.params.formType}_submitted`,
      userId: req.user.id, ipAddress: req.ip
    });
    res.json({ form });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

exports.reopenForm = async (req, res, next) => {
  try {
    const form = await formSvc.reopen(req.params.id, req.params.formType, req.user);
    await audit.log({
      entityType: 'moc', entityId: form.moc_id,
      action: `form_${req.params.formType}_reopened`,
      userId: req.user.id, ipAddress: req.ip
    });
    res.json({ form });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

exports.approveForm = async (req, res, next) => {
  try {
    const form = await formSvc.approve(req.params.id, req.params.formType, req.user, req.body.comments);
    await audit.log({
      entityType: 'moc', entityId: form.moc_id,
      action: `form_${req.params.formType}_approved`,
      newValues: { comments: req.body.comments || null },
      userId: req.user.id, ipAddress: req.ip
    });
    res.json({ form });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};
