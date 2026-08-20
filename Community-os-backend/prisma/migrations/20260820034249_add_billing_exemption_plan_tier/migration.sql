-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('STANDARD', 'CUSTOM');

-- AlterEnum
ALTER TYPE "InvoiceStatus" ADD VALUE 'WAIVED';

-- AlterTable
ALTER TABLE "SubscriptionPlan" ADD COLUMN     "tier" "PlanTier" NOT NULL DEFAULT 'STANDARD';

-- CreateTable
CREATE TABLE "BillingExemption" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "grantedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingExemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BillingExemption_communityId_idx" ON "BillingExemption"("communityId");

-- CreateIndex
CREATE INDEX "BillingExemption_grantedById_idx" ON "BillingExemption"("grantedById");

-- AddForeignKey
ALTER TABLE "BillingExemption" ADD CONSTRAINT "BillingExemption_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingExemption" ADD CONSTRAINT "BillingExemption_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
