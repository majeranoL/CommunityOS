-- Add the soft-delete column to "Pet".
-- The baseline migration (20260814120000_add_pets_feature_gating) never
-- created it; it only existed locally after a `prisma db push`. This makes
-- the recorded migration history match the Prisma schema (Pet.deletedAt).
-- "IF NOT EXISTS" keeps it safe on databases that already have the column.
ALTER TABLE "Pet" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
