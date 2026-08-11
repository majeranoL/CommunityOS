-- CreateTable
CREATE TABLE "Upload" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "uploadedById" UUID NOT NULL,
    "module" VARCHAR(50) NOT NULL DEFAULT 'document',
    "access" VARCHAR(20) NOT NULL DEFAULT 'private',
    "filename" VARCHAR(255) NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    "mimetype" VARCHAR(100) NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Upload_communityId_idx" ON "Upload"("communityId");

-- CreateIndex
CREATE INDEX "Upload_uploadedById_idx" ON "Upload"("uploadedById");

-- CreateIndex
CREATE INDEX "Upload_communityId_createdAt_idx" ON "Upload"("communityId", "createdAt");

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
