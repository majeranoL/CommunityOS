-- CreateEnum
CREATE TYPE "StickerStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "UtilityType" AS ENUM ('ELECTRICITY', 'WATER', 'GARBAGE', 'SEWERAGE', 'INTERNET', 'OTHER');

-- CreateTable
CREATE TABLE "VehicleSticker" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "stickerNumber" VARCHAR(30) NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "expirationDate" TIMESTAMP(3) NOT NULL,
    "photoUrl" VARCHAR(500),
    "status" "StickerStatus" NOT NULL DEFAULT 'PENDING',
    "notes" VARCHAR(500),
    "verifiedById" UUID,
    "verifiedAt" TIMESTAMP(3),
    "verificationRemarks" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "VehicleSticker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UtilityExpense" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "utilityNumber" VARCHAR(30) NOT NULL,
    "providerName" VARCHAR(100) NOT NULL,
    "utilityType" "UtilityType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "billingPeriod" VARCHAR(50),
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "referenceNumber" VARCHAR(100),
    "invoiceNumber" VARCHAR(100),
    "description" VARCHAR(500),
    "receiptFileId" UUID,
    "isImported" BOOLEAN NOT NULL DEFAULT false,
    "importBatchId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "UtilityExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VehicleSticker_communityId_stickerNumber_key" ON "VehicleSticker"("communityId", "stickerNumber");

-- CreateIndex
CREATE INDEX "VehicleSticker_communityId_idx" ON "VehicleSticker"("communityId");

-- CreateIndex
CREATE INDEX "VehicleSticker_vehicleId_idx" ON "VehicleSticker"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleSticker_status_idx" ON "VehicleSticker"("status");

-- CreateIndex
CREATE UNIQUE INDEX "UtilityExpense_communityId_utilityNumber_key" ON "UtilityExpense"("communityId", "utilityNumber");

-- CreateIndex
CREATE INDEX "UtilityExpense_communityId_idx" ON "UtilityExpense"("communityId");

-- CreateIndex
CREATE INDEX "UtilityExpense_utilityType_idx" ON "UtilityExpense"("utilityType");

-- CreateIndex
CREATE INDEX "UtilityExpense_providerName_idx" ON "UtilityExpense"("providerName");

-- CreateIndex
CREATE INDEX "UtilityExpense_expenseDate_idx" ON "UtilityExpense"("expenseDate");

-- AddForeignKey
ALTER TABLE "VehicleSticker" ADD CONSTRAINT "VehicleSticker_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleSticker" ADD CONSTRAINT "VehicleSticker_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleSticker" ADD CONSTRAINT "VehicleSticker_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleSticker" ADD CONSTRAINT "VehicleSticker_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilityExpense" ADD CONSTRAINT "UtilityExpense_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilityExpense" ADD CONSTRAINT "UtilityExpense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilityExpense" ADD CONSTRAINT "UtilityExpense_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
