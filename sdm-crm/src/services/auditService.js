const { AuditLog } = require('../models');
const logger = require('../utils/logger');

/**
 * Record an audit event. Fire-and-forget — never throws so it can't
 * break the main request flow.
 *
 * @param {object} params
 * @param {string} params.entityType  'document' | 'client' | 'project' | 'user'
 * @param {number} params.entityId
 * @param {string} params.action      e.g. 'created', 'status_changed', 'pdf_generated'
 * @param {object} [params.oldValues]
 * @param {object} [params.newValues]
 * @param {number} [params.userId]
 * @param {string} [params.ipAddress]
 * @param {string} [params.userAgent]
 * @param {object} [params.transaction]  Join an existing transaction
 */
async function log({
  entityType,
  entityId,
  action,
  oldValues = null,
  newValues = null,
  userId = null,
  ipAddress = null,
  userAgent = null,
  transaction = null
}) {
  try {
    await AuditLog.create({
      entity_type: entityType,
      entity_id: entityId,
      action,
      old_values: oldValues,
      new_values: newValues,
      user_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent
    }, { transaction });
  } catch (err) {
    // Audit failure must never break the business operation
    logger.error('Audit log failed:', err);
  }
}

module.exports = { log };
