-- DropIndex
DROP INDEX "Complaint_complaintNumber_key";

-- DropIndex
DROP INDEX "Resident_residentNumber_key";

-- DropIndex
DROP INDEX "User_referenceNumber_key";

-- CreateIndex
CREATE UNIQUE INDEX "Complaint_communityId_complaintNumber_key" ON "Complaint"("communityId", "complaintNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Resident_communityId_residentNumber_key" ON "Resident"("communityId", "residentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_communityId_referenceNumber_key" ON "User"("communityId", "referenceNumber");
