/* PM2 process definition. Runs the Node server in production.
 *
 *   pm2 start ecosystem.config.js
 *   pm2 save
 *   pm2 startup            # generate the systemd hook so it boots on reboot
 *
 * Logs live under ~/.pm2/logs/spark-api-*.log by default.
 */
module.exports = {
  apps: [
    {
      name: 'spark-api',
      cwd: './server',
      script: 'server.js',
      instances: 1,                   // single instance — socket.io state is in-memory
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '512M',
      error_file: './logs/err.log',
      out_file:   './logs/out.log',
      time: true,
      autorestart: true,
      watch: false,
    },
  ],
};
