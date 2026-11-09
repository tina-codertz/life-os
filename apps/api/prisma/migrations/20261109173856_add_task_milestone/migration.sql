-- A task can be a step of one of its goal's milestones ("Due 28 Nov · 3 tasks"). Additive: a nullable
-- column; deleting a milestone leaves its tasks on the goal (SET NULL).

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "milestoneId" UUID;

-- CreateIndex
CREATE INDEX "Task_milestoneId_idx" ON "Task"("milestoneId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
