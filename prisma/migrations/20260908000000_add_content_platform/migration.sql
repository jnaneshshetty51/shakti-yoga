-- Content platform: feed-native Reels / Posts / Announcements + member like/save.
-- Blogs stay in BlogPost; the app's /api/content/feed merges both.

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('REEL', 'POST', 'ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "ContentCategory" AS ENUM ('YOGA', 'BREATHING', 'MINDFULNESS', 'MOBILITY', 'SLEEP', 'STRENGTH', 'WELLNESS', 'BEGINNERS', 'PHILOSOPHY', 'STUDIO', 'COMMUNITY');

-- CreateTable
CREATE TABLE "Content" (
    "id" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "category" "ContentCategory" NOT NULL DEFAULT 'YOGA',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "caption" TEXT,
    "instagramUrl" TEXT,
    "imageUrl" TEXT,
    "mediaUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ctaType" TEXT,
    "ctaLabel" TEXT,
    "relatedBlogId" TEXT,
    "author" TEXT NOT NULL DEFAULT 'Shakti Yoga',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "publishedAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "saveCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Content_status_type_publishedAt_idx" ON "Content"("status", "type", "publishedAt");

-- CreateIndex
CREATE INDEX "Content_status_category_idx" ON "Content"("status", "category");

-- CreateIndex
CREATE INDEX "Content_scheduledAt_idx" ON "Content"("scheduledAt");

-- CreateIndex
CREATE INDEX "ContentInteraction_userId_kind_idx" ON "ContentInteraction"("userId", "kind");

-- CreateIndex
CREATE INDEX "ContentInteraction_contentId_kind_idx" ON "ContentInteraction"("contentId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "ContentInteraction_userId_contentId_kind_key" ON "ContentInteraction"("userId", "contentId", "kind");

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_relatedBlogId_fkey" FOREIGN KEY ("relatedBlogId") REFERENCES "BlogPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentInteraction" ADD CONSTRAINT "ContentInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentInteraction" ADD CONSTRAINT "ContentInteraction_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
