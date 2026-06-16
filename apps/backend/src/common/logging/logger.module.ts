import { Module, Global } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { LoggerService } from './logger.service';

const logLevel = process.env.LOG_LEVEL || 'info';
const logDir = process.env.LOG_DIR || 'logs';

const dailyRotateTransport = new winston.transports.DailyRotateFile({
  filename: '%DATE%-combined.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  dirname: logDir,
  level: logLevel,
});

const errorRotateTransport = new winston.transports.DailyRotateFile({
  filename: '%DATE%-error.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  dirname: logDir,
  level: 'error',
});

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${context || 'App'}] ${level.toUpperCase()}: ${message} ${metaString}`;
  }),
);

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

@Global()
@Module({
  imports: [
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: consoleFormat,
          level: logLevel,
        }),
        dailyRotateTransport,
        errorRotateTransport,
      ],
      levels: {
        error: 0,
        warn: 1,
        http: 2,
        info: 3,
        debug: 4,
        verbose: 5,
      },
      exceptionHandlers: [
        new winston.transports.DailyRotateFile({
          filename: '%DATE%-exception.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          dirname: logDir,
        }),
      ],
      rejectionHandlers: [
        new winston.transports.DailyRotateFile({
          filename: '%DATE%-rejection.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          dirname: logDir,
        }),
      ],
    }),
  ],
  providers: [LoggerService],
  exports: [LoggerService, WinstonModule],
})
export class LoggerModule {}