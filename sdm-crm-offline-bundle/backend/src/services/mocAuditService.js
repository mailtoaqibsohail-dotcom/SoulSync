/**
 * MOC AUDIT AGGREGATES
 *
 * Builds a comprehensive audit snapshot for a date range. The range is
 * applied to `initiated_at` (when the MOC was raised); the lifecycle
 * counts (closed/rejected/expired) use their own timestamp columns
 * but only count rows within the same range so the totals are coherent.
 */
const { Op, fn, col, literal } = require('sequelize');
const { MOC, MocApprovalStep, User, sequelize } = require('../models');

function parseDate(s, fallback) {
  if (!s) return fallback;
  const d = new Date(s);
  return isNaN(d) ? fallback : d;
}

async function buildAudit({ from, to } = {}) {
  // Default range: last 12 months → today
  const toDate   = parseDate(to,   new Date());
  const fromDate = parseDate(from, new Date(toDate.getTime() - 365 * 86400000));
  // Make `to` inclusive of the day
  const toEod = new Date(toDate); toEod.setHours(23,59,59,999);

  const rangeWhere = { initiated_at: { [Op.between]: [fromDate, toEod] } };

  const [
    totalRaised,
    totalClosed,
    totalRejected,
    totalExpired,
    byStatus,
    byStage,
    byClassification,
    byRiskLevel,
    byDepartment,
    byField,
    byKind,
    byOriginator,
    pendingByAssignee,
    list,
    timing
  ] = await Promise.all([
    MOC.count({ where: rangeWhere }),
    MOC.count({ where: { ...rangeWhere, closed_at:   { [Op.ne]: null } } }),
    MOC.count({ where: { ...rangeWhere, rejected_at: { [Op.ne]: null } } }),
    MOC.count({ where: { ...rangeWhere, expired_at:  { [Op.ne]: null } } }),

    MOC.findAll({ where: rangeWhere, attributes: ['status',          [fn('COUNT', col('id')), 'n']], group: ['status'],          raw: true }),
    MOC.findAll({ where: rangeWhere, attributes: ['stage',           [fn('COUNT', col('id')), 'n']], group: ['stage'],           raw: true }),
    MOC.findAll({ where: rangeWhere, attributes: ['classification',  [fn('COUNT', col('id')), 'n']], group: ['classification'],  raw: true }),
    MOC.findAll({ where: rangeWhere, attributes: ['risk_level',      [fn('COUNT', col('id')), 'n']], group: ['risk_level'],      raw: true }),
    MOC.findAll({ where: rangeWhere, attributes: ['department_code', [fn('COUNT', col('id')), 'n']], group: ['department_code'], raw: true }),
    MOC.findAll({ where: rangeWhere, attributes: ['field_name',      [fn('COUNT', col('id')), 'n']], group: ['field_name'],      raw: true }),
    MOC.findAll({ where: rangeWhere, attributes: ['doc_kind',        [fn('COUNT', col('id')), 'n']], group: ['doc_kind'],        raw: true }),

    // Per-originator breakdown with status splits
    sequelize.query(`
      SELECT
        u.id AS user_id,
        CONCAT(u.first_name,' ',u.last_name) AS name,
        u.email,
        u.department_code AS dept,
        COUNT(m.id) AS raised,
        SUM(CASE WHEN m.closed_at IS NOT NULL THEN 1 ELSE 0 END)   AS closed,
        SUM(CASE WHEN m.rejected_at IS NOT NULL THEN 1 ELSE 0 END) AS rejected,
        SUM(CASE WHEN m.expired_at IS NOT NULL THEN 1 ELSE 0 END)  AS expired,
        SUM(CASE WHEN m.status IN ('draft','in_review','approved','in_execution','pssr') THEN 1 ELSE 0 END) AS in_progress
      FROM mocs m
      JOIN users u ON u.id = m.originator_id
      WHERE m.initiated_at BETWEEN :from AND :to
      GROUP BY u.id, u.first_name, u.last_name, u.email, u.department_code
      ORDER BY raised DESC, name ASC
    `, { replacements: { from: fromDate, to: toEod }, type: sequelize.QueryTypes.SELECT }),

    // Pending workload by assignee (regardless of date — reflects current state)
    sequelize.query(`
      SELECT
        u.id AS user_id,
        CONCAT(u.first_name,' ',u.last_name) AS name,
        u.email,
        u.department_code AS dept,
        COUNT(s.id) AS pending_steps,
        SUM(CASE WHEN s.step_type='classify' THEN 1 ELSE 0 END) AS pending_classify,
        SUM(CASE WHEN s.step_type='approve'  THEN 1 ELSE 0 END) AS pending_approve,
        SUM(CASE WHEN s.step_type='sme'      THEN 1 ELSE 0 END) AS pending_sme
      FROM moc_approval_steps s
      JOIN users u ON u.id = s.assignee_user_id
      WHERE s.status='pending'
      GROUP BY u.id, u.first_name, u.last_name, u.email, u.department_code
      ORDER BY pending_steps DESC, name ASC
    `, { type: sequelize.QueryTypes.SELECT }),

    // Detail list of MOCs in range
    MOC.findAll({
      where: rangeWhere,
      include: [{ association: 'originator', attributes: ['id', 'first_name', 'last_name', 'email'] }],
      order: [['initiated_at', 'DESC']]
    }),

    sequelize.query(`
      SELECT
        ROUND(AVG(TIMESTAMPDIFF(HOUR, initiated_at, approved_at))/24, 1)         AS avg_days_to_approve,
        ROUND(AVG(TIMESTAMPDIFF(HOUR, approved_at, execution_started_at))/24, 1) AS avg_days_approve_to_exec,
        ROUND(AVG(TIMESTAMPDIFF(HOUR, execution_started_at, closed_at))/24, 1)   AS avg_days_exec_to_close,
        ROUND(AVG(TIMESTAMPDIFF(HOUR, initiated_at, closed_at))/24, 1)           AS avg_days_total_cycle
      FROM mocs
      WHERE initiated_at BETWEEN :from AND :to
    `, { replacements: { from: fromDate, to: toEod }, type: sequelize.QueryTypes.SELECT })
  ]);

  return {
    range: { from: fromDate.toISOString(), to: toEod.toISOString() },
    totals: {
      raised: totalRaised,
      closed: totalClosed,
      rejected: totalRejected,
      expired: totalExpired,
      open:    totalRaised - totalClosed - totalRejected - totalExpired
    },
    by_status:         rowsToMap(byStatus,         'status'),
    by_stage:          rowsToMap(byStage,          'stage'),
    by_classification: rowsToMap(byClassification, 'classification'),
    by_risk_level:     rowsToMap(byRiskLevel,      'risk_level'),
    by_department:     rowsToMap(byDepartment,     'department_code'),
    by_field:          rowsToMap(byField,          'field_name'),
    by_kind:           rowsToMap(byKind,           'doc_kind'),
    by_originator:     byOriginator.map(numifyRow),
    pending_by_assignee: pendingByAssignee.map(numifyRow),
    timing: timing[0] || {},
    list: list.map(m => ({
      id: m.id,
      moc_number: m.moc_number,
      title: m.title,
      doc_kind: m.doc_kind,
      department_code: m.department_code,
      field_name: m.field_name,
      classification: m.classification,
      risk_level: m.risk_level,
      stage: m.stage,
      status: m.status,
      duration: m.duration,
      expiry_date: m.expiry_date,
      initiated_at: m.initiated_at,
      approved_at: m.approved_at,
      closed_at: m.closed_at,
      rejected_at: m.rejected_at,
      expired_at: m.expired_at,
      originator: m.originator
        ? `${m.originator.first_name} ${m.originator.last_name}`
        : '—'
    }))
  };
}

function rowsToMap(rows, key) {
  const out = {};
  for (const r of rows) out[r[key] ?? 'unknown'] = Number(r.n);
  return out;
}

function numifyRow(r) {
  const out = {};
  for (const k of Object.keys(r)) {
    const v = r[k];
    out[k] = (v !== null && v !== undefined && !isNaN(v) && k !== 'name' && k !== 'email' && k !== 'dept')
      ? Number(v) : v;
  }
  return out;
}

module.exports = { buildAudit };
