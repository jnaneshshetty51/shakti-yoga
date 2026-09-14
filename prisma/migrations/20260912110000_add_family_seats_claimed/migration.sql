-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "seatsClaimed" INTEGER NOT NULL DEFAULT 0;

-- Backfill: existing family owners' claimed-seat count should reflect the
-- seats already redeemed against their invite code, not start back at zero.
UPDATE "Subscription" owner
SET "seatsClaimed" = seat_counts.n
FROM (
    SELECT "familyOwnerId", COUNT(*) AS n
    FROM "Subscription"
    WHERE "familyOwnerId" IS NOT NULL
    GROUP BY "familyOwnerId"
) seat_counts
WHERE owner."userId" = seat_counts."familyOwnerId";
