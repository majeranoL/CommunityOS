-- CreateTable
CREATE TABLE "GoodStandingQR" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "householdId" UUID NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "standing" VARCHAR(10) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" UUID,

    CONSTRAINT "GoodStandingQR_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoodStandingQR_token_key" ON "GoodStandingQR"("token");

-- CreateIndex
CREATE INDEX "GoodStandingQR_communityId_householdId_idx" ON "GoodStandingQR"("communityId", "householdId");

-- CreateIndex
CREATE INDEX "GoodStandingQR_householdId_expiresAt_idx" ON "GoodStandingQR"("householdId", "expiresAt");

-- CreateIndex
CREATE INDEX "GoodStandingQR_expiresAt_idx" ON "GoodStandingQR"("expiresAt");

-- AddForeignKey
ALTER TABLE "GoodStandingQR" ADD CONSTRAINT "GoodStandingQR_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodStandingQR" ADD CONSTRAINT "GoodStandingQR_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
