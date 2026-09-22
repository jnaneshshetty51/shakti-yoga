module.exports = {
  apps: [{
    name: 'shaktiyoga',
    script: 'node_modules/.bin/next',
    args: 'start -p 3015 -H 127.0.0.1',
    cwd: '/var/www/shaktiyoga',
    env: {
      NODE_ENV: 'production',
      PORT: 3015,
      HOSTNAME: '127.0.0.1',
    },
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    kill_timeout: 8000,
    listen_timeout: 12000,
  }]
};
