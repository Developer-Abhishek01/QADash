'use client';

import {
  Speed,
  TrendingUp,
  PlayArrow,
  Timer,
  Assessment,
} from '@mui/icons-material';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
} from '@mui/material';
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

import { PageHeader } from '@/components/common/PageHeader';
import { Loading } from '@/components/feedback/Loading';
import { PerformanceStatusChip, TestTypeChip, MetricCard, AlertsPanel } from '@/components/performance';
import { usePerformanceDashboard } from '@/lib/performance/hooks';

export default function PerformanceDashboard() {
  const projectId = '';
  const { data: statsFromApi, isLoading: statsLoading } = usePerformanceDashboard(projectId || undefined);

  const stats = statsFromApi || {
    totalTests: 0,
    overallStats: { avgResponseTime: 0, avgErrorRate: 0 },
    activeTests: [],
    testsByStatus: { COMPLETED: 0, FAILED: 0, RUNNING: 0 },
    testsByType: {},
    recentTests: []
  };

  if (statsLoading) return <Loading />;

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
        <Grid item xs={6} md={3}>
          <MetricCard icon={<Speed sx={{ fontSize: 36 }} />} value={stats?.totalTests || 0} label="Total Tests" color="#2563eb" bgcolor="#eff6ff" />
        </Grid>
        <Grid item xs={6} md={3}>
          <MetricCard icon={<Timer sx={{ fontSize: 36 }} />} value={stats?.overallStats?.avgResponseTime?.toFixed(0) || '0'} label="Avg Response Time" subtitle="ms" color="#3b82f6" />
        </Grid>
        <Grid item xs={6} md={3}>
          <MetricCard icon={<TrendingUp sx={{ fontSize: 36 }} />} value={`${stats?.overallStats?.avgErrorRate?.toFixed(2) || '0'}%`} label="Avg Error Rate" color="#10b981" />
        </Grid>
        <Grid item xs={6} md={3}>
          <MetricCard icon={<Assessment sx={{ fontSize: 36 }} />} value={activeTests.length} label="Running Tests" color="#8b5cf6" />
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
                          <PerformanceStatusChip status={test.status} />
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

        <Grid item xs={12} md={4}>
          <AlertsPanel projectId={projectId || undefined} />
        </Grid>

        <Grid item xs={12} md={8}>
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
                        <TestTypeChip type={test.testType} />
                        <PerformanceStatusChip status={test.status} />
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