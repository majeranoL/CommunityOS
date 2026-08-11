-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('REGISTER');

-- CreateTable
CREATE TABLE "OtpVerification" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "purpose" "OtpPurpose" NOT NULL DEFAULT 'REGISTER',
    "code" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OtpVerification_email_purpose_idx" ON "OtpVerification"("email", "purpose");

-- CreateIndex
CREATE INDEX "OtpVerification_expiresAt_idx" ON "OtpVerification"("expiresAt");