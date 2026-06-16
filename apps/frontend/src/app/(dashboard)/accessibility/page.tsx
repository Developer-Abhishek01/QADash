'use client';

import { useState } from 'react';
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
  Accessibility,
  Warning,
  CheckCircle,
  PlayArrow,
  Monitor,
} from '@mui/icons-material';
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
import { useAccessibilityDashboard, useAccessibilityTests } from '@/lib/accessibility/hooks';
import { PageHeader } from '@/components/common/PageHeader';
import { Loading } from '@/components/feedback/Loading';

const SEVERITY_COLORS = {
  critical: '#dc2626',
  serious: '#ea580c',
  moderate: '#ca8a04',
  minor: '#65a30d',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#6b7280',
  QUEUED: '#3b82f6',
  RUNNING: '#8b5cf6',
  COMPLETED: '#10b981',
  FAILED: '#dc2626',
  CANCELLED: '#6b7280',
};

export default function AccessibilityDashboard() {
  const [projectId] = useState<string>('');
  const { data: statsFromApi, isLoading: statsLoading } = useAccessibilityDashboard(projectId || undefined);
  const { data: _testsData, isLoading: testsLoading } = useAccessibilityTests({ limit: 5 });

  const stats = statsFromApi || {
    totalTests: 0,
    avgScore: 0,
    issuesByImpact: { critical: 0, serious: 0, moderate: 0, minor: 0 },
    activeTests: [],
    testsByStatus: { COMPLETED: 0, FAILED: 0, RUNNING: 0 },
    recentTests: []
  };

  if (statsLoading || testsLoading) return <Loading />;

  const activeTests = stats?.activeTests || [];
  const recentTests = stats?.recentTests || [];

  const severityData = stats?.issuesByImpact
    ? [
        { name: 'Critical', value: stats.issuesByImpact.critical, color: SEVERITY_COLORS.critical },
        { name: 'Serious', value: stats.issuesByImpact.serious, color: SEVERITY_COLORS.serious },
        { name: 'Moderate', value: stats.issuesByImpact.moderate, color: SEVERITY_COLORS.moderate },
        { name: 'Minor', value: stats.issuesByImpact.minor, color: SEVERITY_COLORS.minor },
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
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: '#eff6ff' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Accessibility sx={{ fontSize: 40, color: '#2563eb' }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats?.totalTests || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Tests
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
                <CheckCircle sx={{ fontSize: 40, color: getScoreColor(stats?.avgScore || 0) }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold" color={getScoreColor(stats?.avgScore || 0)}>
                    {stats?.avgScore?.toFixed(0) || 0}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg Score
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: '#fef2f2' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Warning sx={{ fontSize: 40, color: '#dc2626' }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="#dc2626">
                    {stats?.issuesByImpact?.critical || 0}
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
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Monitor sx={{ fontSize: 40, color: '#10b981' }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {activeTests.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Running Tests
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
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
                        <Chip
                          label={test.status}
                          size="small"
                          sx={{
                            bgcolor: (STATUS_COLORS[test.status] || '#6b7280') + '20',
                            color: STATUS_COLORS[test.status] || '#6b7280',
                          }}
                        />
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