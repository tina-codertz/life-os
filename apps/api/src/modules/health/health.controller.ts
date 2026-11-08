import { Controller, Get, HttpStatus } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Public } from '../auth/public.decorator.js';

export interface HealthResponse {
  status: 'ok';
  db: 'ok';
}

// Used by uptime monitors and the Docker healthcheck.
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<HealthResponse> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (err) {
      // 503 tells the monitor "up but not able to serve". The cause goes to the logs only.
      throw new AppException(
        HttpStatus.SERVICE_UNAVAILABLE,
        'SERVICE_UNAVAILABLE',
        'The database is unavailable.',
        { cause: err },
      );
    }
    return { status: 'ok', db: 'ok' };
  }
}
