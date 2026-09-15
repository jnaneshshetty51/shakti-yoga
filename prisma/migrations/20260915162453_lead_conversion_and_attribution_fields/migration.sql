-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "campaign" TEXT,
ADD COLUMN     "linkedUserId" TEXT,
ADD COLUMN     "nextFollowUpAt" TIMESTAMP(3),
ADD COLUMN     "programInterest" TEXT;

