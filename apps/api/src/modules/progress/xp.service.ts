import { Injectable } from '@nestjs/common';
import { XP, type XpSource } from '@life-os/shared';
import type { Prisma } from '../../generated/prisma/client.js';

// Awards and takes back XP inside the caller's transaction, so points and the thing that earned
// them are saved together or not at all. Awards are keyed: the same key never pays twice.
@Injectable()
export class XpService {
  async award(tx: Prisma.TransactionClient, userId: string, source: XpSource, key: string) {
    await tx.xpEvent.upsert({
      where: { userId_source_sourceKey: { userId, source, sourceKey: key } },
      create: { userId, source, sourceKey: key, amount: XP[source] },
      update: {},
    });
  }

  async revoke(tx: Prisma.TransactionClient, userId: string, source: XpSource, key: string) {
    await tx.xpEvent.deleteMany({ where: { userId, source, sourceKey: key } });
  }
}
