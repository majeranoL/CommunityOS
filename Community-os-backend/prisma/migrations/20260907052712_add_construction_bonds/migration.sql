-- CreateEnum
CREATE TYPE "ConstructionBondStatus" AS ENUM ('OPEN', 'ACTIVE', 'REFUNDED', 'FORFEITED');

-- CreateTable
CREATE TABLE "ConstructionBond" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "householdId" UUID NOT NULL,
    "bondNumber" VARCHAR(30) NOT NULL,
    "scope" TEXT NOT NULL,
    "contractReference" TEXT,
    "depositAmount" DECIMAL(10,2) NOT NULL,
    "depositDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ConstructionBondStatus" NOT NULL DEFAULT 'OPEN',
    "depositRecordedById" UUID,
    "resolvedById" UUID,
    "resolvedAt" TIMESTAMP(3),
    "forfeitedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "refundNotes" TEXT,
    "remarks" TEXT,
    "assessmentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ConstructionBond_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConstructionBond_bondNumber_key" ON "ConstructionBond"("bondNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ConstructionBond_assessmentId_key" ON "ConstructionBond"("assessmentId");

-- CreateIndex
CREATE INDEX "ConstructionBond_communityId_idx" ON "ConstructionBond"("communityId");

-- CreateIndex
CREATE INDEX "ConstructionBond_householdId_idx" ON "ConstructionBond"("householdId");

-- CreateIndex
CREATE INDEX "ConstructionBond_status_idx" ON "ConstructionBond"("status");

-- CreateIndex
CREATE INDEX "ConstructionBond_communityId_status_idx" ON "ConstructionBond"("communityId", "status");

-- AddForeignKey
ALTER TABLE "ConstructionBond" ADD CONSTRAINT "ConstructionBond_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConstructionBond" ADD CONSTRAINT "ConstructionBond_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConstructionBond" ADD CONSTRAINT "ConstructionBond_depositRecordedById_fkey" FOREIGN KEY ("depositRecordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConstructionBond" ADD CONSTRAINT "ConstructionBond_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConstructionBond" ADD CONSTRAINT "ConstructionBond_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
