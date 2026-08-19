-- CreateEnum
CREATE TYPE "FeatureAuditAction" AS ENUM ('ASSIGNED', 'ENABLED', 'DISABLED', 'REVOKED', 'CONFIG_UPDATED');

-- AlterTable
ALTER TABLE "Feature" ALTER COLUMN "code" SET DATA TYPE VARCHAR(50);
ALTER TABLE "Feature" ALTER COLUMN "name" SET DATA TYPE VARCHAR(100);

-- CreateTable
CREATE TABLE "FeatureAuditLog" (
    "id" UUID NOT NULL,
    "featureId" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "action" "FeatureAuditAction" NOT NULL,
    "actorId" UUID,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeatureAuditLog_featureId_idx" ON "FeatureAuditLog"("featureId");

-- CreateIndex
CREATE INDEX "FeatureAuditLog_communityId_idx" ON "FeatureAuditLog"("communityId");

-- CreateIndex
CREATE INDEX "FeatureAuditLog_action_idx" ON "FeatureAuditLog"("action");

-- CreateIndex
CREATE INDEX "FeatureAuditLog_createdAt_idx" ON "FeatureAuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "FeatureAuditLog" ADD CONSTRAINT "FeatureAuditLog_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureAuditLog" ADD CONSTRAINT "FeatureAuditLog_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
