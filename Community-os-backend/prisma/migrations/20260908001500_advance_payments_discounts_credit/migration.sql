CREATE TYPE "DiscountType" AS ENUM ('FIXED', 'PERCENTAGE');

ALTER TABLE "Assessment"
  ADD COLUMN "discountType" "DiscountType",
  ADD COLUMN "discountValue" DECIMAL(10,2),
  ADD COLUMN "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

ALTER TABLE "Payment"
  ADD COLUMN "isAdvance" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "advanceMonths" INTEGER;

CREATE TABLE "HouseholdCredit" (
  "id" UUID NOT NULL,
  "communityId" UUID NOT NULL,
  "householdId" UUID NOT NULL,
  "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "sourcePaymentId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HouseholdCredit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "HouseholdCredit_communityId_householdId_createdAt_idx" ON "HouseholdCredit"("communityId","householdId","createdAt");
CREATE INDEX "HouseholdCredit_sourcePaymentId_idx" ON "HouseholdCredit"("sourcePaymentId");
ALTER TABLE "HouseholdCredit" ADD CONSTRAINT "HouseholdCredit_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HouseholdCredit" ADD CONSTRAINT "HouseholdCredit_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HouseholdCredit" ADD CONSTRAINT "HouseholdCredit_sourcePaymentId_fkey" FOREIGN KEY ("sourcePaymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
