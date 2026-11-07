import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { type Env, ENV } from '../config/env.js';
import { genRequestId } from './request-id.js';

@Module({
  imports: [
    // forRootAsync + inject: the logger's options come from our validated config (3.7).
    LoggerModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        pinoHttp: {
          level: env.LOG_LEVEL,
          genReqId: genRequestId,
          // Health is polled every minute by monitors; logging it would bury real traffic.
          autoLogging: { ignore: (req) => req.url?.endsWith('/health') ?? false },
          // Request lines are warn for 4xx and error for 5xx, so a level filter shows problems.
          customLogLevel: (_req, res, err) => {
            if (err || res.statusCode >= 500) return 'error';
            return res.statusCode >= 400 ? 'warn' : 'info';
          },
          // Tokens and cookies must never reach log storage.
          redact: ['req.headers.authorization', 'req.headers.cookie'],
          // Human-readable lines locally; raw JSON everywhere else (for log tools).
          ...(env.NODE_ENV === 'development'
            ? { transport: { target: 'pino-pretty', options: { singleLine: true } } }
            : {}),
        },
      }),
    }),
  ],
})
export class LoggingModule {}
