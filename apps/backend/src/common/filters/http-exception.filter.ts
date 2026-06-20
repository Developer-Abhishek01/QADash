import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

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
    } else if (exception instanceof Error) {
      message = exception.message;
      // Express body-parser errors (e.g., "request entity too large") have a .status property
      // but are NOT HttpException instances — preserve their status code.
      const err = exception as any;
      if (typeof err.status === 'number') {
        status = err.status;
      } else if (typeof err.statusCode === 'number') {
        status = err.statusCode;
      }
      if (err.type === 'entity.too.large') {
        status = HttpStatus.PAYLOAD_TOO_LARGE;
      }
      this.logger.error(`Unhandled error: ${exception.message} (status: ${status}, type: ${err.type || 'unknown'})`, exception.stack);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      errors,
      timestamp: new Date().toISOString(),
    });
  }
}