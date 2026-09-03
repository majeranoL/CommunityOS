-- Add MAYA payment method and the flexible PaymentMethodConfig table.
-- A config stores, for a given owner (platform-wide OR a single community) and
-- wallet method (GCash / Maya / bank), either a QR image or an account number
-- (or both), plus display mode and instructions.

-- Enum: add MAYA to the recorded payment method
ALTER TYPE "PaymentMethod" ADD VALUE 'MAYA';

-- Enums for the config table
CREATE TYPE "PaymentMethodConfigMethod" AS ENUM ('GCASH', 'MAYA', 'BANK_TRANSFER');
CREATE TYPE "PaymentMethodConfigDisplay" AS ENUM ('QR', 'NUMBER', 'BOTH');

-- Config table. communityId NULL = platform-wide (superadmin-managed, used for
-- subscription payments). communityId set = that HOA's resident-dues method.
CREATE TABLE "PaymentMethodConfig" (
  "id" UUID NOT NULL,
  "communityId" UUID,
  "method" "PaymentMethodConfigMethod" NOT NULL,
  "displayMode" "PaymentMethodConfigDisplay" NOT NULL DEFAULT 'QR',
  "accountName" VARCHAR(120),
  "accountNumber" VARCHAR(60),
  "qrFileId" UUID,
  "qrUrl" TEXT,
  "instructions" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PaymentMethodConfig_pkey" PRIMARY KEY ("id")
);

-- Unique per owner + method
CREATE UNIQUE INDEX "PaymentMethodConfig_communityId_method_key" ON "PaymentMethodConfig"("communityId", "method");
CREATE INDEX "PaymentMethodConfig_communityId_isActive_idx" ON "PaymentMethodConfig"("communityId", "isActive");

-- FK to community (cascade). NULL communityId rows (platform-wide) are allowed.
ALTER TABLE "PaymentMethodConfig" ADD CONSTRAINT "PaymentMethodConfig_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;