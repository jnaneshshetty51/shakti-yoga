-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "providerOrderId" DROP NOT NULL,
ADD COLUMN     "providerSubscriptionId" TEXT;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "recurring" BOOLEAN NOT NULL DEFAULT false;
