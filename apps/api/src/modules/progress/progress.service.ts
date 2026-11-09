import { Injectable } from '@nestjs/common';
import {
  activityStreak,
  type ChestReward,
  levelOf,
  localToday,
  type Progress,
  XP,
} from '@life-os/shared';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ChestNotReadyError, dailyChestKey } from './chest.errors.js';
import { XpService } from './xp.service.js';

@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly xp: XpService,
  ) {}

  // The XP total and level, the overall streak (days, in the user's zone, with a habit done or
  // a top-level task completed), and the daily chest.
  async get(userId: string): Promise<Progress> {
    const tz = await this.zone(userId);
    const today = localToday(tz);
    const [sum, days, tasksToday, chest] = await Promise.all([
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
      // A top-level task completed today opens the daily chest.
      this.prisma.$queryRaw<{ n: number }[]>(Prisma.sql`
        SELECT count(*)::int AS "n" FROM "Task"
        WHERE "userId" = ${userId}::uuid AND "status" = 'DONE' AND "deletedAt" IS NULL
          AND "parentId" IS NULL
          AND to_char(("completedAt" AT TIME ZONE ${tz})::date, 'YYYY-MM-DD') = ${today}
      `),
      this.prisma.xpEvent.findUnique({
        where: {
          userId_source_sourceKey: { userId, source: 'CHEST', sourceKey: dailyChestKey(today) },
        },
      }),
    ]);
    const xp = sum._sum.amount ?? 0;
    let dailyChest: Progress['dailyChest'] = 'locked';
    if (chest) dailyChest = 'collected';
    else if ((tasksToday[0]?.n ?? 0) > 0) dailyChest = 'ready';
    return {
      xp,
      streak: activityStreak(
        days.map((d) => d.day),
        today,
      ),
      level: levelOf(xp),
      dailyChest,
    };
  }

  // +40 XP once a day, after a task is completed. Safe to repeat: the ledger pays a key once.
  // Once collected it stays collected, even if that task is later marked not done.
  async collectDailyChest(userId: string): Promise<ChestReward> {
    const before = await this.get(userId);
    if (before.dailyChest === 'locked') throw new ChestNotReadyError('daily');
    const today = localToday(await this.zone(userId));
    await this.prisma.$transaction((tx) =>
      this.xp.award(tx, userId, 'CHEST', dailyChestKey(today)),
    );
    return { amount: XP.CHEST, progress: await this.get(userId) };
  }

  private async zone(userId: string): Promise<string> {
    const settings = await this.prisma.userSettings.findUnique({ where: { userId } });
    return settings?.timezone ?? 'UTC';
  }
}
