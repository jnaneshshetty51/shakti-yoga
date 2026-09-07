# Production deploy — content platform + mobile hardening

**Status:** code committed and pushed to `origin/main` (`5b63f75`), `next build`
verified green locally. Deploy must run **on the VPS** (`31.97.235.53`,
`/root/shaktiyoga/app`) — no CI, no remote trigger.

## What ships

- Content platform: Reels / Posts / Blogs / Practices / Challenges / Community / AI guide
  (all `/api/content/*`, `/api/practices/*`, `/api/challenges/*`, `/api/community/*`, `/api/assistant`)
- Mobile-hardening backend: `POST /api/push/register` + `/unregister`, `DELETE /api/profile`
  (account deletion), `auth/me` token re-mint when <7 days left, push triggers in
  `teacher/meeting-link` · `teacher/sessions` · `webhooks/razorpay`
- **6 new Prisma migrations** (`20260908000000_add_content_platform` …
  `20260908500000_practice_challenges_community`, incl. `20260908100000_add_push_tokens`)

## 1. (Optional) env vars — add to `/root/shaktiyoga/app/.env.local` before deploying

```
EXPO_ACCESS_TOKEN=...     # optional — Expo push receipt auth; push works without it
ANTHROPIC_API_KEY=...     # optional — AI "yoga guide"; feature self-disables if unset
```

Nothing else new is required. No new **required** env var — a missing key above
only disables that one feature, it won't fail the build or the deploy.

## 2. Deploy

```bash
ssh root@31.97.235.53
cd /root/shaktiyoga/app
./deploy/deploy.sh
```

`deploy.sh` is idempotent and self-recovering: `git fetch` + fast-forward →
`npm ci` → `prisma generate` → **`pg_dump` snapshot** → `prisma migrate deploy`
(applies the 6 migrations) → clean `next build` (adds temp swap if RAM is low) →
`pm2 reload` → health check on `/`, `/login`, `/api/health`. If the build or
health check fails it rolls the code back and rebuilds the previous version;
**migrations are not auto-reverted** (that's why the pg_dump runs first).

## 3. Refresh cron (new "class starting soon" push job)

`deploy.sh` does **not** touch cron. The new `scripts/send-class-push.ts` needs a
new line in `/etc/cron.d/shakti`:

```bash
cp /root/shaktiyoga/app/deploy/cron.d-shakti /etc/cron.d/shakti
chmod 644 /etc/cron.d/shakti
systemctl restart cron    # or: service cron restart
grep -v '^\s*#' /etc/cron.d/shakti      # confirm the */5 send-class-push line is there
```

## 4. Smoke test (from your machine)

```bash
curl -s https://shaktiyoga.in/api/health                       # {"status":"ok",...}
curl -s https://shaktiyoga.in/api/version                      # commit == 5b63f75
curl -so /dev/null -w '%{http_code}\n' -X POST https://shaktiyoga.in/api/push/register
        # expect 401 (route live, auth required) — NOT 404
curl -s https://shaktiyoga.in/api/content/home                 # content feed JSON
```

Then in a browser: homepage, `/checkout` (Razorpay), a page with images
(MinIO/CSP), and the new content sections.

## 5. Mobile app

No action. The app targets `https://shaktiyoga.in` by default, so the new
endpoints (progress, activity, push register, trial activation, account deletion)
light up for the running Expo-Go/dev build immediately. A store build is the
separate Phase 5 in `~/.claude/plans/plan-this-mobile-app-jazzy-patterson.md`
(needs `eas init` + APNs/FCM credentials — your accounts).

## Rollback

```bash
cd /root/shaktiyoga/app
git reset --hard <previous-commit>   # deploy.sh prints this on failure
./deploy/deploy.sh
# if a migration needs undoing: restore the db-backup-*.sql.gz that deploy.sh wrote
```
