-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'VEHICLE_STICKER';

-- AlterTable
ALTER TABLE "VehicleSticker" ADD COLUMN     "assessmentId" UUID,
ALTER COLUMN "stickerNumber" DROP NOT NULL,
ALTER COLUMN "issueDate" DROP NOT NULL,
ALTER COLUMN "expirationDate" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "VehicleSticker_assessmentId_idx" ON "VehicleSticker"("assessmentId");

-- AddForeignKey
ALTER TABLE "VehicleSticker" ADD CONSTRAINT "VehicleSticker_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
