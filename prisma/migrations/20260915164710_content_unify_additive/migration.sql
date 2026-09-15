-- CreateEnum
CREATE TYPE "ContentAccess" AS ENUM ('PUBLIC', 'ACCOUNT_REQUIRED', 'MEMBERSHIP_REQUIRED', 'THERAPY_ONLY');

-- CreateEnum
CREATE TYPE "ContentDifficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ALL_LEVELS', 'ADVANCED');

-- AlterEnum
ALTER TYPE "ContentCategory" ADD VALUE 'THERAPY';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ContentStatus" ADD VALUE 'IN_REVIEW';
ALTER TYPE "ContentStatus" ADD VALUE 'APPROVED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ContentType" ADD VALUE 'VIDEO';
ALTER TYPE "ContentType" ADD VALUE 'AUDIO';
ALTER TYPE "ContentType" ADD VALUE 'ARTICLE';
ALTER TYPE "ContentType" ADD VALUE 'SHORT_PRACTICE';
ALTER TYPE "ContentType" ADD VALUE 'TAKE_A_MOMENT';
ALTER TYPE "ContentType" ADD VALUE 'FOUNDER_MESSAGE';

-- AlterTable
ALTER TABLE "Content" ADD COLUMN     "access" "ContentAccess" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedByUserId" TEXT,
ADD COLUMN     "audioUrl" TEXT,
ADD COLUMN     "completionCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "createdByUserId" TEXT,
ADD COLUMN     "difficulty" "ContentDifficulty",
ADD COLUMN     "durationMin" INTEGER,
ADD COLUMN     "excerpt" TEXT,
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'English',
ADD COLUMN     "metaDescription" TEXT,
ADD COLUMN     "metaTitle" TEXT,
ADD COLUMN     "relatedContentId" TEXT,
ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedByUserId" TEXT,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "submittedByUserId" TEXT,
ADD COLUMN     "submittedForReviewAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ContentVersion" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "status" "ContentStatus" NOT NULL,
    "editedByUserId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentCompletion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentVersion_contentId_idx" ON "ContentVersion"("contentId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentVersion_contentId_version_key" ON "ContentVersion"("contentId", "version");

-- CreateIndex
CREATE INDEX "ContentCompletion_userId_completedAt_idx" ON "ContentCompletion"("userId", "completedAt");

-- CreateIndex
CREATE INDEX "ContentCompletion_contentId_idx" ON "ContentCompletion"("contentId");

-- CreateIndex
CREATE UNIQUE INDEX "Content_slug_key" ON "Content"("slug");

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_relatedContentId_fkey" FOREIGN KEY ("relatedContentId") REFERENCES "Content"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentVersion" ADD CONSTRAINT "ContentVersion_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentVersion" ADD CONSTRAINT "ContentVersion_editedByUserId_fkey" FOREIGN KEY ("editedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentCompletion" ADD CONSTRAINT "ContentCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentCompletion" ADD CONSTRAINT "ContentCompletion_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

