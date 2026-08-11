-- Convert any legacy DECEASED residents to MOVED_OUT before dropping the value.
UPDATE "Resident" SET "status" = 'MOVED_OUT' WHERE "status" = 'DECEASED';

-- AlterEnum
BEGIN;
CREATE TYPE "ResidentStatus_new" AS ENUM ('ACTIVE', 'INACTIVE', 'MOVED_OUT');
ALTER TABLE "public"."Resident" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Resident" ALTER COLUMN "status" TYPE "ResidentStatus_new" USING ("status"::text::"ResidentStatus_new");
ALTER TYPE "ResidentStatus" RENAME TO "ResidentStatus_old";
ALTER TYPE "ResidentStatus_new" RENAME TO "ResidentStatus";
DROP TYPE "public"."ResidentStatus_old";
ALTER TABLE "Resident" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterTable
ALTER TABLE "Resident" ADD COLUMN     "movedOutAt" TIMESTAMP(3);
