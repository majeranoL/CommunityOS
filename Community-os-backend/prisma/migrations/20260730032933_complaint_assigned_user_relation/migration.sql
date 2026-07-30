/*
  Warnings:

  - You are about to drop the column `assignedTo` on the `Complaint` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Complaint" DROP COLUMN "assignedTo",
ADD COLUMN     "assignedToId" UUID,
ADD COLUMN     "resolutionRemarks" TEXT;

-- CreateIndex
CREATE INDEX "Complaint_assignedToId_idx" ON "Complaint"("assignedToId");

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
