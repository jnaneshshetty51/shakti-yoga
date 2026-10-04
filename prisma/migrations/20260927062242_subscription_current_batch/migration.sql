-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "currentBatchId" TEXT;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_currentBatchId_fkey" FOREIGN KEY ("currentBatchId") REFERENCES "ClassBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
