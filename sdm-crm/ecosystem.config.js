module.exports = {
  apps: [
    {
      name: 'sdm-crm',
      script: 'server.js',
      instances: 1,           // single instance — serial engine uses row locking, not cluster-safe without Redis
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '512M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      restart_delay: 3000,
      max_restarts: 10,
      autorestart: true
    }
  ]
};
