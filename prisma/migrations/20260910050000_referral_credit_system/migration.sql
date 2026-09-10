-- Referral system rebuild: a ₹ credit wallet (replacing day-extension bonuses),
-- per-referral reward/discount snapshots, a 90-day validity window, and manual
-- admin reversal. Referral table is empty and referralCreditDays sits at its
-- default (0) for every row in this environment, so no data migration is needed.

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'SUCCESSFUL', 'EXPIRED', 'REVERSED');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "creditApplied" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "refereeDiscountApplied" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Referral" DROP COLUMN "rewardMonths",
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "flagged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "refereeDiscountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "reversedAt" TIMESTAMP(3),
ADD COLUMN     "rewardAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
DROP COLUMN "status",
ADD COLUMN     "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "referralCreditDays",
ADD COLUMN     "referralCreditBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Referral_status_idx" ON "Referral"("status");

-- CreateIndex
CREATE INDEX "Referral_expiresAt_idx" ON "Referral"("expiresAt");

