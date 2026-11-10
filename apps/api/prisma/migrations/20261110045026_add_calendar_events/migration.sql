-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "durationMinutes" SMALLINT;

-- CreateTable
CREATE TABLE "Event" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "notes" VARCHAR(5000),
    "location" VARCHAR(200),
    "color" VARCHAR(20) NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "startTime" SMALLINT,
    "endTime" SMALLINT,
    "recurrenceRule" VARCHAR(200),
    "recurrenceUntil" DATE,
    "reminderMinutes" SMALLINT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_userId_startDate_idx" ON "Event"("userId", "startDate");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Rules Prisma can't express (docs/05 §4); the API checks them too.
ALTER TABLE "Task" ADD CONSTRAINT task_duration_range CHECK ("durationMinutes" IS NULL OR ("dueTime" IS NOT NULL AND "durationMinutes" BETWEEN 5 AND 720));
ALTER TABLE "Event" ADD CONSTRAINT event_times_paired CHECK (("startTime" IS NULL) = ("endTime" IS NULL));
ALTER TABLE "Event" ADD CONSTRAINT event_time_range CHECK ("startTime" IS NULL OR ("startTime" BETWEEN 0 AND 1439 AND "endTime" BETWEEN 0 AND 1439));
ALTER TABLE "Event" ADD CONSTRAINT event_end_after_start CHECK ("endDate" > "startDate" OR ("endDate" = "startDate" AND ("startTime" IS NULL OR "endTime" > "startTime")));
