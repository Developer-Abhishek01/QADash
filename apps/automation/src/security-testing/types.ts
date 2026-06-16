export type VulnerabilitySeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type VulnerabilityCategory = 'sql_injection' | 'xss' | 'auth' | 'headers' | 'dependency' | 'csrf' | 'ssrf' | 'idor' | 'other';

export interface Vulnerability {
  id: string;
  name: string;
  description: string;
  category: VulnerabilityCategory;
  severity: VulnerabilitySeverity;
  confidence: 'high' | 'medium' | 'low';
  url: string;
  parameter?: string;
  evidence: string;
  solution: string;
  cwe?: string;
  wasc?: string;
  reference?: string;
  foundAt: number;
}

export interface SecurityScanResult {
  scanId: string;
  target: string;
  startTime: number;
  endTime: number;
  duration: number;
  vulnerabilities: Vulnerability[];
  summary: ScanSummary;
  spiderUrls: number;
  alertsCount: number;
}

export interface ScanSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  total: number;
  riskScore: number;
}

export interface SecurityReport {
  id: string;
  projectName: string;
  scanDate: number;
  totalScans: number;
  vulnerabilities: Vulnerability[];
  trends: TrendData[];
  topRisks: Vulnerability[];
  compliance: ComplianceStatus;
}

export interface TrendData {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface ComplianceStatus {
  owaspTop10: string[];
  pciDss: string[];
  hipaa: string[];
}

export interface SecurityConfig {
  zapApiKey: string;
  zapUrl: string;
  spider: boolean;
  ajaxSpider: boolean;
  passiveScan: boolean;
  activeScan: boolean;
  scanPolicies: string[];
  excludedUrls: string[];
  authConfig?: AuthConfig;
}

export interface AuthConfig {
  loginUrl: string;
  username: string;
  password: string;
  usernameField: string;
  passwordField: string;
  submitField?: string;
  sessionToken: string;
}

export interface DependencyVulnerability {
  library: string;
  version: string;
  currentVersion?: string;
  vulnerabilities: DepVulnInfo[];
  severity: VulnerabilitySeverity;
}

export interface DepVulnInfo {
  id: string;
  title: string;
  severity: VulnerabilitySeverity;
  cve?: string;
  description: string;
  recommendation: string;
}