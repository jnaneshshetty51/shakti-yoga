-- Move the two money fields that are repeatedly incremented/decremented
-- over their lifetime (rather than set once) from Float (double precision,
-- inexact under repeated binary-float addition) to Decimal(10,2) (exact).
-- USING casts the existing double-precision values straight into the new
-- numeric column — no data loss, since these are already 2dp-clean amounts.

-- AlterTable
ALTER TABLE "User"
    ALTER COLUMN "referralCreditBalance" TYPE DECIMAL(10,2) USING "referralCreditBalance"::DECIMAL(10,2),
    ALTER COLUMN "referralCreditBalance" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Payment"
    ALTER COLUMN "refundedAmount" TYPE DECIMAL(10,2) USING "refundedAmount"::DECIMAL(10,2),
    ALTER COLUMN "refundedAmount" SET DEFAULT 0;
