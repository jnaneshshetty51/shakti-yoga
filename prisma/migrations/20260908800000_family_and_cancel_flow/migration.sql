-- Monetization completion: family-plan seats + pause / scheduled-downgrade.

ALTER TABLE "Subscription"
    ADD COLUMN "familyInviteCode" TEXT,
    ADD COLUMN "pendingPlanKey" TEXT,
    ADD COLUMN "pausedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Subscription_familyInviteCode_key" ON "Subscription"("familyInviteCode");
