import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Request');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url, headers, query, params } = request;
    const userAgent = headers['user-agent'] || '';
    const ip = headers['x-forwarded-for'] || request.ip || 'unknown';

    this.logger.log(`Incoming ${method} ${url} from ${ip} - ${userAgent}`);

    if (Object.keys(query).length) {
      this.logger.debug(`Query: ${JSON.stringify(query)}`);
    }
    if (Object.keys(params).length) {
      this.logger.debug(`Params: ${JSON.stringify(params)}`);
    }

    const now = Date.now();
    return next
      .handle()
      .pipe(
        tap(() => {
          const duration = Date.now() - now;
          this.logger.log(`Completed in ${duration}ms`);
        })
      );
  }
}