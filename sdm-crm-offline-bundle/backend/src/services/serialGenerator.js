/**
 * SERIAL NUMBER ENGINE
 * ====================
 * Generates unique serials like: PFE-ENG-2026-0001
 *
 * Concurrency strategy:
 *   - SELECT ... FOR UPDATE locks the specific row for the (type, dept, year) slot
 *   - No other transaction can read or write that row until we COMMIT
 *   - MySQL InnoDB row-level locking — only blocks the exact slot being used,
 *     not other doc types or departments
 *   - If the row does not exist yet, INSERT ... ON DUPLICATE KEY UPDATE
 *     is used atomically to create it
 *
 * Format: {DOC_TYPE}-{DEPT}-{YEAR}-{SEQ padded to 4 digits}
 * Example: PFE-ENG-2026-0001
 *          MOM-HSE-2026-0023
 */

const { sequelize, SerialSequence } = require('../models');
const { QueryTypes } = require('sequelize');

/**
 * Generate the next serial number for a given doc type + department.
 * Safe under concurrent requests — uses a DB-level row lock.
 *
 * @param {string} docTypeCode   e.g. 'PFE'
 * @param {string} departmentCode e.g. 'ENG'
 * @param {object} [transaction]  If provided, joins the existing transaction
 * @returns {Promise<string>}     e.g. 'PFE-ENG-2026-0001'
 */
async function generateSerial(docTypeCode, departmentCode, transaction = null) {
  const year = new Date().getFullYear();
  const ownTransaction = !transaction;

  const t = transaction || await sequelize.transaction();

  try {
    // Step 1 — ensure the row exists for this slot
    // INSERT IGNORE so concurrent inserts don't race-fail
    await sequelize.query(
      `INSERT IGNORE INTO serial_sequences
         (doc_type_code, department_code, year, last_seq, created_at, updated_at)
       VALUES (?, ?, ?, 0, NOW(), NOW())`,
      {
        replacements: [docTypeCode, departmentCode, year],
        type: QueryTypes.INSERT,
        transaction: t
      }
    );

    // Step 2 — lock the row with FOR UPDATE, increment, return new value
    // This is a single atomic operation: read + write in one SQL statement.
    // The SELECT ... FOR UPDATE prevents any other transaction from
    // touching this row until we commit.
    // QueryTypes.SELECT returns the array directly (not [rows, meta])
    const rows = await sequelize.query(
      `SELECT id, last_seq FROM serial_sequences
       WHERE doc_type_code = ?
         AND department_code = ?
         AND year = ?
       FOR UPDATE`,
      {
        replacements: [docTypeCode, departmentCode, year],
        type: QueryTypes.SELECT,
        transaction: t
      }
    );

    if (!rows || rows.length === 0) {
      throw new Error('Failed to lock serial sequence row');
    }

    const nextSeq = rows[0].last_seq + 1;

    // Step 3 — write the incremented value back
    await sequelize.query(
      `UPDATE serial_sequences
       SET last_seq = ?, updated_at = NOW()
       WHERE id = ?`,
      {
        replacements: [nextSeq, rows[0].id],
        type: QueryTypes.UPDATE,
        transaction: t
      }
    );

    if (ownTransaction) await t.commit();

    // Format: PFE-ENG-2026-0001
    return formatSerial(docTypeCode, departmentCode, year, nextSeq);

  } catch (err) {
    if (ownTransaction) await t.rollback();
    throw err;
  }
}

/**
 * Format a serial number from its parts.
 * Sequence is zero-padded to 4 digits (supports up to 9999/year per slot).
 * For busier orgs increase padding to 5.
 */
function formatSerial(docTypeCode, departmentCode, year, seq) {
  const padded = String(seq).padStart(4, '0');
  return `${docTypeCode}-${departmentCode}-${year}-${padded}`;
}

/**
 * Peek at the last issued serial for a slot without incrementing.
 * Useful for dashboard display.
 */
async function getLastSerial(docTypeCode, departmentCode, year = null) {
  const targetYear = year || new Date().getFullYear();
  const row = await SerialSequence.findOne({
    where: { doc_type_code: docTypeCode, department_code: departmentCode, year: targetYear }
  });
  if (!row) return null;
  return formatSerial(docTypeCode, departmentCode, targetYear, row.last_seq);
}

module.exports = { generateSerial, getLastSerial, formatSerial };
