-- AlterTable: Add import tracking fields to Household
ALTER TABLE "Household" ADD COLUMN "isImported" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Household" ADD COLUMN "importBatchId" UUID;

-- AlterTable: Add import tracking fields to Resident
ALTER TABLE "Resident" ADD COLUMN "isImported" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Resident" ADD COLUMN "importBatchId" UUID;

-- AlterTable: Add import tracking fields to Vehicle
ALTER TABLE "Vehicle" ADD COLUMN "isImported" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Vehicle" ADD COLUMN "importBatchId" UUID;

-- AlterTable: Add import tracking fields to Pet
ALTER TABLE "Pet" ADD COLUMN "isImported" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Pet" ADD COLUMN "importBatchId" UUID;

-- AlterTable: Add import tracking fields to Staff
ALTER TABLE "Staff" ADD COLUMN "isImported" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Staff" ADD COLUMN "importBatchId" UUID;

-- CreateIndex
CREATE INDEX "Household_importBatchId_idx" ON "Household"("importBatchId");

-- CreateIndex
CREATE INDEX "Resident_importBatchId_idx" ON "Resident"("importBatchId");

-- CreateIndex
CREATE INDEX "Vehicle_importBatchId_idx" ON "Vehicle"("importBatchId");

-- CreateIndex
CREATE INDEX "Pet_importBatchId_idx" ON "Pet"("importBatchId");

-- CreateIndex
CREATE INDEX "Staff_importBatchId_idx" ON "Staff"("importBatchId");

-- AddForeignKey
ALTER TABLE "Household" ADD CONSTRAINT "Household_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resident" ADD CONSTRAINT "Resident_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
