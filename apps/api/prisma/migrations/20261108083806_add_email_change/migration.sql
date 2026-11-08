-- AlterEnum
ALTER TYPE "AuthTokenType" ADD VALUE 'EMAIL_CHANGE';

-- AlterTable
ALTER TABLE "AuthToken" ADD COLUMN     "newEmail" TEXT;
