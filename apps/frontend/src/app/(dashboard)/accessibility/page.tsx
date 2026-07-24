'use client';

import {
  Accessibility,
  Warning,
  CheckCircle,
  PlayArrow,
  Monitor,
} from '@mui/icons-material';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  LinearProgress,
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';

import { AccessibilityStatusChip, MetricCard } from '@/components/accessibility';
import { PageHeader } from '@/components/common/PageHeader';
import { Loading } from '@/components/feedback/Loading';
import { useAccessibilityDashboard } from '@/lib/accessibility/hooks';

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#dc2626',
  SERIOUS: '#ea580c',
  MODERATE: '#ca8a04',
  MINOR: '#65a30d',
};

export default function AccessibilityDashboard() {
  const projectId = '';
  const { data: statsFromApi, isLoading: statsLoading } = useAccessibilityDashboard(projectId || undefined);

  const stats = statsFromApi || {
    totalTests: 0,
    avgScore: 0,
    issuesByImpact: { critical: 0, serious: 0, moderate: 0, minor: 0 },
    activeTests: [],
    testsByStatus: { COMPLETED: 0, FAILED: 0, RUNNING: 0 },
    recentTests: []
  };

  if (statsLoading) return <Loading />;

  const activeTests = stats?.activeTests || [];
  const recentTests = stats?.recentTests || [];

  const severityData = stats?.issuesByImpact
    ? [
        { name: 'Critical', value: stats.issuesByImpact.critical, color: SEVERITY_COLORS.CRITICAL },
        { name: 'Serious', value: stats.issuesByImpact.serious, color: SEVERITY_COLORS.SERIOUS },
        { name: 'Moderate', value: stats.issuesByImpact.moderate, color: SEVERITY_COLORS.MODERATE },
        { name: 'Minor', value: stats.issuesByImpact.minor, color: SEVERITY_COLORS.MINOR },
      ].filter((d) => d.value > 0)
    : [];

  const statusData = stats?.testsByStatus
    ? Object.entries(stats.testsByStatus).map(([status, count]) => ({
        status,
        count,
      }))
    : [];

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#10b981';
    if (score >= 70) return '#ca8a04';
    return '#dc2626';
  };

  return (
    <Box>
      <PageHeader
        title="Accessibility Testing"
        subtitle="WCAG compliance, accessibility scores, and remediation"
        actions={
          <Button
            variant="contained"
            startIcon={<PlayArrow />}
            href="/accessibility/tests/new"
          >
            New Test
          </Button>
        }
      />

      <Grid container spacing={3}>
        <Grid item xs={6} md={3}>
          <MetricCard icon={<Accessibility sx={{ fontSize: 36 }} />} value={stats?.totalTests || 0} label="Total Tests" color="#2563eb" bgcolor="#eff6ff" />
        </Grid>
        <Grid item xs={6} md={3}>
          <MetricCard icon={<CheckCircle sx={{ fontSize: 36 }} />} value={`${stats?.avgScore?.toFixed(0) || '0'}%`} label="Avg Score" color={getScoreColor(stats?.avgScore || 0)} />
        </Grid>
        <Grid item xs={6} md={3}>
          <MetricCard icon={<Warning sx={{ fontSize: 36 }} />} value={stats?.issuesByImpact?.critical || 0} label="Critical Issues" color="#dc2626" bgcolor="#fef2f2" />
        </Grid>
        <Grid item xs={6} md={3}>
          <MetricCard icon={<Monitor sx={{ fontSize: 36 }} />} value={activeTests.length} label="Running Tests" color="#10b981" />
        </Grid>

        {activeTests.length > 0 && (
          <Grid item xs={12}>
            <Card sx={{ border: '1px solid #8b5cf6' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Active Test Executions
                </Typography>
                <Grid container spacing={2}>
                  {activeTests.map((test) => (
                    <Grid item xs={12} sm={6} md={4} key={test.id}>
                      <Box sx={{ p: 2, borderRadius: 1, bgcolor: '#faf5ff', border: '1px solid #ddd' }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="subtitle2" fontWeight="bold" noWrap>
                            {test.name}
                          </Typography>
                          <Chip label="Running" size="small" color="primary" />
                        </Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {test.scannedPages}/{test.totalPages} pages scanned
                        </Typography>
                        <LinearProgress sx={{ mt: 1 }} />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Issues by Severity
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
                  <Typography color="text.secondary">No issues found</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Test Status Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Tests
              </Typography>
              {recentTests.length > 0 ? (
                <Box>
                  {recentTests.slice(0, 5).map((test) => (
                    <Box
                      key={test.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        py: 1.5,
                        borderBottom: '1px solid #e5e7eb',
                      }}
                    >
                      <Box>
                        <Typography variant="subtitle2" fontWeight="medium">
                          {test.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(test.createdAt).toLocaleDateString()} • {test.project?.name}
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" fontWeight="bold" color={getScoreColor(test.score)}>
                            {test.score}%
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Score
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body2">
                            {test.totalIssues} issues
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {test.totalPages} pages
                          </Typography>
                        </Box>
                        <AccessibilityStatusChip status={test.status} />
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography color="text.secondary" textAlign="center" py={4}>
                  No recent tests
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}