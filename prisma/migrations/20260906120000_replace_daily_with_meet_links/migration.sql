-- Drop the Daily.co live-video feature entirely.

-- DropForeignKey
ALTER TABLE "LiveClassParticipant" DROP CONSTRAINT IF EXISTS "LiveClassParticipant_liveClassId_fkey";
ALTER TABLE "LiveClassParticipant" DROP CONSTRAINT IF EXISTS "LiveClassParticipant_userId_fkey";
ALTER TABLE "LiveClass" DROP CONSTRAINT IF EXISTS "LiveClass_teacherId_fkey";

-- DropTable
DROP TABLE IF EXISTS "LiveClassParticipant";
DROP TABLE IF EXISTS "LiveClass";

-- DropEnum
DROP TYPE IF EXISTS "LiveClassStatus";

-- AlterTable: batch-level class length + per-instance Google Meet link override
ALTER TABLE "ClassBatch" ADD COLUMN "durationMin" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "ClassInstance" ADD COLUMN "meetingLink" TEXT;

-- One materialised occurrence per batch per start time
CREATE UNIQUE INDEX "ClassInstance_batchId_date_key" ON "ClassInstance"("batchId", "date");

-- CreateTable: per-member class attendance
CREATE TABLE "ClassAttendance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "classInstanceId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClassAttendance_userId_classInstanceId_key" ON "ClassAttendance"("userId", "classInstanceId");

-- AddForeignKey
ALTER TABLE "ClassAttendance" ADD CONSTRAINT "ClassAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClassAttendance" ADD CONSTRAINT "ClassAttendance_classInstanceId_fkey" FOREIGN KEY ("classInstanceId") REFERENCES "ClassInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
