-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "recurrenceRule" VARCHAR(200),
ADD COLUMN     "recurrenceSeriesId" UUID;

-- CreateIndex
CREATE INDEX "Task_recurrenceSeriesId_idx" ON "Task"("recurrenceSeriesId");
