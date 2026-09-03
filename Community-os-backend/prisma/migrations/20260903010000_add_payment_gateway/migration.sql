-- Add online-payment gateway fields and gateway lifecycle statuses.

-- Enums: add gateway lifecycle statuses / payment method
ALTER TYPE "PaymentStatus" ADD VALUE 'PROCESSING';
ALTER TYPE "PaymentStatus" ADD VALUE 'FAILED';
ALTER TYPE "PaymentStatus" ADD VALUE 'EXPIRED';
ALTER TYPE "PaymentMethod" ADD VALUE 'ONLINE';
ALTER TYPE "InvoiceStatus" ADD VALUE 'PROCESSING';

-- Payment gateway metadata
ALTER TABLE "Payment" ADD COLUMN "gatewayProvider" VARCHAR(50);
ALTER TABLE "Payment" ADD COLUMN "gatewayId" VARCHAR(100);
ALTER TABLE "Payment" ADD COLUMN "checkoutUrl" TEXT;
ALTER TABLE "Payment" ADD COLUMN "gatewayMeta" JSONB;
ALTER TABLE "Payment" ADD COLUMN "paidAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN "expiresAt" TIMESTAMP(3);
CREATE INDEX "Payment_gatewayId_idx" ON "Payment"("gatewayId");

-- Invoice gateway metadata
ALTER TABLE "Invoice" ADD COLUMN "gatewayProvider" VARCHAR(50);
ALTER TABLE "Invoice" ADD COLUMN "gatewayInvoiceId" VARCHAR(100);
ALTER TABLE "Invoice" ADD COLUMN "checkoutUrl" TEXT;
CREATE INDEX "Invoice_gatewayInvoiceId_idx" ON "Invoice"("gatewayInvoiceId");