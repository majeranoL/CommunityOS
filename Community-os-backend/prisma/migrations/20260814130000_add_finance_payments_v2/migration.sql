-- Phase 1 (IDEA 1 & 4): Finance, payments, allocation, verification & migration support.

-- RenameEnumValue
ALTER TYPE "PaymentStatus" RENAME VALUE 'PENDING' TO 'PENDING_VERIFICATION';

-- RenameEnumValue
ALTER TYPE "PaymentStatus" RENAME VALUE 'CONFIRMED' TO 'VERIFIED';

-- CreateEnum (add CANCELLED to PaymentStatus)
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- Add WAIVED to AssessmentStatus
ALTER TYPE "AssessmentStatus" ADD VALUE IF NOT EXISTS 'WAIVED';

-- CreateEnum
CREATE TYPE "FinanceCategory" AS ENUM ('DUES', 'SPECIAL_ASSESSMENT', 'BOND', 'FACILITY_FEE', 'VEHICLE_STICKER', 'PARKING_FEE', 'UTILITY', 'MEMBERSHIP_FEE', 'LATE_PENALTY', 'VIOLATION_FINE', 'OTHER');

-- CreateEnum
CREATE TYPE "ChargeRecurrence" AS ENUM ('RECURRING', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "BillingPeriodStatus" AS ENUM ('OPEN', 'PAID', 'OVERDUE', 'WAIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ImportBatchStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED', 'ROLLED_BACK');

-- CreateTable
CREATE TABLE "ChargeType" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "category" "FinanceCategory" NOT NULL DEFAULT 'OTHER',
    "recurrence" "ChargeRecurrence" NOT NULL DEFAULT 'ONE_TIME',
    "amount" DECIMAL(10,2),
    "dueDay" INTEGER,
    "description" TEXT,
    "allowAdvancePayment" BOOLEAN NOT NULL DEFAULT true,
    "advanceAppliesToOneTime" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ChargeType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChargeType_communityId_code_key" ON "ChargeType"("communityId", "code");

-- CreateIndex
CREATE INDEX "ChargeType_communityId_idx" ON "ChargeType"("communityId");

-- CreateIndex
CREATE INDEX "ChargeType_category_idx" ON "ChargeType"("category");

-- AddForeignKey
ALTER TABLE "ChargeType" ADD CONSTRAINT "ChargeType_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "BillingPeriod" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "chargeTypeId" UUID NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "periodKey" VARCHAR(20) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "BillingPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BillingPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillingPeriod_communityId_chargeTypeId_periodKey_key" ON "BillingPeriod"("communityId", "chargeTypeId", "periodKey");

-- CreateIndex
CREATE INDEX "BillingPeriod_communityId_idx" ON "BillingPeriod"("communityId");

-- CreateIndex
CREATE INDEX "BillingPeriod_chargeTypeId_idx" ON "BillingPeriod"("chargeTypeId");

-- CreateIndex
CREATE INDEX "BillingPeriod_periodKey_idx" ON "BillingPeriod"("periodKey");

-- AddForeignKey
ALTER TABLE "BillingPeriod" ADD CONSTRAINT "BillingPeriod_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingPeriod" ADD CONSTRAINT "BillingPeriod_chargeTypeId_fkey" FOREIGN KEY ("chargeTypeId") REFERENCES "ChargeType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "importedById" UUID NOT NULL,
    "status" "ImportBatchStatus" NOT NULL DEFAULT 'PROCESSING',
    "resultCounts" JSONB,
    "errors" JSONB,
    "canRollback" BOOLEAN NOT NULL DEFAULT false,
    "rolledBackAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportBatch_communityId_idx" ON "ImportBatch"("communityId");

-- CreateIndex
CREATE INDEX "ImportBatch_importedById_idx" ON "ImportBatch"("importedById");

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable (Assessment: charge type / billing period / import provenance)
ALTER TABLE "Assessment" ADD COLUMN "chargeTypeId" UUID,
ADD COLUMN "billingPeriodId" UUID,
ADD COLUMN "isImported" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "importBatchId" UUID;

-- CreateIndex
CREATE INDEX "Assessment_chargeTypeId_idx" ON "Assessment"("chargeTypeId");

-- CreateIndex
CREATE INDEX "Assessment_billingPeriodId_idx" ON "Assessment"("billingPeriodId");

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_chargeTypeId_fkey" FOREIGN KEY ("chargeTypeId") REFERENCES "ChargeType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_billingPeriodId_fkey" FOREIGN KEY ("billingPeriodId") REFERENCES "BillingPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable (Payment: nullable assessment, allocation metadata, verification workflow, provenance)
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_assessmentId_fkey";

ALTER TABLE "Payment" ALTER COLUMN "assessmentId" DROP NOT NULL;

ALTER TABLE "Payment" ALTER COLUMN "status" SET DEFAULT 'PENDING_VERIFICATION';

ALTER TABLE "Payment" ADD COLUMN "chargeTypeId" UUID,
ADD COLUMN "proofFileId" UUID,
ADD COLUMN "proofUrl" VARCHAR(500),
ADD COLUMN "verifiedById" UUID,
ADD COLUMN "verifiedAt" TIMESTAMP(3),
ADD COLUMN "rejectionReason" VARCHAR(500),
ADD COLUMN "rejectedById" UUID,
ADD COLUMN "rejectedAt" TIMESTAMP(3),
ADD COLUMN "refundedById" UUID,
ADD COLUMN "refundedAt" TIMESTAMP(3),
ADD COLUMN "cancelledById" UUID,
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "isImported" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "importBatchId" UUID;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_chargeTypeId_fkey" FOREIGN KEY ("chargeTypeId") REFERENCES "ChargeType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_refundedById_fkey" FOREIGN KEY ("refundedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Payment_chargeTypeId_idx" ON "Payment"("chargeTypeId");

-- CreateTable
CREATE TABLE "PaymentAllocation" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "allocatedAmount" DECIMAL(10,2) NOT NULL,
    "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAllocation_paymentId_assessmentId_key" ON "PaymentAllocation"("paymentId", "assessmentId");

-- CreateIndex
CREATE INDEX "PaymentAllocation_communityId_idx" ON "PaymentAllocation"("communityId");

-- CreateIndex
CREATE INDEX "PaymentAllocation_paymentId_idx" ON "PaymentAllocation"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentAllocation_assessmentId_idx" ON "PaymentAllocation"("assessmentId");

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
