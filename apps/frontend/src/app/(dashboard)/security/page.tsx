'use client';

import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,

} from '@mui/material';
import {
  Security as SecurityIcon,
  BugReport,
  Assessment,
  PlayArrow,
  Shield,
} from '@mui/icons-material';
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
import { useSecurityDashboard, useSecurityScans } from '@/lib/security/hooks';
import { PageHeader } from '@/components/common/PageHeader';
import { Loading } from '@/components/feedback/Loading';

const SEVERITY_COLORS = {
  CRITICAL: '#dc2626',
  HIGH: '#ea580c',
  MEDIUM: '#ca8a04',
  LOW: '#65a30d',
  INFO: '#3b82f6',
};

export default function SecurityDashboard() {
  const { data: statsFromApi, isLoading: statsLoading } = useSecurityDashboard();
  const { data: _scansData, isLoading: _scansLoading } = useSecurityScans({ limit: 10 });

  const stats = statsFromApi || {
    vulnerabilitiesBySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    scansByStatus: { COMPLETED: 0, FAILED: 0, RUNNING: 0 },
    totalScans: 0,
    totalVulnerabilities: 0,
    owaspStats: {},
    recentVulnerabilities: []
  };

  if (statsLoading) return <Loading />;

  const severityData = stats?.vulnerabilitiesBySeverity
    ? [
        { name: 'Critical', value: stats.vulnerabilitiesBySeverity.critical, color: SEVERITY_COLORS.CRITICAL },
        { name: 'High', value: stats.vulnerabilitiesBySeverity.high, color: SEVERITY_COLORS.HIGH },
        { name: 'Medium', value: stats.vulnerabilitiesBySeverity.medium, color: SEVERITY_COLORS.MEDIUM },
        { name: 'Low', value: stats.vulnerabilitiesBySeverity.low, color: SEVERITY_COLORS.LOW },
        { name: 'Info', value: stats.vulnerabilitiesBySeverity.info, color: SEVERITY_COLORS.INFO },
      ].filter((d) => d.value > 0)
    : [];

  const scanStatusData = stats?.scansByStatus
    ? Object.entries(stats.scansByStatus).map(([status, count]) => ({
        status,
        count,
      }))
    : [];

  const recentVulns = stats?.recentVulnerabilities?.slice(0, 5) || [];

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
          <Button
            variant="contained"
            startIcon={<PlayArrow />}
            href="/security/scans/new"
          >
            New Scan
          </Button>
        }
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: '#fef2f2' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <SecurityIcon sx={{ fontSize: 40, color: '#dc2626' }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="#dc2626">
                    {stats?.vulnerabilitiesBySeverity.critical || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Critical Issues
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: '#fff7ed' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <BugReport sx={{ fontSize: 40, color: '#ea580c' }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="#ea580c">
                    {stats?.vulnerabilitiesBySeverity.high || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    High Severity
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Assessment sx={{ fontSize: 40, color: '#3b82f6' }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats?.totalScans || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Scans
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Shield sx={{ fontSize: 40, color: '#10b981' }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats?.totalVulnerabilities || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Vulnerabilities
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Vulnerabilities by Severity
              </Typography>
              {severityData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={severityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
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
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Scan Status Distribution
              </Typography>
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

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                OWASP Top 10 Tracking
              </Typography>
              <Grid container spacing={2}>
                {OwaspCategories.map((cat) => {
                  const count = (stats?.owaspStats as Record<string, number>)?.[cat.key] || 0;
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
                        <Typography variant="h6" fontWeight="bold">
                          {cat.short}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {cat.label.split(' ')[0]}
                        </Typography>
                        <Typography variant="h5" fontWeight="bold" color={count > 0 ? 'error' : 'success'}>
                          {count}
                        </Typography>
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
              <Typography variant="h6" gutterBottom>
                Recent Vulnerabilities
              </Typography>
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
                        <Typography variant="subtitle1" fontWeight="medium">
                          {vuln.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {vuln.scan?.name} - {vuln.affectedUrl || 'N/A'}
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                          label={vuln.severity}
                          size="small"
                          sx={{
                            bgcolor: SEVERITY_COLORS[vuln.severity],
                            color: 'white',
                          }}
                        />
                        <Chip
                          label={vuln.status}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography color="text.secondary" textAlign="center" py={4}>
                  No recent vulnerabilities
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}