-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'INR';

-- Backfill: existing invoices were created before currency was tracked
-- explicitly. amountInr already holds whatever currency the linked Payment
-- was actually charged in (see lib/invoice.ts) — recover the real currency
-- from that Payment rather than leaving every historical row mislabeled INR.
UPDATE "Invoice" i
SET "currency" = p."currency"
FROM "Payment" p
WHERE i."paymentId" = p.id AND p."currency" IS NOT NULL;
