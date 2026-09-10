-- Yoga Therapy assessment/intake: one structured record per user, reviewed by a
-- therapist before a recommendation (and payment) is offered.

-- CreateEnum
CREATE TYPE "TherapyIntakeStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'RECOMMENDED', 'RECOMMENDED_WITH_CONDITIONS', 'NOT_RECOMMENDED');

-- CreateTable
CREATE TABLE "TherapyIntake" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "TherapyIntakeStatus" NOT NULL DEFAULT 'DRAFT',
    "fullName" TEXT,
    "age" INTEGER,
    "gender" TEXT,
    "heightCm" DOUBLE PRECISION,
    "weightKg" DOUBLE PRECISION,
    "primaryConcern" TEXT,
    "concernDuration" TEXT,
    "concernDescription" TEXT,
    "injuriesSurgeries" TEXT,
    "medicalConditions" TEXT,
    "medications" TEXT,
    "familyHistory" TEXT,
    "priorYogaTherapy" TEXT,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TherapyIntake_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TherapyIntake_userId_key" ON "TherapyIntake"("userId");

-- CreateIndex
CREATE INDEX "TherapyIntake_status_idx" ON "TherapyIntake"("status");

-- AddForeignKey
ALTER TABLE "TherapyIntake" ADD CONSTRAINT "TherapyIntake_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TherapyIntake" ADD CONSTRAINT "TherapyIntake_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
