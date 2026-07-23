/*
  Warnings:

  - The `gender` column on the `Resident` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `civilStatus` column on the `Resident` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Resident" DROP COLUMN "gender",
ADD COLUMN     "gender" "Gender",
DROP COLUMN "civilStatus",
ADD COLUMN     "civilStatus" "CivilStatus";
