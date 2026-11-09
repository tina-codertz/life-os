-- AlterTable
ALTER TABLE "Habit" ADD COLUMN     "reminderTimes" SMALLINT[] DEFAULT ARRAY[]::SMALLINT[];
