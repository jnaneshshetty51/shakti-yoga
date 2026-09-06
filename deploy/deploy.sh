#!/bin/bash
#
# Shakti Yoga deployment — run on the VPS, from the app directory
# (default /root/shaktiyoga/app). Pulls origin/main, migrates, builds, restarts.
#
#   cd /root/shaktiyoga/app && ./deploy/deploy.sh
#
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
BRANCH="${DEPLOY_BRANCH:-main}"
APP_NAME="shaktiyoga"   # must match ecosystem.config.js

command -v pm2 >/dev/null || { echo -e "${RED}pm2 not found${NC}"; exit 1; }
[ -f ".env.local" ] || { echo -e "${RED}.env.local not found in $(pwd)${NC}"; exit 1; }

echo -e "${GREEN}▶ Fetching origin...${NC}"
git fetch origin --prune

LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse "origin/${BRANCH}")"
BASE="$(git merge-base HEAD "origin/${BRANCH}" || true)"

STAMP="$(date +%Y%m%d-%H%M%S)"

if [ "$LOCAL" = "$REMOTE" ]; then
    echo -e "${YELLOW}Already at origin/${BRANCH} (${REMOTE:0:9}). Rebuilding anyway.${NC}"
    git checkout -B "$BRANCH" "origin/${BRANCH}" >/dev/null 2>&1 || true
elif [ "$BASE" = "$LOCAL" ]; then
    echo -e "${GREEN}▶ Fast-forwarding ${LOCAL:0:9} → ${REMOTE:0:9}${NC}"
    git checkout -B "$BRANCH" "origin/${BRANCH}"
else
    # The VPS historically carried local-only commits (a87c232…) whose content
    # is already in origin/main. Divergent history → back up, then reset to remote.
    echo -e "${YELLOW}⚠ Local history diverges from origin/${BRANCH}.${NC}"
    echo -e "${YELLOW}  Local  ${LOCAL:0:9}   Remote ${REMOTE:0:9}${NC}"
    git branch "pre-deploy-backup-${STAMP}" HEAD
    git stash push -u -m "pre-deploy-${STAMP}" >/dev/null 2>&1 || true
    echo -e "${GREEN}▶ Backed up to branch pre-deploy-backup-${STAMP}; resetting to origin/${BRANCH}${NC}"
    git checkout -B "$BRANCH" "origin/${BRANCH}"
    git reset --hard "origin/${BRANCH}"
fi

echo -e "${GREEN}▶ npm ci${NC}";              npm ci --no-audit --no-fund
echo -e "${GREEN}▶ prisma generate${NC}";     npx prisma generate

# Best-effort DB snapshot before migrating — the replace_daily migration DROPs
# the LiveClass tables. Needs pg_dump + a postgresql:// DATABASE_URL.
DB_URL="$(grep -E '^DATABASE_URL=' .env.local | head -1 | cut -d= -f2- | tr -d '"'"'"'')"
if command -v pg_dump >/dev/null && [[ "$DB_URL" == postgresql://* || "$DB_URL" == postgres://* ]]; then
    echo -e "${GREEN}▶ pg_dump → db-backup-${STAMP}.sql.gz${NC}"
    pg_dump "$DB_URL" | gzip > "db-backup-${STAMP}.sql.gz" || echo -e "${YELLOW}  (dump failed, continuing)${NC}"
else
    echo -e "${YELLOW}▶ skipping DB backup (no pg_dump / non-postgres URL) — back up manually if you need one${NC}"
fi

echo -e "${GREEN}▶ prisma migrate deploy${NC}"; npx prisma migrate deploy
echo -e "${GREEN}▶ next build${NC}";          npm run build

echo -e "${GREEN}▶ Restarting ${APP_NAME}${NC}"
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
    pm2 reload "$APP_NAME" --update-env
else
    pm2 start ecosystem.config.js
fi
pm2 save

echo -e "${GREEN}✅ Deployed $(git rev-parse --short HEAD) on port 3001${NC}"
echo -e "${YELLOW}   pm2 status | pm2 logs ${APP_NAME}${NC}"
