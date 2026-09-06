module.exports = {
  apps: [{
    name: 'shaktiyoga',
    script: 'node_modules/.bin/next',
    args: 'start -p 3001',
    cwd: '/root/shaktiyoga/app',
    env_file: '/root/shaktiyoga/app/.env.local',
    instances: 1,
    // Fork, not cluster: a single Next.js instance gains nothing from cluster
    // mode and cluster mode is where the "Expected clientReferenceManifest"
    // invariant tends to surface. Fork is also lighter on this small box.
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    // The box shares 8 GB with a second app + postgres + minio, leaving shakti
    // ~1.3 GB and NO swap until deploy/vps-cleanup.sh is run. Keep V8's heap
    // well under the pm2 ceiling so it GCs hard and pm2's controlled restart
    // fires before the kernel OOM killer picks a victim. Raise both once swap
    // is in place.
    max_memory_restart: '1200M',
    node_args: '--max-old-space-size=1024',
    // Graceful reload: let the old worker drain before it's killed.
    kill_timeout: 8000,
    listen_timeout: 12000,
  }]
};
