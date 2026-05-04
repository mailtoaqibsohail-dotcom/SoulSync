/**
 * Run migrations: node migrations/run.js
 * Uses Sequelize sync with alter:false — safe for production.
 * First run: set FORCE_SYNC=true to create all tables from scratch.
 */
require('dotenv').config();
const { sequelize } = require('../src/models');
const logger = require('../src/utils/logger');

async function run() {
  try {
    await sequelize.authenticate();
    logger.info('DB connected');

    const force = process.env.FORCE_SYNC === 'true';
    const alter = process.env.ALTER_SYNC === 'true';

    if (force) {
      logger.warn('FORCE SYNC — all tables will be dropped and recreated');
    }

    await sequelize.sync({ force, alter });
    logger.info('Database synchronized');
    process.exit(0);
  } catch (err) {
    logger.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
