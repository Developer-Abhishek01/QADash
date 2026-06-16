import { Logger } from '../utils/logger';
import { ExportResult, ExportFormat } from './export-service';
import * as fs from 'fs';
import * as path from 'path';

export interface StoredReport {
  id: string;
  executionId: string;
  projectId: string;
  title: string;
  generatedAt: string;
  formats: ExportFormat[];
  filePaths: Record<ExportFormat, string>;
  size: number;
  retentionDays: number;
}

export interface ReportStorageConfig {
  baseDir: string;
  maxStorageSize: number;
  retentionDays: number;
  cleanupEnabled: boolean;
}

export class ReportStorage {
  private logger: Logger;
  private config: ReportStorageConfig;
  private metadataFile: string;
  private reports: Map<string, StoredReport> = new Map();

  constructor(config?: Partial<ReportStorageConfig>, logger?: Logger) {
    this.logger = logger || new Logger('ReportStorage');
    this.config = {
      baseDir: config?.baseDir || './test-results/reports',
      maxStorageSize: config?.maxStorageSize || 5 * 1024 * 1024 * 1024,
      retentionDays: config?.retentionDays || 30,
      cleanupEnabled: config?.cleanupEnabled ?? true,
    };
    this.metadataFile = path.join(this.config.baseDir, 'reports-metadata.json');
    this.ensureDirectory();
    this.loadMetadata();
  }

  private ensureDirectory(): void {
    if (!fs.existsSync(this.config.baseDir)) {
      fs.mkdirSync(this.config.baseDir, { recursive: true });
    }
  }

  private loadMetadata(): void {
    try {
      if (fs.existsSync(this.metadataFile)) {
        const data = JSON.parse(fs.readFileSync(this.metadataFile, 'utf8'));
        data.forEach((report: StoredReport) => {
          this.reports.set(report.id, report);
        });
      }
    } catch (error) {
      this.logger.error(`Failed to load metadata: ${error}`);
    }
  }

  private saveMetadata(): void {
    try {
      const reports = Array.from(this.reports.values());
      fs.writeFileSync(this.metadataFile, JSON.stringify(reports, null, 2));
    } catch (error) {
      this.logger.error(`Failed to save metadata: ${error}`);
    }
  }

  async saveReport(
    executionId: string,
    projectId: string,
    title: string,
    exportResults: ExportResult[]
  ): Promise<StoredReport> {
    const reportId = `report-${executionId}-${Date.now()}`;
    
    const filePaths: Record<ExportFormat, string> = {} as any;
    let totalSize = 0;

    exportResults.forEach(result => {
      filePaths[result.format] = result.filePath;
      totalSize += result.size;
    });

    const storedReport: StoredReport = {
      id: reportId,
      executionId,
      projectId,
      title,
      generatedAt: new Date().toISOString(),
      formats: exportResults.map(r => r.format),
      filePaths,
      size: totalSize,
      retentionDays: this.config.retentionDays,
    };

    this.reports.set(reportId, storedReport);
    this.saveMetadata();

    this.logger.info(`Report saved: ${reportId}, size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
    
    if (this.config.cleanupEnabled) {
      await this.cleanupOldReports();
    }

    return storedReport;
  }

  getReport(id: string): StoredReport | undefined {
    return this.reports.get(id);
  }

  getReportByExecution(executionId: string): StoredReport | undefined {
    for (const report of this.reports.values()) {
      if (report.executionId === executionId) {
        return report;
      }
    }
    return undefined;
  }

  getReportsByProject(projectId: string): StoredReport[] {
    return Array.from(this.reports.values())
      .filter(r => r.projectId === projectId)
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
  }

  getAllReports(limit = 100): StoredReport[] {
    return Array.from(this.reports.values())
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
      .slice(0, limit);
  }

  deleteReport(id: string): boolean {
    const report = this.reports.get(id);
    if (!report) return false;

    for (const filePath of Object.values(report.filePaths)) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        this.logger.warn(`Failed to delete file: ${filePath}`);
      }
    }

    this.reports.delete(id);
    this.saveMetadata();

    this.logger.info(`Report deleted: ${id}`);
    return true;
  }

  async cleanupOldReports(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    let deletedCount = 0;

    for (const [id, report] of this.reports) {
      const reportDate = new Date(report.generatedAt);
      if (reportDate < cutoffDate) {
        this.deleteReport(id);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      this.logger.info(`Cleaned up ${deletedCount} old reports`);
    }

    return deletedCount;
  }

  getStorageStats(): { totalReports: number; totalSize: number; byProject: Record<string, { count: number; size: number }> } {
    const byProject: Record<string, { count: number; size: number }> = {};
    let totalSize = 0;

    for (const report of this.reports.values()) {
      totalSize += report.size;
      
      if (!byProject[report.projectId]) {
        byProject[report.projectId] = { count: 0, size: 0 };
      }
      byProject[report.projectId].count++;
      byProject[report.projectId].size += report.size;
    }

    return {
      totalReports: this.reports.size,
      totalSize,
      byProject,
    };
  }

  async exportReport(id: string, format: ExportFormat): Promise<string | null> {
    const report = this.reports.get(id);
    if (!report) return null;

    const filePath = report.filePaths[format];
    if (!filePath || !fs.existsSync(filePath)) return null;

    return filePath;
  }

  async archiveReport(id: string, archivePath: string): Promise<boolean> {
    const report = this.reports.get(id);
    if (!report) return false;

    const archiver = (await import('archiver')).default;
    
    if (!archiver) {
      this.logger.warn('Archive library not available');
      return false;
    }

    const output = fs.createWriteStream(archivePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);

    for (const filePath of Object.values(report.filePaths)) {
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: path.basename(filePath) });
      }
    }

    await archive.finalize();
    
    this.logger.info(`Report archived: ${archivePath}`);
    return true;
  }
}

export const reportStorage = new ReportStorage();