-- AlterTable
ALTER TABLE "ClassBatch" ADD COLUMN     "oneTime" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "openAccess" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ClassInstance" ADD COLUMN     "openAccess" BOOLEAN,
ADD COLUMN     "teacherId" TEXT;

-- AddForeignKey
ALTER TABLE "ClassInstance" ADD CONSTRAINT "ClassInstance_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

