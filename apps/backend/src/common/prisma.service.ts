import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: ['query', 'info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    let retries = 5;
    while (retries > 0) {
      try {
        await this.$connect();
        this.logger.log('✅ Prisma connected to database');
        return;
      } catch (error) {
        retries--;
        this.logger.warn(`❌ Database connection failed. Retrying... (${retries} attempts left)`);
        this.logger.error(error.message);
        if (retries === 0) {
          this.logger.error('❌ Max retries reached. Exiting...');
          process.exit(1);
        }
        // Wait 5 seconds before retrying
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('❌ Prisma disconnected from database');
  }
}