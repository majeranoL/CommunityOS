-- Reconcile migration history with the live dev database and add Vehicle.hasSticker.
-- "photoUrl" / "attachmentFileIds" were previously applied out-of-band via `prisma db push`;
-- "IF NOT EXISTS" keeps this safe on databases that already have these columns.
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "photoUrl" VARCHAR(500);
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "hasSticker" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Complaint" ADD COLUMN IF NOT EXISTS "attachmentFileIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Maintenance" ADD COLUMN IF NOT EXISTS "attachmentFileIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
