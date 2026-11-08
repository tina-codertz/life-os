import {
  type ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { PinoLogger } from 'nestjs-pino';
import { Prisma } from '../../generated/prisma/client.js';
import { AppException } from '../errors/app.exception.js';
import { AllExceptionsFilter, toApiError } from './all-exceptions.filter.js';

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('db says no', { code, clientVersion: 'test' });

describe('toApiError', () => {
  it.each([
    ['Nest NotFoundException', new NotFoundException('Cannot GET /x'), 404, 'NOT_FOUND'],
    ['Nest BadRequestException', new BadRequestException('Bad JSON'), 400, 'VALIDATION_FAILED'],
    ['Nest ForbiddenException', new ForbiddenException(), 403, 'FORBIDDEN'],
    ['Prisma unique violation', prismaError('P2002'), 409, 'CONFLICT'],
    ['Prisma record not found', prismaError('P2025'), 404, 'NOT_FOUND'],
    ['other Prisma error', prismaError('P2003'), 500, 'INTERNAL_ERROR'],
    ['plain Error', new Error('boom'), 500, 'INTERNAL_ERROR'],
    ['thrown string', 'not even an Error', 500, 'INTERNAL_ERROR'],
    ['Nest 503', new ServiceUnavailableException(), 503, 'SERVICE_UNAVAILABLE'],
  ])('maps %s to %i %s', (_name, exception, status, code) => {
    expect(toApiError(exception)).toMatchObject({ status, code });
  });

  it('keeps the code, message and details of an AppException', () => {
    const details = [{ field: 'title', message: 'Required' }];
    const ex = new AppException(HttpStatus.UNPROCESSABLE_ENTITY, 'TASK_TOO_DEEP', 'Nope.', {
      details,
    });
    expect(toApiError(ex)).toEqual({
      status: 422,
      code: 'TASK_TOO_DEEP',
      message: 'Nope.',
      details,
    });
  });

  it.each([
    ['plain Error', new Error('password=hunter2 at db.internal:5432')],
    ['Prisma error', prismaError('P2003')],
    ['5xx HttpException', new ServiceUnavailableException('pool exhausted on db.internal')],
  ])('never sends the internal message of a %s to the client', (_name, exception) => {
    expect(toApiError(exception).message).toBe(
      'Something went wrong on our side. Please try again.',
    );
  });
});

describe('AllExceptionsFilter', () => {
  const logger = { error: vi.fn(), setContext: vi.fn() };
  const filter = new AllExceptionsFilter(logger as unknown as PinoLogger);
  const res = { status: vi.fn(), json: vi.fn(), setHeader: vi.fn() };
  res.status.mockReturnValue(res);
  const host = {
    switchToHttp: () => ({ getRequest: () => ({ id: 'req-123' }), getResponse: () => res }),
  } as unknown as ArgumentsHost;

  beforeEach(() => vi.clearAllMocks());

  it('writes the standard error envelope with the request ID', () => {
    filter.catch(new NotFoundException('Cannot GET /x'), host);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'NOT_FOUND', message: 'Cannot GET /x', details: [], requestId: 'req-123' },
    });
  });

  it("sets an AppException's extra headers, e.g. Retry-After", () => {
    filter.catch(
      new AppException(HttpStatus.TOO_MANY_REQUESTS, 'RATE_LIMITED', 'Slow down.', {
        headers: { 'Retry-After': '120' },
      }),
      host,
    );
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '120');
    expect(res.status).toHaveBeenCalledWith(429);
  });

  it('creates a request ID when the error happened before the logging middleware', () => {
    const early = { setHeader: vi.fn(), status: vi.fn(), json: vi.fn() };
    early.status.mockReturnValue(early);
    const earlyHost = {
      switchToHttp: () => ({ getRequest: () => ({ headers: {} }), getResponse: () => early }),
    } as unknown as ArgumentsHost;

    filter.catch(new NotFoundException(), earlyHost);

    const sentId = early.json.mock.calls[0]?.[0].error.requestId;
    expect(sentId).toMatch(/^[0-9a-f-]{36}$/);
    expect(early.setHeader).toHaveBeenCalledWith('X-Request-Id', sentId);
  });

  it('logs server errors with the original exception', () => {
    const boom = new Error('boom');
    filter.catch(boom, host);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(logger.error).toHaveBeenCalledWith({ err: boom }, 'Server error');
  });

  it('does not log client errors (the request log line already records them)', () => {
    filter.catch(new NotFoundException(), host);
    expect(logger.error).not.toHaveBeenCalled();
  });
});
