export type FileImportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
export type FileType = 'EXCEL' | 'CSV' | 'JSON' | 'YAML';

export interface FileImport {
  id: string;
  name: string;
  projectId: string;
  userId: string;
  fileType: FileType;
  status: FileImportStatus;
  totalRows: number;
  processedRows: number;
  successRows: number;
  errorRows: number;
  originalFilename: string;
  storedFilename: string;
  fileSize: number;
  mimeType: string;
  schema?: Record<string, unknown>;
  previewData?: Record<string, unknown>[];
  errorSummary?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  createdAt: string;
  completedAt?: string;
  updatedAt: string;
  project?: { id: string; name: string };
  mappings?: FieldMapping[];
  errors?: ImportError[];
}

export interface FieldMapping {
  id: string;
  importId: string;
  sourceField: string;
  targetField: string;
  fieldType: string;
  isRequired: boolean;
  defaultValue?: string;
  transformer?: string;
  validationRule?: string;
  createdAt: string;
}

export interface ImportError {
  id: string;
  importId: string;
  rowNumber?: number;
  fieldName?: string;
  value?: string;
  errorType: string;
  errorMessage: string;
  severity: string;
  isResolved: boolean;
  createdAt: string;
}

export interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'url' | 'phone';
  sampleValues: unknown[];
  nullable: boolean;
}

export interface CreateImportDto {
  name: string;
  projectId: string;
  fileType: FileType;
  settings?: Record<string, unknown>;
}

export interface ProcessResult {
  importId: string;
  totalRows: number;
  successRows: number;
  errorRows: number;
  status: string;
  validData: Record<string, unknown>[];
}