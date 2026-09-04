-- AlterTable
ALTER TABLE "Community" ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspensionReason" VARCHAR(50);
