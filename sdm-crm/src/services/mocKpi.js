/**
 * MOC KPI snapshots — counts and timing aggregates for the dashboard.
 *
 * All numbers are computed live from the mocs table. For larger fleets
 * this could be cached for ~5 min; current scale is hundreds of records,
 * so a single query per metric is fine.
 */
const { MOC, sequelize } = require('../models');
const { Op, fn, col, literal } = require('sequelize');

async function snapshot() {
  const [byStatus, byStage, byClass, byRisk, byDept, totals, overdueTemp, expiringSoon] = await Promise.all([
    MOC.findAll({ attributes: ['status', [fn('COUNT', col('id')), 'n']], group: ['status'], raw: true }),
    MOC.findAll({ attributes: ['stage',  [fn('COUNT', col('id')), 'n']], group: ['stage'],  raw: true }),
    MOC.findAll({ attributes: ['classification', [fn('COUNT', col('id')), 'n']], group: ['classification'], raw: true }),
    MOC.findAll({ attributes: ['risk_level', [fn('COUNT', col('id')), 'n']], group: ['risk_level'], raw: true }),
    MOC.findAll({ attributes: ['department_code', [fn('COUNT', col('id')), 'n']], group: ['department_code'], raw: true }),
    MOC.count(),
    MOC.count({ where: {
      duration: 'temporary',
      expiry_date: { [Op.lt]: literal('CURDATE()') },
      status: { [Op.notIn]: ['closed', 'cancelled', 'expired'] }
    }}),
    MOC.count({ where: {
      duration: 'temporary',
      expiry_date: { [Op.between]: [literal('CURDATE()'), literal('DATE_ADD(CURDATE(), INTERVAL 30 DAY)')] },
      status: { [Op.notIn]: ['closed', 'cancelled', 'expired'] }
    }})
  ]);

  // Average days from initiated_at to approved_at (for approved+ MOCs)
  const [timing] = await sequelize.query(`
    SELECT
      ROUND(AVG(TIMESTAMPDIFF(HOUR, initiated_at, approved_at))/24, 1)        AS avg_days_to_approve,
      ROUND(AVG(TIMESTAMPDIFF(HOUR, approved_at, execution_started_at))/24, 1) AS avg_days_approve_to_exec,
      ROUND(AVG(TIMESTAMPDIFF(HOUR, execution_started_at, closed_at))/24, 1)   AS avg_days_exec_to_close
    FROM mocs
  `, { type: sequelize.QueryTypes.SELECT });

  return {
    total: totals,
    overdue_temp: overdueTemp,
    expiring_within_30d: expiringSoon,
    by_status:         rowsToMap(byStatus, 'status'),
    by_stage:          rowsToMap(byStage,  'stage'),
    by_classification: rowsToMap(byClass,  'classification'),
    by_risk_level:     rowsToMap(byRisk,   'risk_level'),
    by_department:     rowsToMap(byDept,   'department_code'),
    avg_days_to_approve:      timing?.avg_days_to_approve      ?? null,
    avg_days_approve_to_exec: timing?.avg_days_approve_to_exec ?? null,
    avg_days_exec_to_close:   timing?.avg_days_exec_to_close   ?? null
  };
}

function rowsToMap(rows, key) {
  const out = {};
  for (const r of rows) out[r[key] ?? 'unknown'] = Number(r.n);
  return out;
}

module.exports = { snapshot };
