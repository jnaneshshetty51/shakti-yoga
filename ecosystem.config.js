module.exports = {
  apps: [{
    name: 'shaktiyoga',
    script: 'node_modules/.bin/next',
    args: 'start -p 3001',
    cwd: '/root/shaktiyoga/app',
    env_file: '/root/shaktiyoga/app/.env.local',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
  }]
};
