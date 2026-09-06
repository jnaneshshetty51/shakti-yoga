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

if [ "$LOCAL" = "$REMOTE" ]; then
    echo -e "${YELLOW}Already at origin/${BRANCH} (${REMOTE:0:9}). Rebuilding anyway.${NC}"
elif [ "$BASE" = "$LOCAL" ]; then
    echo -e "${GREEN}▶ Fast-forwarding ${LOCAL:0:9} → ${REMOTE:0:9}${NC}"
    git merge --ff-only "origin/${BRANCH}"
else
    # The VPS historically carried local-only commits (a87c232…) whose content
    # is already in origin/main. Divergent history → hard-reset to the remote.
    echo -e "${YELLOW}⚠ Local history diverges from origin/${BRANCH}.${NC}"
    echo -e "${YELLOW}  Local  ${LOCAL:0:9}${NC}"
    echo -e "${YELLOW}  Remote ${REMOTE:0:9}${NC}"
    STAMP="$(date +%Y%m%d-%H%M%S)"
    git branch "pre-deploy-backup-${STAMP}"
    git stash push -u -m "pre-deploy-${STAMP}" >/dev/null 2>&1 || true
    echo -e "${GREEN}▶ Backed up to branch pre-deploy-backup-${STAMP}; hard-resetting to origin/${BRANCH}${NC}"
    git reset --hard "origin/${BRANCH}"
fi

echo -e "${GREEN}▶ npm ci${NC}";              npm ci --no-audit --no-fund
echo -e "${GREEN}▶ prisma generate${NC}";     npx prisma generate
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
