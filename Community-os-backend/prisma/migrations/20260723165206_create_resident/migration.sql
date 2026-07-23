/*
  Warnings:

  - The `gender` column on the `Resident` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `civilStatus` column on the `Resident` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "CivilStatus" AS ENUM ('SINGLE', 'MARRIED', 'WIDOWED', 'DIVORCED', 'SEPARATED');

-- AlterTable
ALTER TABLE "Resident" ADD COLUMN     "profilePhotoUrl" TEXT,
ADD COLUMN     "remarks" TEXT,
DROP COLUMN "gender",
ADD COLUMN     "gender" "Gender",
DROP COLUMN "civilStatus",
ADD COLUMN     "civilStatus" "CivilStatus";

-- CreateIndex
CREATE INDEX "Resident_communityId_lastName_idx" ON "Resident"("communityId", "lastName");
