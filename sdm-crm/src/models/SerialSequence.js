const { DataTypes } = require('sequelize');

/**
 * One row per (doc_type_code, department_code, year) combination.
 * last_seq is the last issued sequence number for that slot.
 *
 * Concurrent serial generation works as:
 *   BEGIN TRANSACTION
 *   SELECT * FROM serial_sequences WHERE ... FOR UPDATE   ← row lock
 *   UPDATE serial_sequences SET last_seq = last_seq + 1 WHERE ...
 *   COMMIT
 *
 * The FOR UPDATE lock ensures only one transaction at a time can
 * increment a given sequence slot — even under heavy concurrency.
 */
module.exports = (sequelize) => {
  const SerialSequence = sequelize.define('SerialSequence', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    // e.g. PFE (Proposal For Engineering), MOM (Minutes of Meeting)
    doc_type_code: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    // e.g. ENG, HSE, PROC, MGMT
    department_code: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    year: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false
    },
    last_seq: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    tableName: 'serial_sequences',
    indexes: [
      {
        unique: true,
        fields: ['doc_type_code', 'department_code', 'year'],
        name: 'uq_sequence_slot'
      }
    ]
  });

  return SerialSequence;
};
