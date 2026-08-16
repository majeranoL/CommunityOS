-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('UTILITIES', 'MAINTENANCE', 'SALARIES', 'SUPPLIES', 'EVENTS', 'SECURITY', 'TAXES', 'INSURANCE', 'TRANSPORTATION', 'OTHER');

-- CreateTable
CREATE TABLE "Expense" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "expenseNumber" VARCHAR(30) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "category" "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
    "amount" DECIMAL(10,2) NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "payee" VARCHAR(200),
    "referenceNumber" VARCHAR(100),
    "notes" TEXT,
    "receiptFileId" UUID,
    "receiptUrl" TEXT,
    "createdById" UUID NOT NULL,
    "isImported" BOOLEAN NOT NULL DEFAULT false,
    "importBatchId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Expense_communityId_idx" ON "Expense"("communityId");

-- CreateIndex
CREATE INDEX "Expense_category_idx" ON "Expense"("category");

-- CreateIndex
CREATE INDEX "Expense_expenseDate_idx" ON "Expense"("expenseDate");

-- CreateIndex
CREATE INDEX "Expense_createdById_idx" ON "Expense"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_communityId_expenseNumber_key" ON "Expense"("communityId", "expenseNumber");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
