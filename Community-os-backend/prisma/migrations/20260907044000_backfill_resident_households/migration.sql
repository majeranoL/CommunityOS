-- Backfill: migrate legacy single-household assignments into the new
-- ResidentHousehold join table so no existing household assignment is lost.
-- Every existing Resident.householdId becomes an ACTIVE, PRIMARY membership,
-- and the resident's primary household is set to that same household.

INSERT INTO "ResidentHousehold" (
  "id", "communityId", "residentId", "householdId",
  "relationshipType", "isPrimary", "startDate", "endDate", "status",
  "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(),
  r."communityId",
  r."id",
  r."householdId",
  CASE r."residentType" WHEN 'RENTER' THEN 'RENTER' ELSE 'OWNER' END::"HouseholdRelationshipType",
  true,
  r."createdAt",
  NULL,
  'ACTIVE',
  now(),
  now()
FROM "Resident" r
WHERE r."householdId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "ResidentHousehold" rh
    WHERE rh."communityId" = r."communityId"
      AND rh."residentId" = r."id"
      AND rh."householdId" = r."householdId"
  );

UPDATE "Resident" r
SET "primaryHouseholdId" = r."householdId"
WHERE r."householdId" IS NOT NULL;