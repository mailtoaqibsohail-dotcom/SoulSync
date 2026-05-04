/**
 * MOC NUMBER ENGINE
 * =================
 * Generates Annexure-E compliant MOC numbers:
 *   MOC-{DEPT}-{FIELD}-{YEAR}-{SEQ}    e.g. MOC-OPS-Mari-2026-0001
 *   DISP-{DEPT}-{FIELD}-{YEAR}-{SEQ}   e.g. DISP-CIVIL-Daharki-2026-0007
 *
 * Slot key: (kind, dept, field, year). Sequence is per-slot, zero-padded to 4.
 * Concurrency safety mirrors serialGenerator: INSERT IGNORE + SELECT ... FOR UPDATE.
 *
 * Stored in a dedicated `moc_sequences` table so it does not interfere with
 * the document SerialSequence engine.
 */

const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

const KIND_PREFIX = { moc: 'MOC', dispensation: 'DISP' };

async function generateMocNumber(kind, departmentCode, fieldName, transaction = null) {
  const prefix = KIND_PREFIX[kind];
  if (!prefix) throw new Error(`Unknown MOC kind: ${kind}`);

  const year = new Date().getFullYear();
  const ownTx = !transaction;
  const t = transaction || (await sequelize.transaction());

  try {
    await sequelize.query(
      `INSERT IGNORE INTO moc_sequences
         (kind, department_code, field_name, year, last_seq, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, NOW(), NOW())`,
      { replacements: [kind, departmentCode, fieldName, year], type: QueryTypes.INSERT, transaction: t }
    );

    const rows = await sequelize.query(
      `SELECT id, last_seq FROM moc_sequences
        WHERE kind = ? AND department_code = ? AND field_name = ? AND year = ?
        FOR UPDATE`,
      { replacements: [kind, departmentCode, fieldName, year], type: QueryTypes.SELECT, transaction: t }
    );
    if (!rows.length) throw new Error('Failed to lock moc_sequences row');

    const nextSeq = rows[0].last_seq + 1;
    await sequelize.query(
      `UPDATE moc_sequences SET last_seq = ?, updated_at = NOW() WHERE id = ?`,
      { replacements: [nextSeq, rows[0].id], type: QueryTypes.UPDATE, transaction: t }
    );

    if (ownTx) await t.commit();

    const padded = String(nextSeq).padStart(4, '0');
    return `${prefix}-${departmentCode}-${fieldName}-${year}-${padded}`;
  } catch (err) {
    if (ownTx) await t.rollback();
    throw err;
  }
}

module.exports = { generateMocNumber };
