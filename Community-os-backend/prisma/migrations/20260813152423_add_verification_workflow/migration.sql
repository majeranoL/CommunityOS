-- AlterEnum
ALTER TYPE "ResidentStatus" ADD VALUE 'PENDING';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "VehicleStatus" ADD VALUE 'PENDING';
ALTER TYPE "VehicleStatus" ADD VALUE 'APPROVED';
ALTER TYPE "VehicleStatus" ADD VALUE 'REJECTED';
ALTER TYPE "VehicleStatus" ADD VALUE 'DEACTIVATED';
ALTER TYPE "VehicleStatus" ADD VALUE 'TRANSFERRED';
