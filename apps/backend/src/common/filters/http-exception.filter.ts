import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

interface PrismaClientError {
  code?: string;
  meta?: Record<string, unknown>;
  message?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = (responseObj.message as string) || message;
        errors = responseObj.errors as Record<string, unknown> | undefined;
      }
    } else {
      const err = exception as Error & PrismaClientError & { type?: string; status?: number; statusCode?: number };
      message = err.message || message;

      if (typeof err.status === 'number') {
        status = err.status;
      } else if (typeof err.statusCode === 'number') {
        status = err.statusCode;
      }

      if (err.type === 'entity.too.large') {
        status = HttpStatus.PAYLOAD_TOO_LARGE;
      }

      if (err.code && err.code.startsWith('P')) {
        status = this.mapPrismaErrorCode(err.code);
        message = this.mapPrismaErrorMessage(err.code, err.meta) || message;
      }

      if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
        this.logger.error(`Unhandled error: ${err.message} (status: ${status}, type: ${err.type || 'unknown'}, code: ${err.code || 'none'})`, err.stack);
      }
    }

    try {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();
      if (typeof response?.status === 'function') {
        response.status(status).json({
          success: false,
          statusCode: status,
          message,
          errors,
          timestamp: new Date().toISOString(),
        });
        return;
      }
    } catch {
      // Non-HTTP context (websocket, queue worker, etc.) — skip response
    }

    this.logger.warn(`Exception in non-HTTP context: ${message} (${status})`);
  }

  private mapPrismaErrorCode(code: string): HttpStatus {
    switch (code) {
      case 'P2000': return HttpStatus.BAD_REQUEST;
      case 'P2001': return HttpStatus.NOT_FOUND;
      case 'P2002': return HttpStatus.CONFLICT;
      case 'P2003': return HttpStatus.BAD_REQUEST;
      case 'P2004': return HttpStatus.CONFLICT;
      case 'P2005': return HttpStatus.BAD_REQUEST;
      case 'P2011': return HttpStatus.BAD_REQUEST;
      case 'P2014': return HttpStatus.BAD_REQUEST;
      case 'P2025': return HttpStatus.NOT_FOUND;
      case 'P2023': return HttpStatus.BAD_REQUEST;
      default: return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }

  private mapPrismaErrorMessage(code: string, meta?: Record<string, unknown>): string | null {
    const field = meta?.target || meta?.field_name || '';
    switch (code) {
      case 'P2000': return `Value too long for column${field ? `: ${field}` : ''}`;
      case 'P2001': return `Record not found${field ? `: ${field}` : ''}`;
      case 'P2002': return `Unique constraint violation${field ? `: ${field}` : ''}`;
      case 'P2003': return `Foreign key constraint failed${field ? `: ${field}` : ''}`;
      case 'P2025': return 'Record not found';
      default: return null;
    }
  }
}