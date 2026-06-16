import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface ServiceConfig {
  name: string;
  url: string;
  capabilities: string[];
  priority: number;
}

export interface ServiceHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: Date;
  latency: number;
  errorRate: number;
}

@Injectable()
export class ServiceRegistryService {
  private readonly logger = new Logger(ServiceRegistryService.name);
  private redis: Redis;
  private healthCheckInterval: NodeJS.Timer | null = null;
  private services: Map<string, ServiceConfig> = new Map();
  private healthStatus: Map<string, ServiceHealth> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      host: configService.get('REDIS_HOST', 'localhost'),
      port: configService.get('REDIS_PORT', 6379),
      password: configService.get('REDIS_PASSWORD', ''),
      db: configService.get('REDIS_DB', 0),
    });
    this.startHealthChecks();
  }

  async registerService(config: ServiceConfig): Promise<void> {
    this.services.set(config.name, config);
    await this.redis.hset('services:registry', config.name, JSON.stringify(config));
    this.logger.log(`Service ${config.name} registered`);
  }

  async unregisterService(name: string): Promise<void> {
    this.services.delete(name);
    await this.redis.hdel('services:registry', name);
    this.logger.log(`Service ${name} unregistered`);
  }

  async getService(name: string): Promise<ServiceConfig | undefined> {
    const cached = this.services.get(name);
    if (cached) return cached;

    const data = await this.redis.hget('services:registry', name);
    if (data) {
      const config = JSON.parse(data);
      this.services.set(name, config);
      return config;
    }
    return undefined;
  }

  async getAllServices(): Promise<ServiceConfig[]> {
    const data = await this.redis.hgetall('services:registry');
    return Object.values(data).map(v => JSON.parse(v));
  }

  async updateServiceHealth(service: string, status: 'healthy' | 'degraded' | 'down', latency: number): Promise<void> {
    const health: ServiceHealth = {
      service,
      status,
      lastCheck: new Date(),
      latency,
      errorRate: 0,
    };

    this.healthStatus.set(service, health);
    await this.redis.hset('services:health', service, JSON.stringify(health));
  }

  async getServiceHealth(service: string): Promise<ServiceHealth | undefined> {
    return this.healthStatus.get(service);
  }

  async getAllHealth(): Promise<ServiceHealth[]> {
    return Array.from(this.healthStatus.values());
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      for (const [name, config] of this.services) {
        await this.checkServiceHealth(config);
      }
    }, 30000);
  }

  private async checkServiceHealth(config: ServiceConfig): Promise<void> {
    const start = Date.now();
    try {
      const response = await fetch(`${config.url}/health`);
      const latency = Date.now() - start;

      if (response.ok) {
        await this.updateServiceHealth(config.name, 'healthy', latency);
      } else {
        await this.updateServiceHealth(config.name, 'degraded', latency);
      }
    } catch (error) {
      await this.updateServiceHealth(config.name, 'down', Date.now() - start);
      this.logger.error(`Service ${config.name} health check failed: ${error.message}`);
    }
  }

  onModuleDestroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval as any);
    }
    this.redis.disconnect();
  }
}