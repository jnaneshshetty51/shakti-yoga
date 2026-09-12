# Production deploy — backend hardening + 9 pending migrations

**Status:** verified locally — `next build` and `tsc --noEmit` both green, `prisma
migrate status` clean, and the rewritten referral migration (see §3) stress-tested
against populated data in a scratch DB. Not yet committed/pushed. Deploy must run
**on the VPS** (`31.97.235.53`, `/root/shaktiyoga/app`) — no CI, no remote trigger.

## 0. How far behind is prod?

Checked via the live `/api/version` endpoint:

```bash
curl -s https://shaktiyoga.in/api/version
# {"commit":"edb88d1...","branch":"main","deployedAt":"2026-09-07T15:31:33Z"}
```

Prod is on `edb88d1` (2026-09-07) — **29 commits and 9 migrations behind HEAD**.
(Note: the previous version of this doc referenced commit `5b63f75` as "deployed" —
it wasn't; `5b63f75` is 7 commits *ahead* of what's actually live. Always check
`/api/version` before assuming what shipped.)

## 1. What ships

- Everything in `feat(web): close website + member dashboard gaps` and the 28
  commits before it back to `edb88d1` — referral credit system, session credit
  ledger, therapy intake, admin phase-1 infra, invoice currency fixes, reel
  deep-linking, and more.
- This session's backend-hardening fixes (uncommitted):
  - `deploy/nginx.conf` — fixed `proxy_pass` port (was `3000`, app runs on `3001`
    per `ecosystem.config.js`/`deploy.sh` — this was silent config drift), added
    HSTS header, bumped `client_max_body_size` to `105M` (was `50M`, below the
    100MB video upload cap in `src/lib/video-upload.ts`).
  - `src/app/api/webhooks/razorpay/route.ts` — handler errors now return 500
    (was a swallowed 200, which meant a failed activation after a real charge
    had no retry path) and non-`charged` events (cancelled/halted/pending/
    payment.failed) are now idempotency-guarded via `ProcessedWebhookEvent`,
    matching the RevenueCat webhook's existing pattern.
  - `src/app/api/admin/members/[id]/measurements/route.ts` — `GET` no longer
    grants the CONTENT department read access to therapy patients' health data
    (pain/mobility/sleep/stress scores, clinical notes); scoped to THERAPIST
    only, consistent with every other therapy route.
  - Added try/catch to 4 routes that previously let a DB error 500 with a raw
    Next.js error page instead of the app's usual `{error: "..."}` JSON:
    `retreats`, `retreats/[id]/enquire`, `family/join`, `corporate/enquiry`.
  - `env.template` — documented 10 env vars the app already reads but that
    were undocumented (all degrade gracefully, so no deploy broke — but
    nobody provisioning the VPS from scratch would know to set them):
    `ANTHROPIC_API_KEY`, `EXPO_ACCESS_TOKEN`, `POSTHOG_KEY`/`POSTHOG_HOST`,
    `GEOIP_DB_PATH`, `ANDROID_PACKAGE`, `ANDROID_SHA256_CERT_FINGERPRINTS`,
    `APPLE_APP_ID`, `APPLE_TEAM_ID`, `IOS_BUNDLE_ID`.
  - **`prisma/migrations/20260910050000_referral_credit_system/migration.sql`
    rewritten** — see §3, this is the one that needed care.

## 2. Env vars — add to `/root/shaktiyoga/app/.env.local` before deploying

Nothing is newly *required* (the app doesn't throw without these — see
`env.template` for the full optional list added this session). Worth setting
now if you have the values: `ANTHROPIC_API_KEY`, `EXPO_ACCESS_TOKEN`,
`POSTHOG_KEY`.

## 3. ⚠️ Referral migration — read before running `deploy.sh`

`20260908600000_referrals` (which creates the `Referral` table) is **already
live in production** — unlike the migrations after it, this one shipped before
`edb88d1`. That means the referral feature has been collecting real data since
before this doc's last update, and the original
`20260910050000_referral_credit_system` migration — written and tested only
against an empty local dev table — would have:

1. **Hard-failed the whole `prisma migrate deploy` run** if a single real
   `Referral` row exists (`ADD COLUMN "expiresAt" ... NOT NULL` with no
   default on a populated table is a Postgres error), aborting mid-sequence.
2. **Silently discarded real data** even if it happened to succeed: the old
   `DROP COLUMN "status"` would erase whether a referral had already converted
   (reverting it to a fresh `PENDING`), and `User.referralCreditDays` (a real,
   spendable bonus-day balance from the old day-extension mechanism) would be
   dropped with no backfill.

**Fixed:** the migration now adds new columns nullable first, backfills
`status` (old `'converted'` → `SUCCESSFUL`, else → `PENDING`) and `expiresAt`
(`createdAt + 90 days`, the new validity window) from the real data, *then*
applies the `NOT NULL` constraints and drops the old columns. Verified against
a populated table in a disposable scratch Postgres container (not local dev) —
both a converted and a pending referral survived with correct values.

**Still open — needs your call, not a code fix:** `User.referralCreditDays`
(day-extension balance) → `referralCreditBalance` (₹ wallet) has no fixed
exchange rate, so the migration does **not** invent one — any pre-existing
non-zero `referralCreditDays` balance is still dropped as-is, same as the
original migration. Before deploying, check whether this matters at all:

```bash
ssh root@31.97.235.53
cd /root/shaktiyoga/app
# read-only — safe to run against the live DB before touching anything
docker exec shakti-postgres psql -U shaktiyoga -d shaktiyoga \
  -c 'SELECT count(*) FROM "Referral";' \
  -c 'SELECT count(*) FROM "User" WHERE "referralCreditDays" > 0;'
```

If both are 0, there's nothing to lose and you can deploy as-is. If either is
non-zero, decide first: drop it (accept the loss — it's a promo bonus, not
money already charged), or have someone hand-write a one-off backfill for
`referralCreditBalance` at whatever ₹/day rate you're comfortable with, applied
*before* `deploy.sh` runs.

## 4. Deploy

```bash
ssh root@31.97.235.53
cd /root/shaktiyoga/app
./deploy/deploy.sh
```

Same idempotent/self-recovering script as before: `git fetch` + fast-forward →
`npm ci` → `prisma generate` → **`pg_dump` snapshot** → `prisma migrate deploy`
→ clean `next build` → `pm2 reload` → health check. Rolls code back on failure;
**migrations are not auto-reverted** (that's why the pg_dump runs first — if
you skipped the check in §3 and it turns out to matter, this is your recovery
path).

## 5. Nginx — verify the live config matches the repo

Since `deploy/nginx.conf` had a stale port number that this session fixed, the
*live* `/etc/nginx/sites-available/shakti-yoga` on the VPS may already have
been hand-patched to `3001` (the site currently works, so something is
correct) — but it's now unknown whether the live file matches this repo's
copy. Diff them and take the repo version if unsure:

```bash
diff /etc/nginx/sites-available/shakti-yoga /root/shaktiyoga/app/deploy/nginx.conf
# if it differs:
cp /root/shaktiyoga/app/deploy/nginx.conf /etc/nginx/sites-available/shakti-yoga
nginx -t && systemctl reload nginx
```

## 6. Smoke test (from your machine)

```bash
curl -s https://shaktiyoga.in/api/version                      # commit == your new HEAD
curl -s https://shaktiyoga.in/api/health                       # {"status":"ok",...}
curl -s https://shaktiyoga.in/api/content/home                 # content feed JSON
curl -so /dev/null -w '%{http_code}\n' https://shaktiyoga.in/api/webhooks/razorpay   # expect 400 (bad json), not 500/502
```

Then in a browser: homepage, `/checkout` (Razorpay), `/dashboard/refer`
(referral page — confirm existing referrers' data still looks right), a page
with images (MinIO/CSP).

## Rollback

```bash
cd /root/shaktiyoga/app
git reset --hard <previous-commit>   # deploy.sh prints this on failure
./deploy/deploy.sh
# if a migration needs undoing: restore the db-backup-*.sql.gz that deploy.sh wrote
```
