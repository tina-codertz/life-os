-- Goals (FR-GOAL-001…006, docs/05). Additive only: new tables, enums and a nullable Task.goalId.

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "ProgressMode" AS ENUM ('MILESTONES', 'TASKS', 'MANUAL');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "goalId" UUID;

-- CreateTable
CREATE TABLE "Goal" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(5000),
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "progressMode" "ProgressMode" NOT NULL DEFAULT 'MILESTONES',
    "manualProgress" SMALLINT,
    "targetDate" DATE,
    "completedAt" TIMESTAMPTZ(3),
    "categoryId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" UUID NOT NULL,
    "goalId" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "dueDate" DATE,
    "completedAt" TIMESTAMPTZ(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalHabit" (
    "goalId" UUID NOT NULL,
    "habitId" UUID NOT NULL,

    CONSTRAINT "GoalHabit_pkey" PRIMARY KEY ("goalId","habitId")
);

-- CreateIndex
CREATE INDEX "Goal_userId_status_targetDate_idx" ON "Goal"("userId", "status", "targetDate");

-- CreateIndex
CREATE INDEX "Milestone_goalId_sortOrder_idx" ON "Milestone"("goalId", "sortOrder");

-- CreateIndex
CREATE INDEX "GoalHabit_habitId_idx" ON "GoalHabit"("habitId");

-- CreateIndex
CREATE INDEX "Task_goalId_idx" ON "Task"("goalId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalHabit" ADD CONSTRAINT "GoalHabit_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalHabit" ADD CONSTRAINT "GoalHabit_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Manual progress is a percentage (docs/05 §4); the API checks it too.
ALTER TABLE "Goal" ADD CONSTRAINT goal_manual_progress CHECK ("manualProgress" IS NULL OR "manualProgress" BETWEEN 0 AND 100);
