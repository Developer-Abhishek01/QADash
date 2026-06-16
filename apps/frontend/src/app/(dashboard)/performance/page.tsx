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
  Speed,
  TrendingUp,
  PlayArrow,
  Timer,
  Assessment,
} from '@mui/icons-material';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from 'recharts';
import { usePerformanceDashboard, usePerformanceTests } from '@/lib/performance/hooks';
import { PageHeader } from '@/components/common/PageHeader';
import { Loading } from '@/components/feedback/Loading';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6b7280',
  PENDING: '#6b7280',
  QUEUED: '#3b82f6',
  RUNNING: '#8b5cf6',
  COMPLETED: '#10b981',
  FAILED: '#dc2626',
  CANCELLED: '#6b7280',
};

const TEST_TYPE_LABELS: Record<string, string> = {
  LOAD: 'Load Test',
  STRESS: 'Stress Test',
  SPIKE: 'Spike Test',
  SOAK: 'Soak Test',
  SMOKE: 'Smoke Test',
};

export default function PerformanceDashboard() {
  const [projectId] = useState<string>('');
  const { data: statsFromApi, isLoading: statsLoading } = usePerformanceDashboard(projectId || undefined);
  const { data: _testsData, isLoading: testsLoading } = usePerformanceTests({ limit: 5 });

  const stats = statsFromApi || {
    totalTests: 0,
    overallStats: { avgResponseTime: 0, avgErrorRate: 0 },
    activeTests: [],
    testsByStatus: { COMPLETED: 0, FAILED: 0, RUNNING: 0 },
    testsByType: {},
    recentTests: []
  };

  if (statsLoading || testsLoading) return <Loading />;

  const activeTests = stats?.activeTests || [];
  const recentTests = stats?.recentTests || [];

  const statusData = stats?.testsByStatus
    ? Object.entries(stats.testsByStatus).map(([status, count]) => ({
        status,
        count,
      }))
    : [];

  const typeData = stats?.testsByType
    ? Object.entries(stats.testsByType).map(([type, data]) => ({
        type,
        count: data.count,
        avgResponse: Math.round(data.avgResponse || 0),
      }))
    : [];

  const chartData = recentTests.map((t) => ({
    name: t.name.substring(0, 20),
    responseTime: t.avgResponseTime || 0,
    p95: t.p95ResponseTime || 0,
    p99: t.p99ResponseTime || 0,
    throughput: t.avgThroughput || 0,
    errorRate: t.errorRate || 0,
  }));

  return (
    <Box>
      <PageHeader
        title="Performance Testing"
        subtitle="Monitor load tests, analyze metrics, and optimize performance"
        actions={
          <Button
            variant="contained"
            startIcon={<PlayArrow />}
            href="/performance/tests/new"
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
                <Speed sx={{ fontSize: 40, color: '#2563eb' }} />
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
                <Timer sx={{ fontSize: 40, color: '#3b82f6' }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats?.overallStats?.avgResponseTime?.toFixed(0) || 0}ms
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg Response Time
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
                <TrendingUp sx={{ fontSize: 40, color: '#10b981' }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats?.overallStats?.avgErrorRate?.toFixed(2) || 0}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg Error Rate
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
                <Assessment sx={{ fontSize: 40, color: '#8b5cf6' }} />
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
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 1,
                          bgcolor: '#faf5ff',
                          border: '1px solid #ddd',
                        }}
                      >
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="subtitle2" fontWeight="bold" noWrap>
                            {test.name}
                          </Typography>
                          <Chip label="Running" size="small" color="primary" />
                        </Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {test.project?.name}
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
                Response Time Trends
              </Typography>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <RechartsTooltip />
                    <Area type="monotone" dataKey="responseTime" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Avg" />
                    <Area type="monotone" dataKey="p95" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="P95" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <Box display="flex" alignItems="center" justifyContent="center" height={250}>
                  <Typography color="text.secondary">No test data available</Typography>
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
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tests by Type
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={typeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="type" type="category" width={80} />
                  <RechartsTooltip />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
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
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                          label={TEST_TYPE_LABELS[test.testType] || test.testType}
                          size="small"
                          variant="outlined"
                        />
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