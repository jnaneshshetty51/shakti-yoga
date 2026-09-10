-- CreateEnum
CREATE TYPE "AdminDepartment" AS ENUM ('CONTENT', 'SUPPORT');

-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('PENDING', 'APPROVED', 'REVOKED');

-- CreateEnum
CREATE TYPE "CorporateLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'DISCUSSION', 'PROPOSAL', 'CONFIRMED', 'PAYMENT', 'COMPLETED', 'LOST');

-- CreateEnum
CREATE TYPE "RetreatKind" AS ENUM ('RETREAT', 'WORKSHOP', 'EVENT');

-- CreateEnum
CREATE TYPE "RetreatStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "RetreatEnquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'CONFIRMED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SupportConversationStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "adminDepartment" "AdminDepartment";

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reason" TEXT,
    "status" "CertificateStatus" NOT NULL DEFAULT 'PENDING',
    "verificationCode" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "sourceType" TEXT,
    "sourceId" TEXT,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorporateLead" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "employeeCount" INTEGER,
    "requirement" TEXT,
    "programInterest" TEXT,
    "message" TEXT,
    "status" "CorporateLeadStatus" NOT NULL DEFAULT 'NEW',
    "dealValue" DOUBLE PRECISION,
    "notes" TEXT,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorporateLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorporateLeadActivity" (
    "id" TEXT NOT NULL,
    "corporateLeadId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "performedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorporateLeadActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Retreat" (
    "id" TEXT NOT NULL,
    "kind" "RetreatKind" NOT NULL DEFAULT 'RETREAT',
    "name" TEXT NOT NULL,
    "location" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "images" TEXT[],
    "capacity" INTEGER,
    "price" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "RetreatStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Retreat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetreatEnquiry" (
    "id" TEXT NOT NULL,
    "retreatId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT,
    "participantsCount" INTEGER NOT NULL DEFAULT 1,
    "status" "RetreatEnquiryStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetreatEnquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT,
    "status" "SupportConversationStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_verificationCode_key" ON "Certificate"("verificationCode");

-- CreateIndex
CREATE INDEX "Certificate_userId_idx" ON "Certificate"("userId");

-- CreateIndex
CREATE INDEX "Certificate_status_idx" ON "Certificate"("status");

-- CreateIndex
CREATE INDEX "CorporateLead_status_idx" ON "CorporateLead"("status");

-- CreateIndex
CREATE INDEX "CorporateLeadActivity_corporateLeadId_idx" ON "CorporateLeadActivity"("corporateLeadId");

-- CreateIndex
CREATE INDEX "Retreat_status_kind_idx" ON "Retreat"("status", "kind");

-- CreateIndex
CREATE INDEX "RetreatEnquiry_retreatId_idx" ON "RetreatEnquiry"("retreatId");

-- CreateIndex
CREATE INDEX "RetreatEnquiry_status_idx" ON "RetreatEnquiry"("status");

-- CreateIndex
CREATE INDEX "SupportConversation_status_lastMessageAt_idx" ON "SupportConversation"("status", "lastMessageAt");

-- CreateIndex
CREATE INDEX "SupportConversation_userId_idx" ON "SupportConversation"("userId");

-- CreateIndex
CREATE INDEX "SupportMessage_conversationId_idx" ON "SupportMessage"("conversationId");

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateLead" ADD CONSTRAINT "CorporateLead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateLeadActivity" ADD CONSTRAINT "CorporateLeadActivity_corporateLeadId_fkey" FOREIGN KEY ("corporateLeadId") REFERENCES "CorporateLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetreatEnquiry" ADD CONSTRAINT "RetreatEnquiry_retreatId_fkey" FOREIGN KEY ("retreatId") REFERENCES "Retreat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportConversation" ADD CONSTRAINT "SupportConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportConversation" ADD CONSTRAINT "SupportConversation_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "SupportConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
