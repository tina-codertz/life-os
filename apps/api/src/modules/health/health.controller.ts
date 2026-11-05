import { Controller, Get } from '@nestjs/common';

export interface HealthResponse {
  status: 'ok';
}

// Used by uptime monitors and the Docker healthcheck. A database ping is added in step 3.6.
@Controller('health')
export class HealthController {
  @Get()
  check(): HealthResponse {
    return { status: 'ok' };
  }
}
