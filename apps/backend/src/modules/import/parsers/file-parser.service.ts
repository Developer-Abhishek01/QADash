import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ParseResult {
  data: Record<string, unknown>[];
  headers: string[];
  totalRows: number;
}

export interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'url' | 'phone';
  sampleValues: unknown[];
  nullable: boolean;
}

@Injectable()
export class FileParserService {
  private readonly logger = new Logger(FileParserService.name);

  async parse(filePath: string, fileType: string): Promise<Record<string, unknown>[]> {
    try {
      const content = await fs.readFile(filePath);

      switch (fileType) {
        case 'EXCEL':
          return await this.parseExcel(content);
        case 'CSV':
          return await this.parseCsv(content.toString('utf-8'));
        case 'JSON':
          return await this.parseJson(content.toString('utf-8'));
        case 'YAML':
          return await this.parseYaml(content.toString('utf-8'));
        default:
          throw new BadRequestException(`Unsupported file type: ${fileType}`);
      }
    } catch (error) {
      this.logger.error(`Failed to parse file: ${error.message}`);
      throw new BadRequestException(`Failed to parse file: ${error.message}`);
    }
  }

  private async parseExcel(content: Buffer): Promise<Record<string, unknown>[]> {
    try {
      const XLSX = require('xlsx');
      const workbook = XLSX.read(content, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      return data.map((row: Record<string, unknown>) => {
        const cleaned: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(row)) {
          cleaned[key.trim()] = value;
        }
        return cleaned;
      });
    } catch {
      return this.parseExcelFallback(content);
    }
  }

  private async parseExcelFallback(content: Buffer): Promise<Record<string, unknown>[]> {
    const contentStr = content.toString('utf-8');
    const lines = contentStr.split('\n').filter((line) => line.trim());
    if (lines.length < 2) return [];

    const headers = this.parseCsvLine(lines[0]);
    const data: Record<string, unknown>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      const row: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || null;
      });
      data.push(row);
    }

    return data;
  }

  private async parseCsv(content: string): Promise<Record<string, unknown>[]> {
    const lines = content.split('\n').filter((line) => line.trim());
    if (lines.length < 2) return [];

    const headers = this.parseCsvLine(lines[0]);
    const data: Record<string, unknown>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      const row: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        row[header] = this.parseValue(values[index], header);
      });
      data.push(row);
    }

    return data;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  private async parseJson(content: string): Promise<Record<string, unknown>[]> {
    const parsed = JSON.parse(content);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (typeof parsed === 'object' && parsed !== null) {
      const keys = Object.keys(parsed);
      if (keys.every((k) => Array.isArray(parsed[k]))) {
        const arrayKeys = keys.filter((k) => Array.isArray(parsed[k]));
        if (arrayKeys.length > 0) {
          const firstArray = parsed[arrayKeys[0]] as unknown[];
          return firstArray.map((_, index) => {
            const row: Record<string, unknown> = {};
            keys.forEach((key) => {
              const arr = parsed[key] as unknown[];
              row[key] = arr[index];
            });
            return row;
          });
        }
      }
      return [parsed];
    }

    return [];
  }

  private async parseYaml(content: string): Promise<Record<string, unknown>[]> {
    try {
      const yaml = require('yaml');
      const parsed = yaml.parse(content);

      if (Array.isArray(parsed)) {
        return parsed;
      }

      if (typeof parsed === 'object' && parsed !== null) {
        return [parsed];
      }

      return [];
    } catch {
      return this.parseYamlFallback(content);
    }
  }

  private parseYamlFallback(content: string): Record<string, unknown>[] {
    const lines = content.split('\n');
    const data: Record<string, unknown>[] = [];
    let current: Record<string, unknown> = {};
    let key = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      if (trimmed.includes(':')) {
        const [k, ...v] = trimmed.split(':');
        if (v.join(':').trim()) {
          current[k.trim()] = v.join(':').trim();
        } else {
          key = k.trim();
        }
      } else if (key && trimmed) {
        current[key] = trimmed;
      }

      if (Object.keys(current).length > 0 && !line.includes(':')) {
        data.push({ ...current });
        current = {};
        key = '';
      }
    }

    if (Object.keys(current).length > 0) {
      data.push(current);
    }

    return data;
  }

  private parseValue(value: string, fieldName: string): unknown {
    if (!value || value.trim() === '') return null;

    const lowerField = fieldName.toLowerCase();

    if (lowerField.includes('email')) {
      return value.trim();
    }

    if (lowerField.includes('date') || lowerField.includes('time')) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) return date.toISOString();
    }

    if (lowerField.includes('price') || lowerField.includes('amount') || lowerField.includes('cost')) {
      const num = parseFloat(value.replace(/[^0-9.-]/g, ''));
      if (!isNaN(num)) return num;
    }

    if (lowerField.includes('count') || lowerField.includes('number') || lowerField.includes('qty') || lowerField.includes('quantity')) {
      const num = parseInt(value, 10);
      if (!isNaN(num)) return num;
    }

    if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
      return value.toLowerCase() === 'true';
    }

    if (!isNaN(Number(value))) {
      return Number(value);
    }

    return value.trim();
  }

  extractSchema(data: Record<string, unknown>[]): SchemaField[] {
    if (data.length === 0) return [];

    const allKeys = new Set<string>();
    data.forEach((row) => Object.keys(row).forEach((key) => allKeys.add(key)));

    const schema: SchemaField[] = [];

    for (const key of allKeys) {
      const values = data.map((row) => row[key]).filter((v) => v !== null && v !== undefined);
      const sampleValues = values.slice(0, 10);
      const nullable = values.length < data.length;

      let type: SchemaField['type'] = 'string';

      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('email')) type = 'email';
      else if (lowerKey.includes('url') || lowerKey.includes('website')) type = 'url';
      else if (lowerKey.includes('phone') || lowerKey.includes('mobile')) type = 'phone';
      else if (lowerKey.includes('date') || lowerKey.includes('time')) type = 'date';
      else if (values.every((v) => typeof v === 'boolean')) type = 'boolean';
      else if (values.every((v) => typeof v === 'number' || (typeof v === 'string' && !isNaN(Number(v))))) type = 'number';

      schema.push({ name: key, type, sampleValues, nullable });
    }

    return schema.sort((a, b) => a.name.localeCompare(b.name));
  }
}