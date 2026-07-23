-- CreateEnum
CREATE TYPE "ResidentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MOVED_OUT', 'DECEASED');

-- CreateTable
CREATE TABLE "Resident" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "residentNumber" VARCHAR(30) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "middleName" VARCHAR(100),
    "lastName" VARCHAR(100) NOT NULL,
    "suffix" VARCHAR(20),
    "birthDate" TIMESTAMP(3),
    "gender" VARCHAR(20),
    "civilStatus" VARCHAR(30),
    "phoneNumber" VARCHAR(20),
    "email" VARCHAR(255),
    "block" VARCHAR(20),
    "lot" VARCHAR(20),
    "street" VARCHAR(100),
    "address" TEXT,
    "status" "ResidentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Resident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Resident_residentNumber_key" ON "Resident"("residentNumber");

-- CreateIndex
CREATE INDEX "Resident_communityId_idx" ON "Resident"("communityId");

-- CreateIndex
CREATE INDEX "Resident_residentNumber_idx" ON "Resident"("residentNumber");

-- CreateIndex
CREATE INDEX "Resident_lastName_idx" ON "Resident"("lastName");

-- CreateIndex
CREATE INDEX "Resident_status_idx" ON "Resident"("status");

-- AddForeignKey
ALTER TABLE "Resident" ADD CONSTRAINT "Resident_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
