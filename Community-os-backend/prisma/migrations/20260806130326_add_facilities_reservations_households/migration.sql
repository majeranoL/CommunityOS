-- CreateEnum
CREATE TYPE "FacilityType" AS ENUM ('CLUBHOUSE', 'FUNCTION_ROOM', 'POOL', 'GYM', 'COURT', 'PARK', 'PLAYGROUND', 'GARDEN', 'OTHER');

-- CreateEnum
CREATE TYPE "FacilityStatus" AS ENUM ('AVAILABLE', 'MAINTENANCE', 'CLOSED');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "HouseholdStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "Resident" ADD COLUMN     "householdId" UUID;

-- CreateTable
CREATE TABLE "Facility" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" "FacilityType" NOT NULL,
    "description" TEXT,
    "location" VARCHAR(200),
    "capacity" INTEGER,
    "imageUrl" TEXT,
    "hourlyRate" DECIMAL(10,2),
    "status" "FacilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "facilityId" UUID NOT NULL,
    "residentId" UUID NOT NULL,
    "purpose" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "remarks" TEXT,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Household" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "block" VARCHAR(20),
    "lot" VARCHAR(20),
    "unit" VARCHAR(20),
    "address" TEXT,
    "status" "HouseholdStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Facility_communityId_idx" ON "Facility"("communityId");

-- CreateIndex
CREATE INDEX "Facility_type_idx" ON "Facility"("type");

-- CreateIndex
CREATE INDEX "Facility_status_idx" ON "Facility"("status");

-- CreateIndex
CREATE INDEX "Reservation_communityId_idx" ON "Reservation"("communityId");

-- CreateIndex
CREATE INDEX "Reservation_facilityId_idx" ON "Reservation"("facilityId");

-- CreateIndex
CREATE INDEX "Reservation_residentId_idx" ON "Reservation"("residentId");

-- CreateIndex
CREATE INDEX "Reservation_status_idx" ON "Reservation"("status");

-- CreateIndex
CREATE INDEX "Reservation_startAt_idx" ON "Reservation"("startAt");

-- CreateIndex
CREATE INDEX "Household_communityId_idx" ON "Household"("communityId");

-- CreateIndex
CREATE INDEX "Household_block_lot_idx" ON "Household"("block", "lot");

-- CreateIndex
CREATE INDEX "Household_status_idx" ON "Household"("status");

-- CreateIndex
CREATE INDEX "Resident_communityId_householdId_idx" ON "Resident"("communityId", "householdId");

-- AddForeignKey
ALTER TABLE "Resident" ADD CONSTRAINT "Resident_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facility" ADD CONSTRAINT "Facility_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Household" ADD CONSTRAINT "Household_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
