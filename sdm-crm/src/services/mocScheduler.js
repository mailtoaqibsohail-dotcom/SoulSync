/**
 * MOC LIFECYCLE SCHEDULER
 *
 * Runs every 6 hours plus once at startup. No external cron dep.
 *
 * Tasks:
 *  1. WARN  — temporary MOCs whose expiry_date is within 30 days and that
 *             have not yet been warned. Sets `expiry_warned_at` and writes
 *             an audit-log entry.
 *  2. EXPIRE — temporary MOCs whose expiry_date has passed and which are
 *             not yet closed/cancelled/expired. Sets status='expired' and
 *             `expired_at`. The change-back-out work is the originator's
 *             responsibility but the MOC is locked from further approvals.
 *  3. MONTHLY DIGEST — once per calendar month (UTC), writes one audit-log
 *             record summarising MOCs by stage so KPI dashboards can chart
 *             month-over-month trends.
 *
 * The scheduler is fire-and-forget: any failure is logged but never crashes
 * the host process.
 */

const { Op } = require('sequelize');
const { MOC } = require('../models');
const audit  = require('./auditService');
const logger = require('../utils/logger');

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const WARN_WINDOW_DAYS = 30;

let _digestMonthDone = null; // YYYY-MM string of the last digest written

async function warnExpiringTempMocs() {
  const today = new Date(); today.setHours(0,0,0,0);
  const horizon = new Date(today.getTime() + WARN_WINDOW_DAYS * 86400000);

  const due = await MOC.findAll({
    where: {
      duration: 'temporary',
      expiry_date: { [Op.gte]: today, [Op.lte]: horizon },
      expiry_warned_at: { [Op.is]: null },
      status: { [Op.notIn]: ['closed', 'cancelled', 'expired'] }
    }
  });
  for (const moc of due) {
    await moc.update({ expiry_warned_at: new Date() });
    await audit.log({
      entityType: 'moc', entityId: moc.id,
      action: 'expiry_warning',
      newValues: { moc_number: moc.moc_number, expiry_date: moc.expiry_date }
    });
  }
  return due.length;
}

async function expireOverdueTempMocs() {
  const today = new Date(); today.setHours(0,0,0,0);

  const overdue = await MOC.findAll({
    where: {
      duration: 'temporary',
      expiry_date: { [Op.lt]: today },
      status: { [Op.notIn]: ['closed', 'cancelled', 'expired'] }
    }
  });
  for (const moc of overdue) {
    await moc.update({ status: 'expired', expired_at: new Date() });
    await audit.log({
      entityType: 'moc', entityId: moc.id,
      action: 'auto_expired',
      newValues: { moc_number: moc.moc_number, expiry_date: moc.expiry_date }
    });
  }
  return overdue.length;
}

async function writeMonthlyDigestIfDue() {
  const now = new Date();
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}`;
  if (_digestMonthDone === monthKey) return false;

  // First call within a fresh month → emit digest
  const all = await MOC.findAll({ attributes: ['stage', 'status', 'classification', 'risk_level'] });
  const byStage = {};
  const byStatus = {};
  for (const m of all) {
    byStage[m.stage] = (byStage[m.stage] || 0) + 1;
    byStatus[m.status] = (byStatus[m.status] || 0) + 1;
  }
  await audit.log({
    entityType: 'moc', entityId: 0,
    action: 'monthly_digest',
    newValues: { month: monthKey, total: all.length, by_stage: byStage, by_status: byStatus }
  });
  _digestMonthDone = monthKey;
  return true;
}

async function runLifecycleChecks() {
  try {
    const warned = await warnExpiringTempMocs();
    const expired = await expireOverdueTempMocs();
    const digest = await writeMonthlyDigestIfDue();
    if (warned || expired || digest) {
      logger.info(`MOC scheduler: warned=${warned} expired=${expired} digest=${digest}`);
    }
  } catch (err) {
    logger.error('MOC scheduler failed:', err);
  }
}

function start() {
  // Defer first run a bit so it never blocks startup
  setTimeout(runLifecycleChecks, 30 * 1000);
  setInterval(runLifecycleChecks, SIX_HOURS_MS);
  logger.info('MOC lifecycle scheduler armed (every 6h)');
}

module.exports = { start, runLifecycleChecks };
