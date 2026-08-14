-- AlterTable
ALTER TABLE "ImportBatch" ADD COLUMN "data" JSONB,
ADD COLUMN "processedAt" TIMESTAMP(3);
