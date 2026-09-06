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
    // Steady-state RSS is ~250 MB; this is headroom, not a normal operating
    // point. The box shares 8 GB with a second app + postgres + minio and has
    // NO swap until deploy/vps-cleanup.sh runs, so keep the ceiling comfortably
    // under the ~1.3 GB free — pm2's controlled restart should win any race
    // with the kernel OOM killer. Raise once swap is in place.
    max_memory_restart: '1400M',
    node_args: '--max-old-space-size=1280',
    // Graceful reload: let the old worker drain before it's killed.
    kill_timeout: 8000,
    listen_timeout: 12000,
  }]
};
