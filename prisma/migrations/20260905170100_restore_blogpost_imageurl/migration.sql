-- The production VPS independently dropped BlogPost.imageUrl in favor of
-- featuredImage; every other environment kept imageUrl and never had
-- featuredImage. This migration is intentionally idempotent (IF NOT EXISTS +
-- guarded backfill) so it is a genuine no-op everywhere imageUrl already
-- exists, and a real restore + backfill on the VPS where it was dropped.

-- AlterTable
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

-- Backfill from featuredImage where imageUrl was never populated (VPS only;
-- a no-op everywhere featuredImage is NULL).
UPDATE "BlogPost" SET "imageUrl" = "featuredImage"
WHERE "imageUrl" IS NULL AND "featuredImage" IS NOT NULL;
