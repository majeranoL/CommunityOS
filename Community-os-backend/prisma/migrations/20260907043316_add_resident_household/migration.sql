-- CreateEnum
CREATE TYPE "HouseholdRelationshipType" AS ENUM ('OWNER', 'CO_OWNER', 'RENTER', 'FAMILY', 'OTHER');

-- CreateEnum
CREATE TYPE "HouseholdMembershipStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "Resident" ADD COLUMN     "primaryHouseholdId" UUID;

-- CreateTable
CREATE TABLE "ResidentHousehold" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "residentId" UUID NOT NULL,
    "householdId" UUID NOT NULL,
    "relationshipType" "HouseholdRelationshipType" NOT NULL DEFAULT 'OWNER',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "HouseholdMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResidentHousehold_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResidentHousehold_communityId_idx" ON "ResidentHousehold"("communityId");

-- CreateIndex
CREATE INDEX "ResidentHousehold_residentId_idx" ON "ResidentHousehold"("residentId");

-- CreateIndex
CREATE INDEX "ResidentHousehold_householdId_idx" ON "ResidentHousehold"("householdId");

-- CreateIndex
CREATE INDEX "ResidentHousehold_communityId_householdId_idx" ON "ResidentHousehold"("communityId", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "ResidentHousehold_communityId_residentId_householdId_key" ON "ResidentHousehold"("communityId", "residentId", "householdId");

-- AddForeignKey
ALTER TABLE "Resident" ADD CONSTRAINT "Resident_primaryHouseholdId_fkey" FOREIGN KEY ("primaryHouseholdId") REFERENCES "Household"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentHousehold" ADD CONSTRAINT "ResidentHousehold_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentHousehold" ADD CONSTRAINT "ResidentHousehold_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentHousehold" ADD CONSTRAINT "ResidentHousehold_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
