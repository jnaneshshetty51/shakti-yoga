-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('CHECKED_IN', 'PRESENT', 'ABSENT');

-- CreateEnum
CREATE TYPE "SessionCreditReason" AS ENUM ('CYCLE_GRANT', 'CLASS_ATTENDED', 'CLASS_REVERSED', 'PURCHASE', 'ADMIN_ADJUST');

-- AlterTable
ALTER TABLE "ClassAttendance" ADD COLUMN     "addedByTeacher" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedById" TEXT,
ADD COLUMN     "status" "AttendanceStatus" NOT NULL DEFAULT 'CHECKED_IN';

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "currentCycleStart" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SessionCreditEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" "SessionCreditReason" NOT NULL,
    "cycleStart" TIMESTAMP(3) NOT NULL,
    "classAttendanceId" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionCreditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessionCreditEntry_userId_cycleStart_idx" ON "SessionCreditEntry"("userId", "cycleStart");

-- CreateIndex
CREATE INDEX "SessionCreditEntry_classAttendanceId_idx" ON "SessionCreditEntry"("classAttendanceId");

-- CreateIndex
CREATE INDEX "ClassAttendance_classInstanceId_status_idx" ON "ClassAttendance"("classInstanceId", "status");

-- AddForeignKey
ALTER TABLE "ClassAttendance" ADD CONSTRAINT "ClassAttendance_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionCreditEntry" ADD CONSTRAINT "SessionCreditEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionCreditEntry" ADD CONSTRAINT "SessionCreditEntry_classAttendanceId_fkey" FOREIGN KEY ("classAttendanceId") REFERENCES "ClassAttendance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Data backfill for the session-credit launch
-- ---------------------------------------------------------------------------

-- 1. Every attendance row that exists today was the deduction event under the
--    old join-time model — treat it as teacher-confirmed Present so session
--    history reads correctly.
UPDATE "ClassAttendance"
SET "status" = 'PRESENT', "confirmedAt" = "joinedAt"
WHERE "status" = 'CHECKED_IN';

-- 2. Open a fresh 30-day credit window for members currently on a capped plan
--    (monthly Everyday or Family). Annual plans stay uncapped (currentCycleStart
--    NULL). Cancelled-but-still-paid members keep access, so they get a window too.
UPDATE "Subscription" s
SET "currentCycleStart" = now()
WHERE s."currentCycleStart" IS NULL
  AND s."renewalDate" > now()
  AND s."status" IN ('ACTIVE', 'TRIAL', 'CANCELLED')
  AND (
    s."planKey" IN ('everyday', 'family')
    OR (s."planKey" IS NULL AND s."planType" = 'EVERYDAY_YOGA')
  );

-- 3. Grant 20 sessions for each window just opened (clean start — no retroactive
--    deductions for classes already attended this month).
INSERT INTO "SessionCreditEntry" ("id", "userId", "delta", "reason", "cycleStart", "note", "createdAt")
SELECT gen_random_uuid()::text, s."userId", 20, 'CYCLE_GRANT', s."currentCycleStart",
       'Backfill grant at session-credit launch', now()
FROM "Subscription" s
WHERE s."currentCycleStart" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "SessionCreditEntry" e
    WHERE e."userId" = s."userId" AND e."cycleStart" = s."currentCycleStart"
  );
