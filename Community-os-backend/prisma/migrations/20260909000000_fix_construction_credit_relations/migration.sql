ALTER TABLE "HouseholdCredit"
ADD COLUMN "requestId" UUID;

CREATE UNIQUE INDEX "HouseholdCredit_requestId_key" ON "HouseholdCredit"("requestId");

ALTER TABLE "HouseholdCredit" ADD CONSTRAINT "HouseholdCredit_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ConstructionRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;