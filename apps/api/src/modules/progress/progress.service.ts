import { Injectable } from '@nestjs/common';
import { activityStreak, localToday, type Progress } from '@life-os/shared';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  // The XP total and the overall streak: days (in the user's zone) with a habit done or a
  // top-level task completed.
  async get(userId: string): Promise<Progress> {
    const settings = await this.prisma.userSettings.findUnique({ where: { userId } });
    const tz = settings?.timezone ?? 'UTC';
    const [sum, days] = await Promise.all([
      this.prisma.xpEvent.aggregate({ where: { userId }, _sum: { amount: true } }),
      this.prisma.$queryRaw<{ day: string }[]>(Prisma.sql`
        SELECT to_char(c."localDate", 'YYYY-MM-DD') AS "day"
        FROM "HabitCompletion" c JOIN "Habit" h ON h."id" = c."habitId"
        WHERE c."userId" = ${userId}::uuid AND h."deletedAt" IS NULL AND c."count" >= h."targetCount"
        UNION
        SELECT to_char(("completedAt" AT TIME ZONE ${tz})::date, 'YYYY-MM-DD')
        FROM "Task"
        WHERE "userId" = ${userId}::uuid AND "status" = 'DONE' AND "deletedAt" IS NULL
          AND "parentId" IS NULL AND "completedAt" IS NOT NULL
      `),
    ]);
    return {
      xp: sum._sum.amount ?? 0,
      streak: activityStreak(
        days.map((d) => d.day),
        localToday(tz),
      ),
    };
  }
}
