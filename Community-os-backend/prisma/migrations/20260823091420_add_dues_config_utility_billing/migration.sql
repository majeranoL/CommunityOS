-- CreateEnum
CREATE TYPE "LateFeeType" AS ENUM ('NONE', 'FIXED_AMOUNT', 'PERCENT');

-- CreateEnum
CREATE TYPE "UtilityRateMode" AS ENUM ('METERED', 'FIXED');

-- AlterTable
ALTER TABLE "ChargeType" ADD COLUMN     "autoGenerate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "gracePeriodDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lateFeeType" "LateFeeType" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "lateFeeValue" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "UtilityConfig" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "utilityType" "UtilityType" NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "rateMode" "UtilityRateMode" NOT NULL DEFAULT 'METERED',
    "unitRate" DECIMAL(10,4),
    "fixedRate" DECIMAL(10,2),
    "tieredRates" JSONB,
    "chargeTypeId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "UtilityConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UtilityReading" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "utilityConfigId" UUID NOT NULL,
    "householdId" UUID NOT NULL,
    "periodKey" VARCHAR(10) NOT NULL,
    "previousReading" DECIMAL(12,2),
    "currentReading" DECIMAL(12,2),
    "usage" DECIMAL(12,2),
    "readingDate" TIMESTAMP(3) NOT NULL,
    "recordedById" UUID NOT NULL,
    "notes" VARCHAR(500),
    "isImported" BOOLEAN NOT NULL DEFAULT false,
    "importBatchId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UtilityReading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UtilityConfig_communityId_idx" ON "UtilityConfig"("communityId");

-- CreateIndex
CREATE INDEX "UtilityConfig_chargeTypeId_idx" ON "UtilityConfig"("chargeTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "UtilityConfig_communityId_utilityType_key" ON "UtilityConfig"("communityId", "utilityType");

-- CreateIndex
CREATE INDEX "UtilityReading_communityId_idx" ON "UtilityReading"("communityId");

-- CreateIndex
CREATE INDEX "UtilityReading_householdId_idx" ON "UtilityReading"("householdId");

-- CreateIndex
CREATE INDEX "UtilityReading_periodKey_idx" ON "UtilityReading"("periodKey");

-- CreateIndex
CREATE UNIQUE INDEX "UtilityReading_utilityConfigId_householdId_periodKey_key" ON "UtilityReading"("utilityConfigId", "householdId", "periodKey");

-- AddForeignKey
ALTER TABLE "UtilityConfig" ADD CONSTRAINT "UtilityConfig_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilityConfig" ADD CONSTRAINT "UtilityConfig_chargeTypeId_fkey" FOREIGN KEY ("chargeTypeId") REFERENCES "ChargeType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilityReading" ADD CONSTRAINT "UtilityReading_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilityReading" ADD CONSTRAINT "UtilityReading_utilityConfigId_fkey" FOREIGN KEY ("utilityConfigId") REFERENCES "UtilityConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilityReading" ADD CONSTRAINT "UtilityReading_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilityReading" ADD CONSTRAINT "UtilityReading_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilityReading" ADD CONSTRAINT "UtilityReading_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
