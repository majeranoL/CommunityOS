CREATE TYPE "HouseholdAcquisitionRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "HouseholdAcquisitionRequest" (
  "id" UUID NOT NULL,
  "communityId" UUID NOT NULL,
  "requestedById" UUID NOT NULL,
  "residentId" UUID NOT NULL,
  "householdId" UUID,
  "requestedBlock" VARCHAR(20),
  "requestedLot" VARCHAR(20),
  "requestedUnit" VARCHAR(20),
  "requestedAddress" TEXT,
  "notes" TEXT,
  "status" "HouseholdAcquisitionRequestStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedById" UUID,
  "reviewedAt" TIMESTAMP(3),
  "reviewNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HouseholdAcquisitionRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HouseholdAcquisitionRequest_communityId_status_idx" ON "HouseholdAcquisitionRequest"("communityId", "status");
CREATE INDEX "HouseholdAcquisitionRequest_requestedById_idx" ON "HouseholdAcquisitionRequest"("requestedById");
CREATE INDEX "HouseholdAcquisitionRequest_residentId_idx" ON "HouseholdAcquisitionRequest"("residentId");
CREATE INDEX "HouseholdAcquisitionRequest_householdId_idx" ON "HouseholdAcquisitionRequest"("householdId");

ALTER TABLE "HouseholdAcquisitionRequest" ADD CONSTRAINT "HouseholdAcquisitionRequest_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HouseholdAcquisitionRequest" ADD CONSTRAINT "HouseholdAcquisitionRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HouseholdAcquisitionRequest" ADD CONSTRAINT "HouseholdAcquisitionRequest_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HouseholdAcquisitionRequest" ADD CONSTRAINT "HouseholdAcquisitionRequest_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HouseholdAcquisitionRequest" ADD CONSTRAINT "HouseholdAcquisitionRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
