-- CreateEnum
CREATE TYPE "VisitorCategory" AS ENUM ('ONE_TIME', 'RECURRING', 'SERVICE_PROVIDER', 'CONTRACTOR', 'DELIVERY', 'OTHER');

-- AlterTable
ALTER TABLE "Visitor" ADD COLUMN     "category" "VisitorCategory" NOT NULL DEFAULT 'ONE_TIME';

-- CreateIndex
CREATE INDEX "Visitor_category_idx" ON "Visitor"("category");
