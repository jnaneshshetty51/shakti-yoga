-- Loosen a handful of optional "who did this" staff-attribution references
-- from the default RESTRICT to SET NULL, so deleting a staff/teacher User
-- account doesn't throw an unhandled FK violation when they're referenced as
-- an assignee/approver/sender elsewhere. Core ownership relations (e.g.
-- ClassBatch.teacher) intentionally stay RESTRICT — those are handled with a
-- precheck in the admin delete route instead, since cascading or nulling
-- them would silently orphan or destroy real scheduling data.

-- DropForeignKey
ALTER TABLE "Lead" DROP CONSTRAINT IF EXISTS "Lead_assignedToId_fkey";
ALTER TABLE "CorporateLead" DROP CONSTRAINT IF EXISTS "CorporateLead_assignedToId_fkey";
ALTER TABLE "SupportConversation" DROP CONSTRAINT IF EXISTS "SupportConversation_assignedToId_fkey";
ALTER TABLE "Certificate" DROP CONSTRAINT IF EXISTS "Certificate_approvedById_fkey";
ALTER TABLE "SupportMessage" DROP CONSTRAINT IF EXISTS "SupportMessage_senderId_fkey";

-- AlterTable
ALTER TABLE "SupportMessage" ALTER COLUMN "senderId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CorporateLead" ADD CONSTRAINT "CorporateLead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportConversation" ADD CONSTRAINT "SupportConversation_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
