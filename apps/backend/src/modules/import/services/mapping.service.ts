import { Injectable } from '@nestjs/common';
import { SchemaField } from '../parsers/file-parser.service';

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  fieldType: string;
  isRequired: boolean;
  defaultValue?: string;
  transformer?: string;
}

@Injectable()
export class MappingService {
  generateAutoMappings(
    schema: SchemaField[],
    targetSchema: Record<string, { type: string; required: boolean }>,
  ): FieldMapping[] {
    const mappings: FieldMapping[] = [];
    const targetFields = Object.keys(targetSchema);

    for (const field of schema) {
      const targetField = this.findBestMatch(field.name, targetFields);

      if (targetField) {
        mappings.push({
          sourceField: field.name,
          targetField,
          fieldType: field.type,
          isRequired: targetSchema[targetField]?.required || false,
        });
      } else {
        mappings.push({
          sourceField: field.name,
          targetField: field.name,
          fieldType: field.type,
          isRequired: false,
        });
      }
    }

    return mappings;
  }

  private findBestMatch(sourceField: string, targetFields: string[]): string | null {
    const sourceLower = sourceField.toLowerCase().replace(/[^a-z0-9]/g, '');

    for (const target of targetFields) {
      const targetLower = target.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (sourceLower === targetLower) {
        return target;
      }

      if (sourceLower.includes(targetLower) || targetLower.includes(sourceLower)) {
        return target;
      }

      if (this.areSimilar(sourceLower, targetLower)) {
        return target;
      }
    }

    return null;
  }

  private areSimilar(str1: string, str2: string, threshold = 0.6): boolean {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return true;

    const editDistance = this.levenshteinDistance(longer, shorter);
    const similarity = (longer.length - editDistance) / longer.length;

    return similarity >= threshold;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2[i - 1] === str1[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  applyMappings(
    data: Record<string, unknown>[],
    mappings: { sourceField: string; targetField: string; defaultValue?: string; transformer?: string }[],
  ): Record<string, unknown>[] {
    return data.map((row) => {
      const mappedRow: Record<string, unknown> = {};

      for (const mapping of mappings) {
        let value = row[mapping.sourceField];

        if ((value === null || value === undefined || value === '') && mapping.defaultValue) {
          value = mapping.defaultValue;
        }

        if (mapping.transformer && value !== null && value !== undefined) {
          value = this.applyTransformer(value, mapping.transformer);
        }

        mappedRow[mapping.targetField] = value;
      }

      return mappedRow;
    });
  }

  private applyTransformer(value: unknown, transformer: string): unknown {
    const parts = transformer.split(':');
    const type = parts[0];
    const param = parts[1];

    switch (type) {
      case 'uppercase':
        return typeof value === 'string' ? value.toUpperCase() : value;

      case 'lowercase':
        return typeof value === 'string' ? value.toLowerCase() : value;

      case 'trim':
        return typeof value === 'string' ? value.trim() : value;

      case 'capitalize':
        if (typeof value === 'string') {
          return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
        }
        return value;

      case 'title':
        if (typeof value === 'string') {
          return value.replace(/\w\S*/g, (txt) =>
            txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
          );
        }
        return value;

      case 'number':
        if (typeof value === 'string') {
          const num = parseFloat(value.replace(/[^0-9.-]/g, ''));
          return isNaN(num) ? value : num;
        }
        return value;

      case 'integer':
        if (typeof value === 'string') {
          const num = parseInt(value, 10);
          return isNaN(num) ? value : num;
        }
        return value;

      case 'boolean':
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true' || value === '1';
        }
        return value;

      case 'date':
        if (typeof value === 'string') {
          const date = new Date(value);
          return isNaN(date.getTime()) ? value : date.toISOString();
        }
        return value;

      case 'json':
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        }
        return value;

      case 'replace':
        if (typeof value === 'string' && param) {
          const [find, replace] = param.split('|');
          return value.replace(new RegExp(find, 'g'), replace || '');
        }
        return value;

      case 'substring':
        if (typeof value === 'string' && param) {
          const [start, end] = param.split('|').map(Number);
          return value.substring(start, end);
        }
        return value;

      default:
        return value;
    }
  }

  getAvailableTransformers(): { name: string; description: string; example: string }[] {
    return [
      { name: 'uppercase', description: 'Convert to uppercase', example: 'john doe → JOHN DOE' },
      { name: 'lowercase', description: 'Convert to lowercase', example: 'John Doe → john doe' },
      { name: 'trim', description: 'Remove leading/trailing whitespace', example: '  John  → John' },
      { name: 'capitalize', description: 'Capitalize first letter', example: 'john → John' },
      { name: 'title', description: 'Title case', example: 'john doe → John Doe' },
      { name: 'number', description: 'Convert to number', example: '123.45 → 123.45' },
      { name: 'integer', description: 'Convert to integer', example: '123.45 → 123' },
      { name: 'boolean', description: 'Convert to boolean', example: 'true → true' },
      { name: 'date', description: 'Convert to ISO date', example: '2024-01-01 → 2024-01-01T00:00:00.000Z' },
      { name: 'json', description: 'Parse JSON string', example: '{"a":1} → {a:1}' },
      { name: 'replace', description: 'Replace text (format: find|replace)', example: 'find|replacement' },
      { name: 'substring', description: 'Extract substring (format: start|end)', example: '0|5' },
    ];
  }
}