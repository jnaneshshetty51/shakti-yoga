-- AlterTable (split out from the cleanup migration so the backfill script can
-- write these columns before BlogPost/Practice/PracticeCompletion are dropped)
ALTER TABLE "Content" ADD COLUMN "relatedClassBatchId" TEXT,
ADD COLUMN "steps" TEXT;
