'use client';

import {
  Security as SecurityIcon,
  BugReport,
  Assessment,
  PlayArrow,
  Shield,
} from '@mui/icons-material';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import { PageHeader } from '@/components/common/PageHeader';
import { Loading } from '@/components/feedback/Loading';
import { StatsCard, SeverityChip, SecurityScoreCard, AlertsPanel, VulnTrendChart } from '@/components/security';
import { useSecurityDashboard } from '@/lib/security/hooks';

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#dc2626',
  HIGH: '#ea580c',
  MEDIUM: '#ca8a04',
  LOW: '#65a30d',
  INFO: '#3b82f6',
};

export default function SecurityDashboard() {
  const { data: stats, isLoading } = useSecurityDashboard();

  const safeStats = stats || {
    vulnerabilitiesBySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    scansByStatus: { COMPLETED: 0, FAILED: 0, RUNNING: 0, PENDING: 0, CANCELLED: 0, QUEUED: 0, TIMEOUT: 0 },
    totalScans: 0,
    totalVulnerabilities: 0,
    owaspStats: {},
    recentVulnerabilities: [],
  };

  if (isLoading) return <Loading />;

  const severityData = safeStats.vulnerabilitiesBySeverity
    ? [
        { name: 'Critical', value: safeStats.vulnerabilitiesBySeverity.critical, color: SEVERITY_COLORS.CRITICAL },
        { name: 'High', value: safeStats.vulnerabilitiesBySeverity.high, color: SEVERITY_COLORS.HIGH },
        { name: 'Medium', value: safeStats.vulnerabilitiesBySeverity.medium, color: SEVERITY_COLORS.MEDIUM },
        { name: 'Low', value: safeStats.vulnerabilitiesBySeverity.low, color: SEVERITY_COLORS.LOW },
        { name: 'Info', value: safeStats.vulnerabilitiesBySeverity.info, color: SEVERITY_COLORS.INFO },
      ].filter((d) => d.value > 0)
    : [];

  const scanStatusData = safeStats.scansByStatus
    ? Object.entries(safeStats.scansByStatus).map(([status, count]) => ({ status, count }))
    : [];

  const recentVulns = safeStats.recentVulnerabilities?.slice(0, 5) || [];

  const OwaspCategories = [
    { key: 'A01_BROKEN_ACCESS_CONTROL', label: 'Broken Access Control', short: 'A01' },
    { key: 'A02_CRYPTOGRAPHIC_FAILURES', label: 'Cryptographic Failures', short: 'A02' },
    { key: 'A03_INJECTION', label: 'Injection', short: 'A03' },
    { key: 'A04_INSECURE_DESIGN', label: 'Insecure Design', short: 'A04' },
    { key: 'A05_SECURITY_MISCONFIGURATION', label: 'Security Misconfiguration', short: 'A05' },
    { key: 'A06_VULNERABLE_COMPONENTS', label: 'Vulnerable Components', short: 'A06' },
    { key: 'A07_AUTHENTICATION_FAILURES', label: 'Authentication Failures', short: 'A07' },
    { key: 'A08_SOFTWARE_DATA_INTEGRITY_FAILURES', label: 'Software & Data Integrity', short: 'A08' },
    { key: 'A09_LOGGING_MONITORING', label: 'Logging & Monitoring', short: 'A09' },
    { key: 'A10_SSRF', label: 'Server-Side Request Forgery', short: 'A10' },
  ];

  return (
    <Box>
      <PageHeader
        title="Security Dashboard"
        subtitle="Monitor vulnerabilities, track security scans, and manage remediation"
        actions={
          <Button variant="contained" startIcon={<PlayArrow />} href="/security/scans/new">
            New Scan
          </Button>
        }
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <StatsCard
            icon={<SecurityIcon sx={{ fontSize: 40 }} />}
            value={safeStats.vulnerabilitiesBySeverity.critical}
            label="Critical Issues"
            bgcolor="#fef2f2"
            iconColor="#dc2626"
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <StatsCard
            icon={<BugReport sx={{ fontSize: 40 }} />}
            value={safeStats.vulnerabilitiesBySeverity.high}
            label="High Severity"
            bgcolor="#fff7ed"
            iconColor="#ea580c"
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <StatsCard
            icon={<Assessment sx={{ fontSize: 40 }} />}
            value={safeStats.totalScans}
            label="Total Scans"
            iconColor="#3b82f6"
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <StatsCard
            icon={<Shield sx={{ fontSize: 40 }} />}
            value={safeStats.totalVulnerabilities}
            label="Total Vulnerabilities"
            iconColor="#10b981"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Vulnerabilities by Severity</Typography>
              {severityData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={severityData}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={80}
                      paddingAngle={5} dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {severityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box display="flex" alignItems="center" justifyContent="center" height={250}>
                  <Typography color="text.secondary">No vulnerabilities found</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <SecurityScoreCard vulnerabilitiesBySeverity={safeStats.vulnerabilitiesBySeverity} />
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Scan Status Distribution</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={scanStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <VulnTrendChart data={[]} />
        </Grid>

        <Grid item xs={12} md={4}>
          <AlertsPanel projectId="" />
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>OWASP Top 10 Tracking</Typography>
              <Grid container spacing={2}>
                {OwaspCategories.map((cat) => {
                  const count = (safeStats.owaspStats as Record<string, number>)?.[cat.key] || 0;
                  return (
                    <Grid item xs={6} sm={4} md={2.4} key={cat.key}>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 1,
                          bgcolor: count > 0 ? '#fef2f2' : '#f9fafb',
                          border: count > 0 ? '1px solid #dc2626' : '1px solid #e5e7eb',
                          textAlign: 'center',
                        }}
                      >
                        <Typography variant="h6" fontWeight="bold">{cat.short}</Typography>
                        <Typography variant="body2" color="text.secondary">{cat.label.split(' ')[0]}</Typography>
                        <Typography variant="h5" fontWeight="bold" color={count > 0 ? 'error' : 'success'}>{count}</Typography>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Recent Vulnerabilities</Typography>
              {recentVulns.length > 0 ? (
                <Box>
                  {recentVulns.map((vuln) => (
                    <Box
                      key={vuln.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 2,
                        borderBottom: '1px solid #e5e7eb',
                      }}
                    >
                      <Box>
                        <Typography variant="subtitle1" fontWeight="medium">{vuln.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {vuln.scan?.name} - {vuln.affectedUrl || 'N/A'}
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <SeverityChip severity={vuln.severity} />
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography color="text.secondary" textAlign="center" py={4}>No recent vulnerabilities</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
