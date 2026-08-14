-- Add missing Feature and CommunityFeature tables (schema drift fix)

CREATE TYPE "FeatureType" AS ENUM ('STANDARD', 'OPTIONAL');

CREATE TABLE "Feature" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "FeatureType" NOT NULL DEFAULT 'OPTIONAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "dependencies" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "configSchema" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feature_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunityFeature" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "featureId" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "enabledAt" TIMESTAMP(3),
    "enabledBy" UUID,
    "disabledAt" TIMESTAMP(3),
    "disabledBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityFeature_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Feature_code_key" ON "Feature"("code");
CREATE INDEX "Feature_type_idx" ON "Feature"("type");
CREATE INDEX "Feature_isActive_idx" ON "Feature"("isActive");
CREATE UNIQUE INDEX "CommunityFeature_communityId_featureId_key" ON "CommunityFeature"("communityId", "featureId");
CREATE INDEX "CommunityFeature_communityId_idx" ON "CommunityFeature"("communityId");
CREATE INDEX "CommunityFeature_featureId_idx" ON "CommunityFeature"("featureId");

ALTER TABLE "CommunityFeature"
    ADD CONSTRAINT "CommunityFeature_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityFeature"
    ADD CONSTRAINT "CommunityFeature_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;
