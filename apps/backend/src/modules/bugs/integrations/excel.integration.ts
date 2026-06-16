import { Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';

export interface BugExportRow {
  id: string;
  title: string;
  description: string;
  severity: string;
  priority: string;
  status: string;
  assignee?: string;
  reporter?: string;
  project: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class ExcelIntegration {
  private readonly logger = new Logger(ExcelIntegration.name);

  exportToExcel(bugs: any[]): Buffer {
    const rows: BugExportRow[] = bugs.map(b => ({
      id: b.id,
      title: b.title,
      description: b.description || '',
      severity: b.severity,
      priority: b.priority,
      status: b.status,
      assignee: b.assignee?.name || 'Unassigned',
      reporter: b.user?.name || '',
      project: b.project?.name || '',
      tags: (b.tags || []).join(', '),
      createdAt: new Date(b.createdAt).toISOString(),
      updatedAt: new Date(b.updatedAt).toISOString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bugs');

    return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
  }

  exportToCsv(bugs: any[]): string {
    const rows = bugs.map(b => ({
      ID: b.id,
      Title: b.title,
      Description: b.description?.replace(/,/g, ';') || '',
      Severity: b.severity,
      Priority: b.priority,
      Status: b.status,
      Assignee: b.assignee?.name || 'Unassigned',
      Reporter: b.user?.name || '',
      Project: b.project?.name || '',
      Tags: (b.tags || []).join(';'),
      Created: new Date(b.createdAt).toISOString(),
      Updated: new Date(b.updatedAt).toISOString(),
    }));

    const headers = Object.keys(rows[0]).join(',');
    const data = rows.map(r => Object.values(r).map(v => `"${v}"`).join(',')).join('\n');
    return `${headers}\n${data}`;
  }

  async importFromExcel(buffer: Buffer, projectId: string): Promise<Partial<BugExportRow>[]> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet) as any[];

    return data.map(row => ({
      title: row.Title || row.title || 'Imported Bug',
      description: row.Description || row.description || '',
      severity: this.mapSeverity(row.Severity || row.severity),
      priority: this.mapPriority(row.Priority || row.priority),
      status: row.Status || row.status || 'OPEN',
      tags: (row.Tags || row.tags || '').split(/[;,]/).filter(Boolean),
      projectId,
    }));
  }

  async importFromCsv(content: string, projectId: string): Promise<Partial<BugExportRow>[]> {
    const lines = content.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows = lines.slice(1);

    return rows.map(line => {
      const values = line.match(/("([^"]*)"|[^,]+)/g)?.map(v => v.replace(/^"|"$/g, '').trim()) || [];
      const obj: any = {};
      headers.forEach((h, i) => { obj[h] = values[i]; });

      return {
        title: obj.title || obj.summary || 'Imported Bug',
        description: obj.description || '',
        severity: this.mapSeverity(obj.severity),
        priority: this.mapPriority(obj.priority),
        status: obj.status || 'OPEN',
        tags: (obj.tags || '').split(/[;,]/).filter(Boolean),
        projectId,
      };
    });
  }

  private mapSeverity(s?: string): string {
    const m = { critical: 'CRITICAL', high: 'HIGH', medium: 'MEDIUM', low: 'LOW' };
    return m[s?.toLowerCase() || ''] || 'MEDIUM';
  }

  private mapPriority(p?: string): string {
    const m: Record<string, string> = { '1': 'P1', '2': 'P2', '3': 'P3', '4': 'P4', p1: 'P1', p2: 'P2', p3: 'P3', p4: 'P4' };
    return m[p?.toLowerCase() || ''] || 'P3';
  }
}