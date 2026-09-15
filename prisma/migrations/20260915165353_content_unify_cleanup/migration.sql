-- AlterEnum
BEGIN;
CREATE TYPE "ContentType_new" AS ENUM ('VIDEO', 'AUDIO', 'ARTICLE', 'SHORT_PRACTICE', 'TAKE_A_MOMENT', 'FOUNDER_MESSAGE', 'ANNOUNCEMENT');
ALTER TABLE "Content" ALTER COLUMN "type" TYPE "ContentType_new" USING ("type"::text::"ContentType_new");
ALTER TYPE "ContentType" RENAME TO "ContentType_old";
ALTER TYPE "ContentType_new" RENAME TO "ContentType";
DROP TYPE "ContentType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "BlogPost" DROP CONSTRAINT "BlogPost_relatedPracticeId_fkey";

-- DropForeignKey
ALTER TABLE "Content" DROP CONSTRAINT "Content_relatedBlogId_fkey";

-- DropForeignKey
ALTER TABLE "Content" DROP CONSTRAINT "Content_relatedPracticeId_fkey";

-- DropForeignKey
ALTER TABLE "PracticeCompletion" DROP CONSTRAINT "PracticeCompletion_practiceId_fkey";

-- DropForeignKey
ALTER TABLE "PracticeCompletion" DROP CONSTRAINT "PracticeCompletion_userId_fkey";

-- AlterTable
ALTER TABLE "Content" DROP COLUMN "relatedBlogId",
DROP COLUMN "relatedPracticeId";

-- DropTable
DROP TABLE "BlogPost";

-- DropTable
DROP TABLE "Practice";

-- DropTable
DROP TABLE "PracticeCompletion";

-- DropEnum
DROP TYPE "PracticeLevel";

