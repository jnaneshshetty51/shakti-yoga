-- Content platform Phase 4: opt-in push when an item is first published.

-- AlterTable
ALTER TABLE "Content"
    ADD COLUMN "notifyOnPublish" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "notifiedAt" TIMESTAMP(3);
