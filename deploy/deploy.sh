#!/bin/bash
#
# Shakti Yoga deployment — run on the VPS, from the app directory
# (default /root/shaktiyoga/app):
#
#   cd /root/shaktiyoga/app && ./deploy/deploy.sh
#
# Idempotent and self-recovering: on a divergent VPS history it backs up to a
# branch + stash; on a failed build it rolls the code back and rebuilds the
# previous version so the site keeps serving.
#
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
BRANCH="${DEPLOY_BRANCH:-main}"
APP_NAME="shaktiyoga"   # must match ecosystem.config.js
PORT=3001

command -v pm2 >/dev/null || { echo -e "${RED}pm2 not found${NC}"; exit 1; }
command -v git >/dev/null || { echo -e "${RED}git not found${NC}"; exit 1; }
[ -f ".env.local" ] || { echo -e "${RED}.env.local not found in $(pwd)${NC}"; exit 1; }
[ -f "ecosystem.config.js" ] || { echo -e "${RED}run this from the app root${NC}"; exit 1; }

STAMP="$(date +%Y%m%d-%H%M%S)"
PREV_REF="$(git rev-parse HEAD)"
ROLLBACK_REF="$PREV_REF"

rollback() {
    trap - ERR
    echo -e "${RED}✖ Deploy failed. Rolling code back to ${ROLLBACK_REF:0:9} and rebuilding.${NC}"
    git reset --hard "$ROLLBACK_REF" || true
    npm ci --no-audit --no-fund || true
    npx prisma generate || true
    if npm run build; then
        pm2 reload "$APP_NAME" --update-env 2>/dev/null || pm2 start ecosystem.config.js
        pm2 save || true
        echo -e "${YELLOW}↩ Rolled back to ${ROLLBACK_REF:0:9}. Site restored. Migrations were NOT reverted.${NC}"
    else
        echo -e "${RED}Rollback build also failed — investigate manually. pm2 logs ${APP_NAME}${NC}"
    fi
    exit 1
}
trap 'rollback' ERR

echo -e "${GREEN}▶ git fetch${NC}"
git fetch origin --prune

LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse "origin/${BRANCH}")"
BASE="$(git merge-base HEAD "origin/${BRANCH}" 2>/dev/null || echo none)"

if [ "$LOCAL" = "$REMOTE" ]; then
    echo -e "${YELLOW}Already at origin/${BRANCH} (${REMOTE:0:9}); rebuilding.${NC}"
    git checkout -B "$BRANCH" "origin/${BRANCH}" >/dev/null 2>&1 || true
elif [ "$BASE" = "$LOCAL" ]; then
    echo -e "${GREEN}▶ fast-forward ${LOCAL:0:9} → ${REMOTE:0:9}${NC}"
    git checkout -B "$BRANCH" "origin/${BRANCH}"
else
    echo -e "${YELLOW}⚠ VPS history diverges from origin/${BRANCH} (local ${LOCAL:0:9}, remote ${REMOTE:0:9})${NC}"
    git branch "pre-deploy-backup-${STAMP}" HEAD
    git stash push -u -m "pre-deploy-${STAMP}" >/dev/null 2>&1 || true
    echo -e "${GREEN}▶ backed up → branch pre-deploy-backup-${STAMP}; resetting to origin/${BRANCH}${NC}"
    git checkout -B "$BRANCH" "origin/${BRANCH}"
    git reset --hard "origin/${BRANCH}"
fi
# from here a failed step rolls back to the version we came in on
ROLLBACK_REF="$PREV_REF"

# --- build headroom: `next build` peaks ~1.5-2 GB and the box has no swap.
# `available` overstates usable memory here (reclaim contention during build has
# OOM-killed it), so also look at genuinely-free pages and be generous.
AVAIL_MB=$(free -m 2>/dev/null | awk '/^Mem:/{print $7}' || echo 9999)
FREE_MB=$(free -m 2>/dev/null | awk '/^Mem:/{print $4}' || echo 9999)
SWAP_MB=$(free -m 2>/dev/null | awk '/^Swap:/{print $2}' || echo 0)
SWAPFILE=""
if { [ "${AVAIL_MB:-9999}" -lt 2600 ] || [ "${FREE_MB:-9999}" -lt 1800 ]; } && [ "${SWAP_MB:-0}" -lt 512 ]; then
    SWAPFILE="/swapfile.deploy.${STAMP}"
    echo -e "${YELLOW}▶ low memory (${AVAIL_MB}MB avail, ${FREE_MB}MB free, ${SWAP_MB}MB swap) — adding 3G temp swap${NC}"
    fallocate -l 3G "$SWAPFILE" 2>/dev/null || dd if=/dev/zero of="$SWAPFILE" bs=1M count=3072
    chmod 600 "$SWAPFILE"; mkswap "$SWAPFILE" >/dev/null; swapon "$SWAPFILE"
fi
cleanup_swap() { [ -n "$SWAPFILE" ] && { swapoff "$SWAPFILE" 2>/dev/null || true; rm -f "$SWAPFILE"; }; return 0; }
trap 'cleanup_swap' EXIT

echo -e "${GREEN}▶ npm ci${NC}";          npm ci --no-audit --no-fund

# prisma CLI only auto-loads .env, not .env.local — export .env.local so
# `prisma generate` / `migrate deploy` (and any child process) see DATABASE_URL.
echo -e "${GREEN}▶ load .env.local${NC}"
set -a; . ./.env.local; set +a
[ -n "${DATABASE_URL:-}" ] || { echo -e "${RED}DATABASE_URL not set after sourcing .env.local${NC}"; exit 1; }

echo -e "${GREEN}▶ prisma generate${NC}"; npx prisma generate

DB_URL="$DATABASE_URL"
PG_RE='^postgres(ql)?://([^:]+):([^@]+)@([^:/]+):?([0-9]*)/([^?]+)'
if [[ "$DB_URL" =~ $PG_RE ]]; then
    PGU="${BASH_REMATCH[2]}"; PGP="${BASH_REMATCH[3]}"
    PGH="${BASH_REMATCH[4]}"; PGPORT="${BASH_REMATCH[5]:-5432}"; PGDB="${BASH_REMATCH[6]}"
    DUMP="db-backup-${STAMP}.sql.gz"
    if command -v pg_dump >/dev/null; then
        echo -e "${GREEN}▶ pg_dump ($PGH:$PGPORT/$PGDB) → ${DUMP}${NC}"
        PGPASSWORD="$PGP" pg_dump -h "$PGH" -p "$PGPORT" -U "$PGU" "$PGDB" | gzip > "$DUMP" \
            || echo -e "${YELLOW}  (dump failed, continuing)${NC}"
    elif docker ps --format '{{.Names}}' | grep -qx shakti_postgres; then
        echo -e "${GREEN}▶ pg_dump via docker exec shakti_postgres → ${DUMP}${NC}"
        docker exec -e PGPASSWORD="$PGP" shakti_postgres pg_dump -U "$PGU" "$PGDB" | gzip > "$DUMP" \
            || echo -e "${YELLOW}  (dump failed, continuing)${NC}"
    else
        echo -e "${YELLOW}▶ no pg_dump binary and no shakti_postgres container — skipping DB snapshot${NC}"
    fi
    [ -s "${DUMP:-/nonexistent}" ] && echo -e "${GREEN}  backup: $(du -h "$DUMP" | cut -f1)${NC}"
else
    echo -e "${YELLOW}▶ DATABASE_URL not a postgres URL — skipping DB snapshot${NC}"
fi

echo -e "${GREEN}▶ prisma migrate deploy${NC}"; npx prisma migrate deploy

# Stamp the deployed commit so /api/version and the admin footer can show it.
printf '{"commit":"%s","branch":"%s","deployedAt":"%s"}\n' \
    "$(git rev-parse HEAD)" "$BRANCH" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > version.json

# Always build from a clean .next — an interrupted/OOM-killed build on this
# low-RAM box can leave a half-written .next that `next build` will happily
# reuse, producing a server that 500s every dynamic route (missing
# clientReferenceManifest) while the cached "/" still answers 200.
echo -e "${GREEN}▶ clean .next${NC}";             rm -rf .next
echo -e "${GREEN}▶ next build${NC}";              NODE_OPTIONS="--max-old-space-size=2048" npm run build

echo -e "${GREEN}▶ pm2 reload ${APP_NAME}${NC}"
# Reload from the ecosystem file (not by name) so config changes — memory
# limits, node args, exec mode — are actually picked up.
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
    pm2 reload ecosystem.config.js --update-env
else
    pm2 start ecosystem.config.js
fi
pm2 save

# --- health check ---------------------------------------------------------------
trap - ERR
echo -e "${GREEN}▶ health check :${PORT}${NC}"
ok=0
for i in $(seq 1 15); do
    code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:${PORT}/" || echo 000)
    [ "$code" = "200" ] && { ok=1; break; }
    sleep 2
done

# "/" is static and can serve from cache even when the build is broken — probe a
# server-rendered route too so a corrupt build actually fails the deploy.
dyn=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:${PORT}/login" || echo 000)
api=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:${PORT}/api/health" || echo 000)
if [ "$ok" = 1 ] && { [ "$dyn" != "200" ] || [ "$api" != "200" ]; }; then
    echo -e "${RED}✖ '/' is up but /login=${dyn} /api/health=${api} — build looks corrupt.${NC}"
    ok=0
fi

if [ "$ok" = 1 ]; then
    # Warm the common routes so the first real visitor after a deploy doesn't
    # eat the cold-start latency (which can spike past nginx's proxy timeout).
    echo -e "${GREEN}▶ warmup${NC}"
    for r in / /about /programs /everyday-yoga /yoga-therapy /blog /stories /trial /login /signup /contact /disclaimer /privacy /terms /refund-policy; do
        curl -s -o /dev/null "http://localhost:${PORT}${r}" || true
    done

    echo -e "${GREEN}✅ Deployed $(git rev-parse --short HEAD) — / , /login , /api/health → 200${NC}"
    echo -e "${YELLOW}   Check the live site: homepage, /checkout (Razorpay), a page with images (MinIO/CSP).${NC}"
    echo -e "${YELLOW}   Rollback if needed: git reset --hard ${PREV_REF:0:9} && ./deploy/deploy.sh${NC}"
else
    echo -e "${RED}✖ App not answering 200 on :${PORT} after reload. Last code: ${code}${NC}"
    echo -e "${RED}   pm2 logs ${APP_NAME} --lines 60${NC}"
    echo -e "${RED}   Rollback: git reset --hard ${PREV_REF:0:9} && ./deploy/deploy.sh${NC}"
    exit 1
fi
