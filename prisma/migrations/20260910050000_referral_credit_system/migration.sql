-- Referral system rebuild: a ₹ credit wallet (replacing day-extension bonuses),
-- per-referral reward/discount snapshots, a 90-day validity window, and manual
-- admin reversal.
--
-- Rewritten to be safe against a POPULATED Referral/User table. The original
-- version of this migration assumed both were empty ("Referral table is empty
-- and referralCreditDays sits at its default (0) for every row in this
-- environment") — true in local dev, NOT verified against production, where
-- the referral feature (migration 20260908600000_referrals) has been live
-- since before this migration was authored. An unconditional
-- `ADD COLUMN "expiresAt" ... NOT NULL` with no default would hard-fail
-- `prisma migrate deploy` outright if a single real Referral row exists, and
-- the original `DROP COLUMN "status"` / `DROP COLUMN "referralCreditDays"`
-- would have silently discarded real referral outcomes and any bonus-day
-- balance a referee had already banked but not yet spent.

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'SUCCESSFUL', 'EXPIRED', 'REVERSED');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "creditApplied" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "refereeDiscountApplied" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable: add new Referral columns nullable/defaulted first so this
-- doesn't fail on existing rows.
ALTER TABLE "Referral"
    DROP COLUMN "rewardMonths",
    ADD COLUMN     "expiresAt" TIMESTAMP(3),
    ADD COLUMN     "flagged" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN     "refereeDiscountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    ADD COLUMN     "reversedAt" TIMESTAMP(3),
    ADD COLUMN     "rewardAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    ADD COLUMN     "statusNew" "ReferralStatus";

-- Backfill status: the old column was free text with exactly two values used
-- in practice (src/lib/referral.ts pre-rewrite) — the DEFAULT 'signed_up'
-- (unconverted) and 'converted' (set by markReferralConverted once a referee
-- paid). Map both; anything unexpected falls back to PENDING rather than
-- failing the migration.
UPDATE "Referral" SET "statusNew" = CASE
    WHEN "status" = 'converted' THEN 'SUCCESSFUL'::"ReferralStatus"
    ELSE 'PENDING'::"ReferralStatus"
END;

-- Backfill expiresAt for pre-existing rows: there was no expiry concept
-- before this migration, so apply the new 90-day validity window from
-- creation time.
UPDATE "Referral" SET "expiresAt" = "createdAt" + INTERVAL '90 days' WHERE "expiresAt" IS NULL;

ALTER TABLE "Referral"
    ALTER COLUMN "statusNew" SET NOT NULL,
    ALTER COLUMN "statusNew" SET DEFAULT 'PENDING',
    ALTER COLUMN "expiresAt" SET NOT NULL;

ALTER TABLE "Referral" DROP COLUMN "status";
ALTER TABLE "Referral" RENAME COLUMN "statusNew" TO "status";

-- AlterTable: User — referralCreditDays (day-extension balance) →
-- referralCreditBalance (₹ wallet). These are different units with no fixed
-- exchange rate, so this migration deliberately does NOT invent a conversion
-- for any pre-existing non-zero balance — that's a product decision, not a
-- migration-safety one. It only guarantees the migration itself won't fail;
-- see DEPLOY-NOW.md for the pre-deploy check this still requires.
ALTER TABLE "User" DROP COLUMN "referralCreditDays",
ADD COLUMN     "referralCreditBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Referral_status_idx" ON "Referral"("status");

-- CreateIndex
CREATE INDEX "Referral_expiresAt_idx" ON "Referral"("expiresAt");
