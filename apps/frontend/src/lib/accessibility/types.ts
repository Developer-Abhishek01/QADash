export type AccessibilityTestStatus = 'PENDING' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type AccessibilitySeverity = 'CRITICAL' | 'SERIOUS' | 'MODERATE' | 'MINOR';
export type WcagLevel = 'A' | 'AA' | 'AAA';

export interface AccessibilityTest {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  environmentId: string;
  userId: string;
  status: AccessibilityTestStatus;
  urls: string[];
  config?: Record<string, unknown>;
  isScheduled: boolean;
  schedule?: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  totalPages: number;
  scannedPages: number;
  totalIssues: number;
  criticalCount: number;
  seriousCount: number;
  moderateCount: number;
  minorCount: number;
  passCount: number;
  score: number;
  wcagLevel: WcagLevel;
  reportUrl?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string };
  environment?: { id: string; name: string };
  issues?: AccessibilityIssue[];
}

export interface AccessibilityIssue {
  id: string;
  testId: string;
  ruleId: string;
  impact: AccessibilitySeverity;
  category: string;
  description: string;
  help?: string;
  helpUrl?: string;
  wcagCriteria: string[];
  wcagTechniques: string[];
  htmlSnippet?: string;
  selector?: string;
  pageUrl: string;
  pageTitle?: string;
  screenshot?: string;
  xCoordinate?: number;
  yCoordinate?: number;
  isResolved: boolean;
  resolutionNote?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface AccessibilityBaseline {
  id: string;
  projectId: string;
  testId?: string;
  name: string;
  score: number;
  issuesByImpact: { CRITICAL: number; SERIOUS: number; MODERATE: number; MINOR: number };
  wcagCoverage: Record<string, number>;
  snapshot: Record<string, unknown>;
  createdAt: string;
}

export interface DashboardStats {
  totalTests: number;
  testsByStatus: Record<AccessibilityTestStatus, number>;
  issuesByImpact: { critical: number; serious: number; moderate: number; minor: number };
  totalIssues: number;
  recentTests: AccessibilityTest[];
  activeTests: AccessibilityTest[];
  avgScore: number;
}

export interface CreateTestDto {
  name: string;
  description?: string;
  projectId: string;
  environmentId: string;
  urls: string[];
  wcagLevel?: WcagLevel;
  config?: Record<string, unknown>;
  isScheduled?: boolean;
  schedule?: string;
}