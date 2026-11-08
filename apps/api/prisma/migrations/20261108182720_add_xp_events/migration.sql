-- CreateEnum
CREATE TYPE "XpSource" AS ENUM ('TASK', 'HABIT', 'CHEST');

-- CreateTable
CREATE TABLE "XpEvent" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "source" "XpSource" NOT NULL,
    "sourceKey" VARCHAR(80) NOT NULL,
    "amount" SMALLINT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XpEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "XpEvent_userId_source_sourceKey_key" ON "XpEvent"("userId", "source", "sourceKey");

-- AddForeignKey
ALTER TABLE "XpEvent" ADD CONSTRAINT "XpEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
