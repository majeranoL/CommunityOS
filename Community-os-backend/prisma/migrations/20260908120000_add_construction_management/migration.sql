CREATE TYPE "ConstructionRequestType" AS ENUM ('CONSTRUCTION', 'RENOVATION');
CREATE TYPE "ConstructionRequestStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'COMPLETED', 'CLOSED', 'CANCELLED');

ALTER TABLE "ConstructionBond"
ADD COLUMN "requestId" UUID;

CREATE UNIQUE INDEX "ConstructionBond_requestId_key" ON "ConstructionBond"("requestId");

CREATE TABLE "ConstructionRequirement" (
  "id" UUID NOT NULL,
  "communityId" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "description" TEXT,
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConstructionRequirement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConstructionRequest" (
  "id" UUID NOT NULL,
  "communityId" UUID NOT NULL,
  "householdId" UUID NOT NULL,
  "submittedById" UUID NOT NULL,
  "requestNumber" VARCHAR(30) NOT NULL,
  "type" "ConstructionRequestType" NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "description" TEXT NOT NULL,
  "location" VARCHAR(200),
  "contractorName" VARCHAR(200),
  "plannedStartDate" TIMESTAMP(3) NOT NULL,
  "plannedEndDate" TIMESTAMP(3) NOT NULL,
  "bondAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "status" "ConstructionRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
  "reviewNotes" TEXT,
  "rejectionReason" TEXT,
  "reviewedById" UUID,
  "reviewedAt" TIMESTAMP(3),
  "completedById" UUID,
  "completedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "ConstructionRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConstructionRequestDocument" (
  "id" UUID NOT NULL,
  "requestId" UUID NOT NULL,
  "requirementId" UUID,
  "communityId" UUID NOT NULL,
  "uploadedById" UUID NOT NULL,
  "fileId" UUID,
  "fileUrl" TEXT,
  "originalName" VARCHAR(255) NOT NULL,
  "documentType" VARCHAR(120) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConstructionRequestDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConstructionRequirement_communityId_name_key" ON "ConstructionRequirement"("communityId", "name");
CREATE UNIQUE INDEX "ConstructionRequest_communityId_requestNumber_key" ON "ConstructionRequest"("communityId", "requestNumber");
CREATE INDEX "ConstructionRequirement_communityId_isActive_idx" ON "ConstructionRequirement"("communityId", "isActive");
CREATE INDEX "ConstructionRequest_communityId_status_idx" ON "ConstructionRequest"("communityId", "status");
CREATE INDEX "ConstructionRequest_householdId_idx" ON "ConstructionRequest"("householdId");
CREATE INDEX "ConstructionRequest_submittedById_idx" ON "ConstructionRequest"("submittedById");
CREATE INDEX "ConstructionRequestDocument_requestId_idx" ON "ConstructionRequestDocument"("requestId");
CREATE INDEX "ConstructionRequestDocument_communityId_idx" ON "ConstructionRequestDocument"("communityId");

ALTER TABLE "ConstructionRequirement" ADD CONSTRAINT "ConstructionRequirement_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionRequest" ADD CONSTRAINT "ConstructionRequest_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionRequest" ADD CONSTRAINT "ConstructionRequest_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionRequest" ADD CONSTRAINT "ConstructionRequest_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConstructionRequest" ADD CONSTRAINT "ConstructionRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConstructionRequest" ADD CONSTRAINT "ConstructionRequest_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConstructionRequestDocument" ADD CONSTRAINT "ConstructionRequestDocument_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ConstructionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionRequestDocument" ADD CONSTRAINT "ConstructionRequestDocument_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "ConstructionRequirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConstructionRequestDocument" ADD CONSTRAINT "ConstructionRequestDocument_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionRequestDocument" ADD CONSTRAINT "ConstructionRequestDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConstructionBond" ADD CONSTRAINT "ConstructionBond_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ConstructionRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
