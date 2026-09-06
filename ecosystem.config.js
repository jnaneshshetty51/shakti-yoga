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
    // 1G was killing the process mid-request on SSR spikes (-> 502s). Give it
    // real headroom; the permanent swapfile (deploy/vps-cleanup.sh) backs this.
    max_memory_restart: '1536M',
    node_args: '--max-old-space-size=1536',
    // Graceful reload: let the old worker drain before it's killed.
    kill_timeout: 8000,
    listen_timeout: 12000,
  }]
};
