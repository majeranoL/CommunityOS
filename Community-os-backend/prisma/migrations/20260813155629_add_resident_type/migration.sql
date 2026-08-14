-- CreateEnum
CREATE TYPE "ResidentType" AS ENUM ('OWNER', 'RENTER');

-- AlterTable
ALTER TABLE "Resident" ADD COLUMN     "residentType" "ResidentType" NOT NULL DEFAULT 'OWNER';
