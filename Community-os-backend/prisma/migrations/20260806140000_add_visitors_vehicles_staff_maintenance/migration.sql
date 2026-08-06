-- CreateEnum
CREATE TYPE "VisitorStatus" AS ENUM ('EXPECTED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('CAR', 'MOTORCYCLE', 'TRUCK', 'VAN', 'BICYCLE', 'OTHER');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('SECURITY', 'MAINTENANCE', 'CLEANING', 'ADMIN', 'OTHER');

-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "MaintenanceCategory" AS ENUM ('ELECTRICAL', 'PLUMBING', 'LANDSCAPING', 'STRUCTURAL', 'ROADS', 'FACILITY', 'CLEANING', 'OTHER');

-- CreateEnum
CREATE TYPE "MaintenancePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Visitor" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "hostResidentId" UUID,
    "vehicleId" UUID,
    "name" VARCHAR(100) NOT NULL,
    "phoneNumber" VARCHAR(20),
    "purpose" TEXT,
    "remarks" TEXT,
    "entryAt" TIMESTAMP(3),
    "exitAt" TIMESTAMP(3),
    "status" "VisitorStatus" NOT NULL DEFAULT 'EXPECTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Visitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "residentId" UUID,
    "plateNumber" VARCHAR(20) NOT NULL,
    "make" VARCHAR(50),
    "model" VARCHAR(50),
    "color" VARCHAR(30),
    "type" "VehicleType" NOT NULL DEFAULT 'CAR',
    "parkingStickerNumber" VARCHAR(30),
    "status" "VehicleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "staffNumber" VARCHAR(30) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "middleName" VARCHAR(100),
    "lastName" VARCHAR(100) NOT NULL,
    "role" "StaffRole" NOT NULL DEFAULT 'SECURITY',
    "phoneNumber" VARCHAR(20),
    "email" VARCHAR(255),
    "hireDate" TIMESTAMP(3),
    "notes" TEXT,
    "status" "StaffStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Maintenance" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "maintenanceNumber" VARCHAR(30) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "category" "MaintenanceCategory" NOT NULL,
    "priority" "MaintenancePriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'OPEN',
    "facilityId" UUID,
    "assignedToId" UUID,
    "cost" DECIMAL(10,2),
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Visitor_communityId_idx" ON "Visitor"("communityId");

-- CreateIndex
CREATE INDEX "Visitor_hostResidentId_idx" ON "Visitor"("hostResidentId");

-- CreateIndex
CREATE INDEX "Visitor_vehicleId_idx" ON "Visitor"("vehicleId");

-- CreateIndex
CREATE INDEX "Visitor_status_idx" ON "Visitor"("status");

-- CreateIndex
CREATE INDEX "Visitor_entryAt_idx" ON "Visitor"("entryAt");

-- CreateIndex
CREATE INDEX "Vehicle_communityId_idx" ON "Vehicle"("communityId");

-- CreateIndex
CREATE INDEX "Vehicle_residentId_idx" ON "Vehicle"("residentId");

-- CreateIndex
CREATE INDEX "Vehicle_status_idx" ON "Vehicle"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_communityId_plateNumber_key" ON "Vehicle"("communityId", "plateNumber");

-- CreateIndex
CREATE INDEX "Staff_communityId_idx" ON "Staff"("communityId");

-- CreateIndex
CREATE INDEX "Staff_status_idx" ON "Staff"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_communityId_staffNumber_key" ON "Staff"("communityId", "staffNumber");

-- CreateIndex
CREATE INDEX "Maintenance_communityId_idx" ON "Maintenance"("communityId");

-- CreateIndex
CREATE INDEX "Maintenance_facilityId_idx" ON "Maintenance"("facilityId");

-- CreateIndex
CREATE INDEX "Maintenance_assignedToId_idx" ON "Maintenance"("assignedToId");

-- CreateIndex
CREATE INDEX "Maintenance_status_idx" ON "Maintenance"("status");

-- CreateIndex
CREATE INDEX "Maintenance_priority_idx" ON "Maintenance"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "Maintenance_communityId_maintenanceNumber_key" ON "Maintenance"("communityId", "maintenanceNumber");

-- AddForeignKey
ALTER TABLE "Visitor" ADD CONSTRAINT "Visitor_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visitor" ADD CONSTRAINT "Visitor_hostResidentId_fkey" FOREIGN KEY ("hostResidentId") REFERENCES "Resident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visitor" ADD CONSTRAINT "Visitor_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Maintenance" ADD CONSTRAINT "Maintenance_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Maintenance" ADD CONSTRAINT "Maintenance_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Maintenance" ADD CONSTRAINT "Maintenance_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
