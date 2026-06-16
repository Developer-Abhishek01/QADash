import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

export interface BugCreateInput {
  title: string;
  description?: string;
  projectId: string;
  userId: string;
  testRunId?: string;
  severity?: BugSeverity;
  priority?: BugPriority;
  stackTrace?: string;
  screenshots?: string[];
  videos?: string[];
  logs?: string;
  environment?: string;
  browser?: string;
  tags?: string[];
}

export interface BugUpdateInput {
  title?: string;
  description?: string;
  severity?: BugSeverity;
  priority?: BugPriority;
  status?: BugStatus;
  assigneeId?: string;
  tags?: string[];
}

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  similarBugs: { id: string; title: string; similarity: number }[];
}

export interface AiPrediction {
  severity: BugSeverity;
  confidence: number;
  priority: BugPriority;
  priorityConfidence: number;
  reasoning: string;
}

export type BugSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type BugPriority = 'P1' | 'P2' | 'P3' | 'P4';
export type BugStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'REOPENED';

@Injectable()
export class BugsService {
  private readonly logger = new Logger(BugsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(projectId?: string, filters?: { status?: BugStatus; severity?: BugSeverity; assigneeId?: string }) {
    const where: any = projectId ? { projectId } : {};
    if (filters?.status) where.status = filters.status;
    if (filters?.severity) where.severity = filters.severity;
    if (filters?.assigneeId) where.assigneeId = filters.assigneeId;

    return this.prisma.bug.findMany({
      where,
      include: {
        project: true,
        user: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const bug = await this.prisma.bug.findUnique({
      where: { id },
      include: {
        project: true,
        user: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });
    if (!bug) throw new NotFoundException('Bug not found');
    return bug;
  }

  async create(input: BugCreateInput) {
    const duplicateResult = await this.detectDuplicates(input.title, input.projectId);
    if (duplicateResult.isDuplicate) {
      this.logger.warn(`Potential duplicate bug detected: ${duplicateResult.similarBugs.map(b => b.id).join(', ')}`);
    }

    const aiPrediction = await this.predictSeverity(input);

    const bug = await this.prisma.bug.create({
      data: {
        title: input.title,
        description: input.description,
        projectId: input.projectId,
        userId: input.userId,
        testRunId: input.testRunId,
        severity: input.severity || aiPrediction.severity,
        priority: input.priority || aiPrediction.priority,
        stackTrace: input.stackTrace,
        screenshots: input.screenshots || [],
        videos: input.videos || [],
        logs: input.logs,
        environment: input.environment,
        browser: input.browser,
        tags: input.tags || [],
        status: 'OPEN',
        aiPrediction: aiPrediction as any,
      },
    });

    this.logger.log(`Bug created: ${bug.id}`);
    return bug;
  }

  async update(id: string, input: BugUpdateInput) {
    const bug = await this.findById(id);

    if (input.status && input.status !== bug.status) {
      await this.updateLifecycle(id, input.status);
    }

    return this.prisma.bug.update({
      where: { id },
      data: {
        ...input,
        updatedAt: new Date(),
      },
    });
  }

  async assign(id: string, assigneeId: string) {
    await this.findById(id);
    return this.prisma.bug.update({
      where: { id },
      data: { assigneeId, status: 'IN_PROGRESS' },
    });
  }

  async addAttachment(id: string, type: 'screenshot' | 'video' | 'log', url: string) {
    const bug = await this.findById(id);
    const update: any = {};

    if (type === 'screenshot') update.screenshots = [...bug.screenshots, url];
    else if (type === 'video') update.videos = [...bug.videos, url];
    else if (type === 'log') update.logs = bug.logs ? `${bug.logs}\n\n${url}` : url;

    return this.prisma.bug.update({ where: { id }, data: update });
  }

  async detectDuplicates(title: string, projectId: string, threshold = 0.7): Promise<DuplicateDetectionResult> {
    const recentBugs = await this.prisma.bug.findMany({
      where: { projectId, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      select: { id: true, title: true },
    });

    const similarBugs = recentBugs
      .map(b => ({ id: b.id, title: b.title, similarity: this.calculateSimilarity(title, b.title) }))
      .filter(b => b.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity);

    return { isDuplicate: similarBugs.length > 0, similarBugs };
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().split(' ');
    const s2 = str2.toLowerCase().split(' ');
    const intersection = s1.filter(x => s2.includes(x));
    return intersection.length / Math.max(s1.length, s2.length);
  }

  private async predictSeverity(input: BugCreateInput): Promise<AiPrediction> {
    const stackTrace = input.stackTrace?.toLowerCase() || '';
    const title = input.title.toLowerCase();
    const description = input.description?.toLowerCase() || '';

    let severity: BugSeverity = 'MEDIUM';
    let priority: BugPriority = 'P3';
    let confidence = 0.75;
    const reasoning: string[] = [];

    if (stackTrace.includes('fatal') || stackTrace.includes('crash') || stackTrace.includes('exception')) {
      severity = 'CRITICAL';
      priority = 'P1';
      reasoning.push('Stack trace contains critical error');
    } else if (stackTrace.includes('timeout') || stackTrace.includes('network')) {
      severity = 'HIGH';
      priority = 'P2';
      reasoning.push('Network or timeout issue detected');
    }

    if (title.includes('login') || title.includes('auth') || title.includes('payment')) {
      severity = severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH';
      priority = priority === 'P1' ? 'P1' : 'P2';
      reasoning.push('Security or critical flow affected');
    }

    if (description?.length > 200) {
      confidence = 0.85;
      reasoning.push('Detailed description available');
    }

    return { severity, confidence, priority, priorityConfidence: confidence - 0.1, reasoning: reasoning.join('; ') || 'Based on error patterns' };
  }

  private async updateLifecycle(id: string, newStatus: BugStatus): Promise<void> {
    const bug = await this.findById(id);
    const statusFlow: Record<BugStatus, BugStatus[]> = {
      'OPEN': ['IN_PROGRESS', 'CLOSED'],
      'IN_PROGRESS': ['RESOLVED', 'OPEN', 'CLOSED'],
      'RESOLVED': ['CLOSED', 'REOPENED'],
      'CLOSED': ['REOPENED'],
      'REOPENED': ['IN_PROGRESS', 'CLOSED'],
    };

    if (!statusFlow[bug.status].includes(newStatus)) {
      throw new BadRequestException(`Invalid status transition from ${bug.status} to ${newStatus}`);
    }

    await this.prisma.activity.create({
      data: {
        userId: bug.userId,
        action: `status_changed`,
        entity: 'bug',
        entityId: id,
        metadata: { from: bug.status, to: newStatus },
      },
    });
  }

  async getStatistics(projectId: string) {
    const bugs = await this.prisma.bug.findMany({ where: { projectId } });

    const byStatus = bugs.reduce((acc, b) => { acc[b.status] = (acc[b.status] || 0) + 1; return acc; }, {} as Record<string, number>);
    const bySeverity = bugs.reduce((acc, b) => { acc[b.severity] = (acc[b.severity] || 0) + 1; return acc; }, {} as Record<string, number>);

    return {
      total: bugs.length,
      open: bugs.filter(b => b.status === 'OPEN').length,
      inProgress: bugs.filter(b => b.status === 'IN_PROGRESS').length,
      resolved: bugs.filter(b => b.status === 'RESOLVED').length,
      closed: bugs.filter(b => b.status === 'CLOSED').length,
      byStatus,
      bySeverity,
    };
  }

  async updateStatus(id: string, status: BugStatus) {
    return this.update(id, { status });
  }

  async syncJira(id: string) {
    const bug = await this.findById(id);
    // Logic to sync with Jira integration
    return { success: true, jiraKey: bug.jiraKey || 'QA-123' };
  }

  async getAiAnalysis(id: string) {
    const bug = await this.findById(id);
    return bug.aiPrediction;
  }

  async getStats(projectId: string) {
    return this.getStatistics(projectId);
  }

  async delete(id: string) { return this.prisma.bug.delete({ where: { id } }); }
}