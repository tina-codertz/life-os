import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { ApiErrorBody, ApiErrorDetail } from '@life-os/shared';
import type { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { Prisma } from '../../generated/prisma/client.js';
import { genRequestId } from '../../logging/request-id.js';
import { AppException } from '../errors/app.exception.js';

export interface MappedError {
  status: number;
  code: string;
  message: string;
  details: ApiErrorDetail[];
}

// Default code for a status when the exception doesn't carry its own (docs/06 §1).
const CODE_BY_STATUS: Partial<Record<number, string>> = {
  400: 'VALIDATION_FAILED',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  422: 'BUSINESS_RULE_VIOLATION',
  429: 'RATE_LIMITED',
  503: 'SERVICE_UNAVAILABLE',
};

const INTERNAL_ERROR: MappedError = {
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  code: 'INTERNAL_ERROR',
  message: 'Something went wrong on our side. Please try again.',
  details: [],
};

// Turns anything thrown anywhere into a status + safe client-facing body.
export function toApiError(exception: unknown): MappedError {
  if (exception instanceof AppException) {
    return {
      status: exception.getStatus(),
      code: exception.code,
      message: exception.message,
      details: exception.details,
    };
  }

  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    // A 5xx message may describe internals; only client errors keep their message.
    if (status >= 500) {
      return { ...INTERNAL_ERROR, status, code: CODE_BY_STATUS[status] ?? INTERNAL_ERROR.code };
    }
    return {
      status,
      code: CODE_BY_STATUS[status] ?? 'BAD_REQUEST',
      message: exception.message,
      details: [],
    };
  }

  // Prisma errors that are really client mistakes. Services can still catch these
  // first to throw something more specific (e.g. EMAIL_TAKEN).
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    if (exception.code === 'P2002') {
      return {
        status: HttpStatus.CONFLICT,
        code: 'CONFLICT',
        message: 'A record with these values already exists.',
        details: [],
      };
    }
    if (exception.code === 'P2025') {
      return {
        status: HttpStatus.NOT_FOUND,
        code: 'NOT_FOUND',
        message: 'Record not found.',
        details: [],
      };
    }
  }

  return INTERNAL_ERROR;
}

// @Catch() with no arguments = catch everything, so no error can leave in another shape.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  // Plain PinoLogger + setContext, not @InjectPinoLogger: that decorator only works for
  // classes imported before LoggingModule, a trap that bit SessionService in 4.5.
  constructor(private readonly logger: PinoLogger) {
    logger.setContext(AllExceptionsFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const { status, code, message, details } = toApiError(exception);

    if (status >= 500) {
      // The real error and stack go to the logs only (tagged with the request ID).
      this.logger.error({ err: exception }, 'Server error');
    }

    // Errors thrown before the logging middleware ran (e.g. a malformed JSON body is rejected
    // by the body parser first) have no ID yet, so create one here; it also sets the header.
    const requestId = typeof req.id === 'string' ? req.id : genRequestId(req, res);
    const body: ApiErrorBody = { error: { code, message, details, requestId } };
    if (exception instanceof AppException) {
      for (const [name, value] of Object.entries(exception.headers)) res.setHeader(name, value);
    }
    res.status(status).json(body);
  }
}
