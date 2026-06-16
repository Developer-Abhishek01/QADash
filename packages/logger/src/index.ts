import pino from 'pino';
import type { Logger, LoggerOptions } from 'pino';

export type { Logger, LoggerOptions };

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDevelopment = process.env.NODE_ENV === 'development';

const baseOptions: LoggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: (req) => ({
      method: req?.method,
      url: req?.url,
      headers: {
        host: req?.headers?.host,
        userAgent: req?.headers?.['user-agent'],
      },
    }),
    res: (res) => ({
      statusCode: res?.statusCode,
    }),
  },
};

export function createLogger(name: string, options?: Partial<LoggerOptions>): Logger {
  const logger = pino(
    {
      ...baseOptions,
      ...options,
      name,
    },
    isDevelopment
      ? pino.destination({ minLength: 0, sync: false })
      : undefined
  );

  return logger;
}

export function createChildLogger(logger: Logger, bindings: Record<string, unknown>): Logger {
  return logger.child(bindings);
}

export const logger = createLogger('qadash');

export default logger;