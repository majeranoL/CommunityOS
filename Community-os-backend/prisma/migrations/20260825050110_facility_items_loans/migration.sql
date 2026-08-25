-- CreateEnum
CREATE TYPE "FacilityItemLoanStatus" AS ENUM ('PENDING', 'APPROVED', 'RETURNED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "FacilityItem" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "category" VARCHAR(50),
    "description" TEXT,
    "imageUrl" VARCHAR(500),
    "quantityTotal" INTEGER NOT NULL DEFAULT 0,
    "quantityAvailable" INTEGER NOT NULL DEFAULT 0,
    "borrowFee" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FacilityItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityItemLoan" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "residentId" UUID NOT NULL,
    "loanNumber" VARCHAR(30) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "purpose" VARCHAR(300),
    "neededFrom" TIMESTAMP(3) NOT NULL,
    "neededUntil" TIMESTAMP(3) NOT NULL,
    "feePerUnit" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "assessmentId" UUID,
    "status" "FacilityItemLoanStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "rejectedById" UUID,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" VARCHAR(500),
    "returnedAt" TIMESTAMP(3),
    "remarks" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FacilityItemLoan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FacilityItem_communityId_idx" ON "FacilityItem"("communityId");

-- CreateIndex
CREATE INDEX "FacilityItem_isActive_idx" ON "FacilityItem"("isActive");

-- CreateIndex
CREATE INDEX "FacilityItemLoan_communityId_idx" ON "FacilityItemLoan"("communityId");

-- CreateIndex
CREATE INDEX "FacilityItemLoan_itemId_idx" ON "FacilityItemLoan"("itemId");

-- CreateIndex
CREATE INDEX "FacilityItemLoan_residentId_idx" ON "FacilityItemLoan"("residentId");

-- CreateIndex
CREATE INDEX "FacilityItemLoan_status_idx" ON "FacilityItemLoan"("status");

-- CreateIndex
CREATE UNIQUE INDEX "FacilityItemLoan_communityId_loanNumber_key" ON "FacilityItemLoan"("communityId", "loanNumber");

-- AddForeignKey
ALTER TABLE "FacilityItem" ADD CONSTRAINT "FacilityItem_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityItemLoan" ADD CONSTRAINT "FacilityItemLoan_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityItemLoan" ADD CONSTRAINT "FacilityItemLoan_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "FacilityItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityItemLoan" ADD CONSTRAINT "FacilityItemLoan_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityItemLoan" ADD CONSTRAINT "FacilityItemLoan_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityItemLoan" ADD CONSTRAINT "FacilityItemLoan_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityItemLoan" ADD CONSTRAINT "FacilityItemLoan_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
