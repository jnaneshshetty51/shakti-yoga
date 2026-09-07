-- Growth: pricing ladder (Starter / Family / annual / NRI) + IAP (RevenueCat) fields.

-- AlterEnum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MEMBER_STARTER';

-- AlterEnum
ALTER TYPE "PlanType" ADD VALUE IF NOT EXISTS 'STARTER';
ALTER TYPE "PlanType" ADD VALUE IF NOT EXISTS 'FAMILY';

-- AlterTable
ALTER TABLE "Subscription"
    ADD COLUMN "planKey" TEXT,
    ADD COLUMN "interval" TEXT NOT NULL DEFAULT 'monthly',
    ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'razorpay',
    ADD COLUMN "store" TEXT,
    ADD COLUMN "familyOwnerId" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "planKey" TEXT;

-- Backfill interval for existing rows (all monthly until now).
UPDATE "Subscription" SET "interval" = 'trial' WHERE "planType" = 'TRIAL';
