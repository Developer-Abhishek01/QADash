import { Controller, Get } from '@nestjs/common';

interface HealthResponse {
  status: string;
  timestamp: string;
  uptime: number;
  services: {
    database: string;
    redis: string;
  };
}

@Controller('health')
export class HealthController {
  private startTime = Date.now();

  @Get()
  check(): HealthResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      services: {
        database: 'ok',
        redis: 'ok',
      },
    };
  }
}