-- Content platform Phase 3: pair a blog article with practice (CTA + related class).

-- AlterTable
ALTER TABLE "BlogPost"
    ADD COLUMN "ctaType" TEXT,
    ADD COLUMN "ctaLabel" TEXT,
    ADD COLUMN "relatedClassBatchId" TEXT;
