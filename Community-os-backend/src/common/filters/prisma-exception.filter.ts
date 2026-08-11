import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch()
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  private capture(
    exception: unknown,
    request: Request,
    response: Response,
  ): void {
    if (!process.env.SENTRY_DSN) {
      return;
    }

    const requestId = response.getHeader('x-request-id');

    Sentry.captureException(
      exception instanceof Error ? exception : new Error(String(exception)),
      {
        tags: {
          requestId: typeof requestId === 'string' ? requestId : 'unknown',
        },
        extra: {
          method: request.method,
          url: request.url,
        },
      },
    );
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      if (status >= 500) {
        this.capture(exception, request, response);
      }

      response
        .status(status)
        .json(
          typeof body === 'string'
            ? { success: false, statusCode: status, message: body }
            : { ...body, success: false },
        );

      return;
    }

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002': {
          const target = exception.meta?.target;
          const fields = Array.isArray(target)
            ? target.join(', ')
            : typeof target === 'string'
              ? target
              : '';

          status = HttpStatus.CONFLICT;
          message = fields
            ? `Duplicate entry for ${fields}.`
            : 'Duplicate entry.';
          break;
        }
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Record not found.';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          message = 'Related record does not exist.';
          break;
        default:
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          message = 'Database error occurred.';
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid request data.';
    }

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
      this.capture(exception, request, response);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
