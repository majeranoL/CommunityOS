-- Record paid CommunityOS subscriptions as HOA expenses so the community
-- can see subscription spend in their finances.
--
-- 1. Add SUBSCRIPTION to the ExpenseCategory enum.
-- 2. Link generated expenses to their source subscription invoice so the
--    deduction is idempotent (webhook retries cannot double-create).

-- AlterTable
ALTER TYPE "ExpenseCategory" ADD VALUE 'SUBSCRIPTION';

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "subscriptionInvoiceId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "Expense_subscriptionInvoiceId_key" ON "Expense"("subscriptionInvoiceId");

-- DropIndex
-- Align with current schema: gatewayInvoiceId is no longer indexed on Invoice.
DROP INDEX "Invoice_gatewayInvoiceId_idx";