import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { NotificationJobData } from '../queue.service';
import { PrismaService } from '../../../common/prisma.service';

@Processor('notification', {
  concurrency: 10,
  limiter: { max: 50, duration: 1000 },
})
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<any> {
    const { userId, type, title, message, link, email } = job.data;

    this.logger.log(`Sending notification to user ${userId}: ${title}`);

    await this.prisma.notification.create({
      data: {
        userId,
        type: type as any,
        title,
        message,
        link,
        read: false,
      },
    });

    if (email) {
      await this.sendEmail(userId, title, message);
    }

    if (link) {
      this.logger.debug(`Notification ${job.id} includes link: ${link}`);
    }

    this.logger.log(`Notification sent to user ${userId}`);
    return { delivered: true, userId, type };
  }

  private async sendEmail(userId: string, subject: string, body: string) {
    this.logger.log(`Sending email to user ${userId}: ${subject}`);
    await this.simulateEmailDelay();
  }

  private async simulateEmailDelay(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 200));
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Notification job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Notification job ${job.id} failed: ${error.message}`);
  }
}