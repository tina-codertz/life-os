import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { type Env, ENV } from '../config/env.js';
import { PrismaClient } from '../generated/prisma/client.js';

// One PrismaClient (and connection pool) for the whole app, shared through DI.
// Connections open lazily on the first query, so the app can start even if the DB is briefly down.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(@Inject(ENV) env: Env) {
    super({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
