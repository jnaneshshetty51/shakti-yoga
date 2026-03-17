module.exports = {
  apps: [
    {
      name: 'shakti-yoga',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: '/var/www/shakti-yoga',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/shakti-yoga/error.log',
      out_file: '/var/log/shakti-yoga/out.log',
      log_file: '/var/log/shakti-yoga/combined.log',
      time: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
  ],
};

