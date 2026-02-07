import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/nestjs';

interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | string[];
  error?: string;
  correlationId?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId =
      (request.headers['x-correlation-id'] as string) ||
      `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let status: number;
    let message: string | string[];
    let error: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message =
          (responseObj.message as string | string[]) || exception.message;
        error = responseObj.error as string;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message =
        process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : exception.message;
      error = 'Internal Server Error';

      // Report to Sentry + log the full error (but don't expose to client)
      Sentry.captureException(exception, {
        extra: { correlationId, path: request.url, method: request.method },
      });
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
        { correlationId, path: request.url },
      );
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'Internal Server Error';

      this.logger.error(
        `Unknown exception type: ${JSON.stringify(exception)}`,
        undefined,
        { correlationId, path: request.url },
      );
    }

    const errorResponse: ErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      correlationId,
    };

    if (error) {
      errorResponse.error = error;
    }

    // Log all errors (structured logging)
    const logLevel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'log';
    this.logger[logLevel]({
      ...errorResponse,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    });

    response.status(status).json(errorResponse);
  }
}
