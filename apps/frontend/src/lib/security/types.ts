export type ScanStatus = 'PENDING' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TIMEOUT';
export type ScanType = 'FULL' | 'QUICK' | 'AUTHENTICATION' | 'API' | 'DEPENDENCY' | 'CUSTOM';
export type VulnerabilitySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type VulnerabilityStatus = 'OPEN' | 'CONFIRMED' | 'FALSE_POSITIVE' | 'ACCEPTED' | 'REMEDIATED' | 'REOPENED';

export interface SecurityScan {
  id: string;
  name: string;
  projectId: string;
  environmentId: string;
  userId: string;
  scanType: ScanType;
  status: ScanStatus;
  config?: Record<string, unknown>;
  schedule?: string;
  isScheduled: boolean;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  progress: number;
  totalTargets: number;
  scannedTargets: number;
  totalVulnerabilities: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  reportUrl?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string };
  environment?: { id: string; name: string };
}

export interface Vulnerability {
  id: string;
  scanId: string;
  title: string;
  description: string;
  severity: VulnerabilitySeverity;
  status: VulnerabilityStatus;
  cweId?: string;
  cveId?: string;
  owaspCategory?: string;
  affectedUrl?: string;
  affectedParam?: string;
  evidence?: Record<string, unknown>;
  remediation?: string;
  remediationUrl?: string;
  falsePositiveReason?: string;
  acceptedRisk?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  scan?: { id: string; name: string; projectId: string };
}

export interface DependencyScan {
  id: string;
  projectId: string;
  userId: string;
  packageManager: string;
  status: string;
  totalPackages: number;
  vulnerablePackages: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  results?: Record<string, unknown>[];
  reportUrl?: string;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityAlert {
  id: string;
  projectId: string;
  scanId?: string;
  vulnerabilityId?: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export interface DashboardStats {
  totalScans: number;
  scansByStatus: Record<ScanStatus, number>;
  vulnerabilitiesBySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  totalVulnerabilities: number;
  recentVulnerabilities: Vulnerability[];
  owaspStats: Record<string, number>;
}

export interface CreateScanDto {
  name: string;
  projectId: string;
  environmentId: string;
  scanType?: ScanType;
  config?: Record<string, unknown>;
  schedule?: string;
  isScheduled?: boolean;
}