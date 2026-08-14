-- Baseline migration recording the Pet feature-gated tables that were
-- previously applied to the database via `prisma db push`.

-- CreateEnum
CREATE TYPE "PetSpecies" AS ENUM ('DOG', 'CAT', 'BIRD', 'FISH', 'REPTILE', 'SMALL_ANIMAL', 'OTHER');

-- CreateEnum
CREATE TYPE "PetStatus" AS ENUM ('PENDING', 'APPROVED', 'ACTIVE', 'REJECTED', 'DEACTIVATED', 'INACTIVE');

-- CreateTable
CREATE TABLE "Pet" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "householdId" UUID NOT NULL,
    "residentId" UUID,
    "petNumber" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "species" "PetSpecies" NOT NULL DEFAULT 'DOG',
    "breed" VARCHAR(100),
    "sex" VARCHAR(20),
    "color" VARCHAR(50),
    "birthDate" TIMESTAMP(3),
    "photoUrl" VARCHAR(500),
    "registrationNumber" VARCHAR(50),
    "microchipNumber" VARCHAR(50),
    "vaccinationCertificateUrl" VARCHAR(500),
    "rabiesCertificateUrl" VARCHAR(500),
    "veterinaryCertificateUrl" VARCHAR(500),
    "remarks" TEXT,
    "status" "PetStatus" NOT NULL DEFAULT 'ACTIVE',
    "verifiedById" UUID,
    "verifiedAt" TIMESTAMP(3),
    "verificationRemarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pet_communityId_petNumber_key" ON "Pet"("communityId", "petNumber");

-- CreateIndex
CREATE INDEX "Pet_communityId_idx" ON "Pet"("communityId");

-- CreateIndex
CREATE INDEX "Pet_householdId_idx" ON "Pet"("householdId");

-- CreateIndex
CREATE INDEX "Pet_residentId_idx" ON "Pet"("residentId");

-- CreateIndex
CREATE INDEX "Pet_status_idx" ON "Pet"("status");

-- AddForeignKey
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
