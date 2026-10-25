import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppException, ERR, ErrorCode } from './errors';

const STATUS_TO_CODE: Record<number, ErrorCode> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  413: 'PAYLOAD_TOO_LARGE',
  429: 'RATE_LIMITED',
};

/** Turns every error into `{ statusCode, code, message, ...extra }` and hides internals of 5xx errors. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();
    if (response.headersSent) return;

    let status: number = ERR.INTERNAL_ERROR.status;
    let body: Record<string, unknown> = {
      statusCode: status,
      code: 'INTERNAL_ERROR',
      message: ERR.INTERNAL_ERROR.message,
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const payload = exception.getResponse();
      if (
        typeof payload === 'object' &&
        payload !== null &&
        'code' in payload
      ) {
        body = payload as Record<string, unknown>;
      } else {
        const code =
          STATUS_TO_CODE[status] ??
          (status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST');
        body = { statusCode: status, code, message: ERR[code].message };
      }
    } else if (this.isHttpLikeError(exception)) {
      // errors raised by Express middleware (invalid JSON, payload too large, ...)
      status = exception.status ?? exception.statusCode ?? 400;
      const code = STATUS_TO_CODE[status] ?? 'BAD_REQUEST';
      body = { statusCode: status, code, message: ERR[code].message };
    }

    if (status >= 500) {
      if (exception instanceof AppException) {
        // an expected, handled condition (e.g. the map service is down), not a bug
        this.logger.warn(
          `${request.method} ${request.originalUrl} -> ${status} ${exception.code}`,
        );
      } else {
        const error =
          exception instanceof Error ? exception : new Error(String(exception));
        this.logger.error(
          `${request.method} ${request.originalUrl} -> ${status}: ${error.message}`,
          error.stack,
        );
      }
      body = {
        statusCode: status,
        code: body.code ?? 'INTERNAL_ERROR',
        message: body.message,
      };
    }

    response.status(status).json(body);
  }

  private isHttpLikeError(
    error: unknown,
  ): error is { status?: number; statusCode?: number } {
    if (typeof error !== 'object' || error === null) return false;
    const { status, statusCode } = error as {
      status?: unknown;
      statusCode?: unknown;
    };
    const value = typeof status === 'number' ? status : statusCode;
    return typeof value === 'number' && value >= 400 && value < 500;
  }
}
