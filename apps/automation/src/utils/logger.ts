import pino from 'pino';

const isCI = !!process.env.CI;

export const logger = pino({
  level: isCI ? 'info' : process.env.LOG_LEVEL || 'debug',
  transport: isCI
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
  formatters: {
    level: (label) => ({ level: label }),
  },
});

export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(message: string): string {
    return `[${this.context}] ${message}`;
  }

  debug(message: string, ...args: unknown[]): void {
    logger.debug(this.formatMessage(message), ...args);
  }

  info(message: string, ...args: unknown[]): void {
    logger.info(this.formatMessage(message), ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    logger.warn(this.formatMessage(message), ...args);
  }

  error(message: string, ...args: unknown[]): void {
    logger.error(this.formatMessage(message), ...args);
  }

  fatal(message: string, ...args: unknown[]): void {
    logger.fatal(this.formatMessage(message), ...args);
  }

  child(bindings: Record<string, unknown>): Logger {
    const suffix = typeof bindings === 'object' ? JSON.stringify(bindings) : String(bindings);
    return new Logger(`${this.context}:${suffix}`);
  }
}

export function createLogger(context: string): Logger {
  return new Logger(context);
}