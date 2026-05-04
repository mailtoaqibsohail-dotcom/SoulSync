require('dotenv').config();
const app = require('./src/config/app');
const { sequelize } = require('./src/models');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await sequelize.authenticate();
    logger.info('MySQL connection established');

    app.listen(PORT, () => {
      logger.info(`SDM-CRM running on port ${PORT} [${process.env.NODE_ENV}]`);
    });

    require('./src/services/mocScheduler').start();
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection:', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', err);
  process.exit(1);
});

start();
