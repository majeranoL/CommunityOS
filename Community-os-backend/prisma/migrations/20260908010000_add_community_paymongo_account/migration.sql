CREATE TABLE "CommunityPayMongoAccount" (
  "id" UUID NOT NULL,
  "communityId" UUID NOT NULL,
  "secretKey" TEXT NOT NULL,
  "webhookSecret" TEXT,
  "accountName" VARCHAR(120),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CommunityPayMongoAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommunityPayMongoAccount_communityId_key"
  ON "CommunityPayMongoAccount"("communityId");

ALTER TABLE "CommunityPayMongoAccount"
  ADD CONSTRAINT "CommunityPayMongoAccount_communityId_fkey"
  FOREIGN KEY ("communityId") REFERENCES "Community"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
