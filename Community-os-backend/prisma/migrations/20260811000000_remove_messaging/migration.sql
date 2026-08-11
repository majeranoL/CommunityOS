-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_communityId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_recipientId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_senderId_fkey";

-- DropTable
DROP TABLE "Message";

-- DropEnum
DROP TYPE "MessageStatus";
