#!/bin/bash
#
# One-shot VPS remediation for shaktiyoga.in. Run as root ON the VPS:
#   bash /root/shaktiyoga/app/deploy/vps-cleanup.sh
#
# Idempotent. Does the things the deploy sandbox can't:
#   1. restore chattr, scrub the leftover rondo backdoor crontab line
#   2. add a permanent 3G swapfile (box has none; builds OOM-flake)
#   3. install nginx brotli
#   4. delete the @example.com test accounts from the app DB
#   5. install/refresh the cron + logrotate drop-ins
#
# SSH key-only hardening is deliberately NOT automated here (lockout risk) —
# see the note printed at the end.
set -uo pipefail
G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; N='\033[0m'
say() { echo -e "${G}▶ $*${N}"; }
warn() { echo -e "${Y}  $*${N}"; }

APP_DIR=/root/shaktiyoga/app
cd "$APP_DIR" || { echo "app dir missing"; exit 1; }

# --- 1. backdoor persistence -------------------------------------------------
say "checking for leftover rondo persistence"
if command -v chattr >/dev/null || [ -x /usr/bin/chattr ]; then :; else
    warn "chattr missing (deleted in the 2026-08 compromise) — reinstalling e2fsprogs"
    apt-get install -y --reinstall e2fsprogs >/dev/null 2>&1 || warn "apt reinstall failed; will try python fallback"
fi

SPOOL=/var/spool/cron/crontabs/root
if [ -f "$SPOOL" ] && grep -q rondo "$SPOOL" 2>/dev/null; then
    warn "found malicious line in $SPOOL:"; grep rondo "$SPOOL" | sed 's/^/    /'
    cp -a "$SPOOL" "/root/rondo-crontab.$(date +%s).bak" 2>/dev/null || true
    if command -v chattr >/dev/null; then
        chattr -ia "$SPOOL" && : > "$SPOOL" && echo "  cleared via chattr"
    else
        python3 - "$SPOOL" <<'PY'
import fcntl, os, struct, sys
p = sys.argv[1]
GET, SET = 0x80086601, 0x40086602
IMM, APP = 0x10, 0x20
fd = os.open(p, os.O_RDONLY)
f = struct.unpack("l", fcntl.ioctl(fd, GET, struct.pack("l", 0)))[0]
fcntl.ioctl(fd, SET, struct.pack("l", f & ~IMM & ~APP))
os.close(fd)
open(p, "w").close()
print("  cleared via ioctl")
PY
    fi
    chown root:crontab "$SPOOL" 2>/dev/null; chmod 600 "$SPOOL" 2>/dev/null
    grep -q rondo "$SPOOL" 2>/dev/null && echo -e "${R}  STILL PRESENT — manual intervention needed${N}" || echo "  scrubbed ✓"
else
    echo "  clean — no rondo line"
fi
[ -e /etc/rondo ] && { warn "/etc/rondo still exists!"; ls -la /etc/rondo; } || echo "  /etc/rondo absent ✓"

# --- 2. permanent swap -----------------------------------------------------
say "swap"
if [ "$(swapon --show --noheadings | wc -l)" -gt 0 ]; then
    echo "  already have swap"
else
    fallocate -l 3G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=3072
    chmod 600 /swapfile; mkswap /swapfile >/dev/null; swapon /swapfile
    grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    sysctl -w vm.swappiness=10 >/dev/null
    grep -q 'vm.swappiness' /etc/sysctl.conf || echo 'vm.swappiness=10' >> /etc/sysctl.conf
    echo "  added 3G /swapfile (persisted in fstab)"
fi

# --- 3. brotli -----------------------------------------------------------
say "nginx brotli"
if nginx -V 2>&1 | grep -q brotli; then
    echo "  already enabled"
else
    apt-get install -y libnginx-mod-brotli >/dev/null 2>&1 && {
        cat > /etc/nginx/conf.d/brotli.conf <<'EOF'
brotli on;
brotli_comp_level 5;
brotli_types text/plain text/css application/javascript application/json
             image/svg+xml application/xml+rss text/xml application/wasm font/woff2;
EOF
        nginx -t && systemctl reload nginx && echo "  brotli enabled ✓"
    } || warn "brotli package not available — skipped"
fi

# --- 4. test accounts ---------------------------------------------------
say "removing @example.com test accounts"
set -a; . ./.env.local; set +a
PG_RE='^postgres(ql)?://([^:]+):([^@]+)@([^:/]+):?([0-9]*)/([^?]+)'
if [[ "${DATABASE_URL:-}" =~ $PG_RE ]]; then
    PGU="${BASH_REMATCH[2]}"; PGP="${BASH_REMATCH[3]}"; PGDB="${BASH_REMATCH[6]}"
    docker exec -e PGPASSWORD="$PGP" shakti_postgres psql -U "$PGU" -d "$PGDB" -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
CREATE TEMP TABLE _junk AS
  SELECT id FROM "User"
  WHERE email LIKE '%@example.com' OR email = 'asha.rao+1788672762@gmail.com';
-- child rows without a cascade
DELETE FROM "ClassAttendance"     WHERE "userId" IN (SELECT id FROM _junk);
DELETE FROM "ClassInstance"       WHERE "batchId" IN (SELECT id FROM "ClassBatch" WHERE "teacherId" IN (SELECT id FROM _junk));
DELETE FROM "ClassBatch"          WHERE "teacherId" IN (SELECT id FROM _junk);
DELETE FROM "Booking"             WHERE "userId" IN (SELECT id FROM _junk) OR "teacherId" IN (SELECT id FROM _junk);
DELETE FROM "TeacherAvailability" WHERE "teacherId" IN (SELECT id FROM _junk);
DELETE FROM "StaffProfile"        WHERE "userId" IN (SELECT id FROM _junk);
DELETE FROM "PasswordResetToken"  WHERE "userId" IN (SELECT id FROM _junk);
DELETE FROM "AnalyticsEvent"      WHERE "userId" IN (SELECT id FROM _junk);
DELETE FROM "RevenueRecord"       WHERE "userId" IN (SELECT id FROM _junk);
DELETE FROM "Payment"             WHERE "userId" IN (SELECT id FROM _junk);
DELETE FROM "Subscription"        WHERE "userId" IN (SELECT id FROM _junk);
DELETE FROM "Story"               WHERE "userId" IN (SELECT id FROM _junk);
DELETE FROM "UserProfile"         WHERE "userId" IN (SELECT id FROM _junk);
UPDATE "Lead" SET "assignedToId" = NULL WHERE "assignedToId" IN (SELECT id FROM _junk);
DELETE FROM "User"                WHERE id IN (SELECT id FROM _junk);
COMMIT;
SELECT count(*) AS remaining_example_accounts FROM "User" WHERE email LIKE '%@example.com';
SQL
    echo "  done"
else
    warn "couldn't parse DATABASE_URL — skipped"
fi

# --- 5. cron + logrotate ------------------------------------------------
say "cron + logrotate drop-ins"
install -m 644 -o root -g root deploy/cron.d-shakti     /etc/cron.d/shakti
install -m 644 -o root -g root deploy/logrotate-shakti  /etc/logrotate.d/shakti
systemctl restart cron 2>/dev/null || service cron restart 2>/dev/null || true
echo "  installed; jobs:"; grep -vE '^\s*#|^\s*$|^SHELL|^PATH' /etc/cron.d/shakti | sed 's/^/    /'

echo
echo -e "${G}=== remaining manual steps ===${N}"
cat <<'EOF'
  SSH key-only auth (do NOT skip the test step — lockout risk):
    1. from your laptop:  ssh-copy-id root@31.97.235.53
    2. open a SECOND terminal and confirm  ssh root@31.97.235.53  works with the key
    3. only then:  sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/;s/^#*PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config && systemctl reload ssh

  Env keys — edit /root/shaktiyoga/app/.env.local, then  pm2 reload shaktiyoga --update-env :
    RESEND_API_KEY=...   EMAIL_FROM="Shakti Yoga <hello@shaktiyoga.in>"   ADMIN_EMAIL=...
    RAZORPAY_KEY_ID=...  RAZORPAY_KEY_SECRET=...  NEXT_PUBLIC_RAZORPAY_KEY_ID=...  RAZORPAY_WEBHOOK_SECRET=...
    CRON_SECRET=...

  Off-server backups:  configure rclone, then add to the backup cron line:
    BACKUP_REMOTE=<remote:path>  (e.g. b2:shakti-backups)

  External uptime monitor: point UptimeRobot / BetterStack at https://shaktiyoga.in/api/health
EOF
