-- CreateEnum
CREATE TYPE "HouseholdCreditApplicationSource" AS ENUM ('PAYMENT', 'ASSESSMENT_GENERATION', 'DUES_AUTOMATION', 'MANUAL');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "isCreditIssue" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "HouseholdCreditApplication" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "householdId" UUID NOT NULL,
    "creditId" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "paymentId" UUID,
    "amount" DECIMAL(10,2) NOT NULL,
    "source" "HouseholdCreditApplicationSource" NOT NULL DEFAULT 'PAYMENT',
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversedById" UUID,
    "reversedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HouseholdCreditApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HouseholdCreditApplication_communityId_householdId_idx" ON "HouseholdCreditApplication"("communityId", "householdId");

-- CreateIndex
CREATE INDEX "HouseholdCreditApplication_creditId_idx" ON "HouseholdCreditApplication"("creditId");

-- CreateIndex
CREATE INDEX "HouseholdCreditApplication_assessmentId_idx" ON "HouseholdCreditApplication"("assessmentId");

-- CreateIndex
CREATE INDEX "HouseholdCreditApplication_paymentId_idx" ON "HouseholdCreditApplication"("paymentId");

-- AddForeignKey
ALTER TABLE "HouseholdCreditApplication" ADD CONSTRAINT "HouseholdCreditApplication_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdCreditApplication" ADD CONSTRAINT "HouseholdCreditApplication_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdCreditApplication" ADD CONSTRAINT "HouseholdCreditApplication_creditId_fkey" FOREIGN KEY ("creditId") REFERENCES "HouseholdCredit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdCreditApplication" ADD CONSTRAINT "HouseholdCreditApplication_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdCreditApplication" ADD CONSTRAINT "HouseholdCreditApplication_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdCreditApplication" ADD CONSTRAINT "HouseholdCreditApplication_reversedById_fkey" FOREIGN KEY ("reversedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
