-- AlterTable
ALTER TABLE "CommunityComment" ADD COLUMN "parentId" TEXT;

-- AlterTable
ALTER TABLE "CommunityInteraction" ADD COLUMN "reaction" TEXT NOT NULL DEFAULT '❤️';

-- CreateIndex
CREATE INDEX "CommunityComment_parentId_idx" ON "CommunityComment"("parentId");

-- AddForeignKey
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CommunityComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
