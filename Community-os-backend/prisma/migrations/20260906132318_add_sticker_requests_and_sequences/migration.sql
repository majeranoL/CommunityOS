-- CreateEnum
CREATE TYPE "StickerRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "VehicleSticker" ADD COLUMN     "requestId" UUID;

-- CreateTable
CREATE TABLE "StickerRequest" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "requestNumber" VARCHAR(30) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "feeTotal" DECIMAL(12,2) NOT NULL,
    "status" "StickerRequestStatus" NOT NULL DEFAULT 'PENDING',
    "notes" VARCHAR(500),
    "assessmentId" UUID,
    "requestedById" UUID NOT NULL,
    "approvedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "reviewRemarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "StickerRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sequence" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "prefix" VARCHAR(20) NOT NULL,
    "digits" INTEGER NOT NULL DEFAULT 6,
    "nextValue" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StickerRequest_communityId_idx" ON "StickerRequest"("communityId");

-- CreateIndex
CREATE INDEX "StickerRequest_vehicleId_idx" ON "StickerRequest"("vehicleId");

-- CreateIndex
CREATE INDEX "StickerRequest_status_idx" ON "StickerRequest"("status");

-- CreateIndex
CREATE INDEX "StickerRequest_assessmentId_idx" ON "StickerRequest"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "StickerRequest_communityId_requestNumber_key" ON "StickerRequest"("communityId", "requestNumber");

-- CreateIndex
CREATE INDEX "Sequence_communityId_idx" ON "Sequence"("communityId");

-- CreateIndex
CREATE UNIQUE INDEX "Sequence_communityId_key_key" ON "Sequence"("communityId", "key");

-- CreateIndex
CREATE INDEX "VehicleSticker_requestId_idx" ON "VehicleSticker"("requestId");

-- AddForeignKey
ALTER TABLE "VehicleSticker" ADD CONSTRAINT "VehicleSticker_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "StickerRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StickerRequest" ADD CONSTRAINT "StickerRequest_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StickerRequest" ADD CONSTRAINT "StickerRequest_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StickerRequest" ADD CONSTRAINT "StickerRequest_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StickerRequest" ADD CONSTRAINT "StickerRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StickerRequest" ADD CONSTRAINT "StickerRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sequence" ADD CONSTRAINT "Sequence_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
