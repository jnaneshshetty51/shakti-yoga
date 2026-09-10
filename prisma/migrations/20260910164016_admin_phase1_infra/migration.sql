-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('ISSUED', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "PatientUpdateStatus" AS ENUM ('PENDING', 'REVIEWED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AdminDepartment" ADD VALUE 'TRAINER';
ALTER TYPE "AdminDepartment" ADD VALUE 'THERAPIST';

-- AlterTable
ALTER TABLE "ClassBatch" ADD COLUMN     "capacity" INTEGER;

-- AlterTable
ALTER TABLE "ClassInstance" ADD COLUMN     "capacity" INTEGER;

-- AlterTable
ALTER TABLE "Content" ADD COLUMN     "audience" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "important" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paymentId" TEXT,
    "subscriptionId" TEXT,
    "amountInr" DOUBLE PRECISION NOT NULL,
    "taxInr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'ISSUED',
    "pdfKey" TEXT,
    "notes" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TherapyMeasurement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "painScore" INTEGER,
    "mobilityScore" INTEGER,
    "sleepScore" INTEGER,
    "stressScore" INTEGER,
    "weightKg" DOUBLE PRECISION,
    "note" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TherapyMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientUpdate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachmentKey" TEXT,
    "status" "PatientUpdateStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BroadcastLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "url" TEXT,
    "segment" TEXT NOT NULL,
    "channelId" TEXT NOT NULL DEFAULT 'default',
    "recipients" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BroadcastLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE INDEX "Invoice_userId_idx" ON "Invoice"("userId");

-- CreateIndex
CREATE INDEX "Invoice_issuedAt_idx" ON "Invoice"("issuedAt");

-- CreateIndex
CREATE INDEX "TherapyMeasurement_userId_takenAt_idx" ON "TherapyMeasurement"("userId", "takenAt");

-- CreateIndex
CREATE INDEX "PatientUpdate_status_createdAt_idx" ON "PatientUpdate"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PatientUpdate_userId_idx" ON "PatientUpdate"("userId");

-- CreateIndex
CREATE INDEX "BroadcastLog_createdAt_idx" ON "BroadcastLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TherapyMeasurement" ADD CONSTRAINT "TherapyMeasurement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TherapyMeasurement" ADD CONSTRAINT "TherapyMeasurement_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientUpdate" ADD CONSTRAINT "PatientUpdate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientUpdate" ADD CONSTRAINT "PatientUpdate_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
