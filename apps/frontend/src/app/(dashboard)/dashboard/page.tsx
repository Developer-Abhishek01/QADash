'use client';

import {
  PlayArrow as ExecutionIcon,
  CheckCircle as PassIcon,
  Error as FailIcon,
  TrendingUp as TrendIcon,
  Speed as PerformanceIcon,
} from '@mui/icons-material';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  LinearProgress,
  Chip,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { executionsApi, analyticsApi } from '@/lib/api/client';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  color?: 'primary' | 'success' | 'warning' | 'error';
}

function StatCard({ title, value, subtitle, icon, trend, color = 'primary' }: StatCardProps) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={700}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Chip
                icon={<TrendIcon />}
                label={trend}
                size="small"
                color="success"
                sx={{ mt: 1 }}
              />
            )}
          </Box>
          <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.main` }}>{icon}</Avatar>
        </Box>
      </CardContent>
    </Card>
  );
}

interface RecentExecution {
  id: string;
  name: string;
  duration: string;
  time: string;
  status: string;
}

interface FlakyTestData {
  name: string;
  flaky: string;
}

const formatDuration = (ms: number | null | undefined): string => {
  if (!ms || ms <= 0) return '-';
  if (ms < 1000) return `${ms}ms`;
  const secs = ms / 1000;
  if (secs < 60) return `${secs.toFixed(1)}s`;
  const mins = Math.floor(secs / 60);
  return `${mins}m ${Math.round(secs % 60)}s`;
};

const formatTime = (iso: string | null | undefined): string => {
  if (!iso) return '-';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '-' : d.toLocaleString();
};

export default function DashboardPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [stats, setStats] = useState<{
    totalExecutions: number;
    passRate: string;
    failedTests: number;
    avgDuration: string;
    recentExecutions: RecentExecution[];
    flakyTests: FlakyTestData[];
  }>({
    totalExecutions: 0,
    passRate: '0%',
    failedTests: 0,
    avgDuration: '0s',
    recentExecutions: [],
    flakyTests: []
  });

  const [hasRunning, setHasRunning] = useState(false);

  const fetchDashboardStats = async () => {
    try {
      const [executions, flaky] = await Promise.all([
        executionsApi.list(),
        analyticsApi.getFlakyTests().catch(() => null),
      ]);
      const execList = Array.isArray(executions)
        ? executions as { id?: string; name?: string; status?: string; duration?: number; startedAt?: string }[]
        : [];
      setHasRunning(execList.some(e => (e.status || '').toUpperCase() === 'RUNNING'));
      const passed = execList.filter(e => (e.status || '').toUpperCase() === 'PASSED').length;
      const failed = execList.filter(e => (e.status || '').toUpperCase() === 'FAILED').length;
      const total = execList.length;
      const recent = execList.slice(0, 5).map(e => ({
        id: e.id || '',
        name: e.name || 'Execution',
        duration: formatDuration(e.duration),
        time: formatTime(e.startedAt),
        status: e.status || 'PENDING',
      }));
      const durations = execList.map(e => e.duration || 0);
      const avgMs = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
      const flakyData = flaky as { flakyTests?: { name?: string; flakinessScore?: number }[] } | null;
      const flakyList: FlakyTestData[] = (flakyData?.flakyTests || []).map(f => ({
        name: f.name || 'Unknown test',
        flaky: `${Math.max(0, Math.min(100, Math.round(f.flakinessScore ?? 0)))}%`,
      }));

      setStats(prev => ({
        ...prev,
        totalExecutions: total,
        passRate: total > 0 ? ((passed / total) * 100).toFixed(1) + '%' : '0%',
        failedTests: failed,
        avgDuration: avgMs > 0 ? formatDuration(avgMs) : '0s',
        recentExecutions: recent,
        flakyTests: flakyList.length > 0 ? flakyList.slice(0, 3) : prev.flakyTests,
      }));
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchDashboardStats();
    if (hasRunning) {
      const interval = setInterval(fetchDashboardStats, 10000); // Poll only while tests are running
      return () => clearInterval(interval);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasRunning]);

  if (!isMounted) return null;

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        subtitle="Welcome back! Here's what's happening with your tests."
      >
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Chip label="Today" color="primary" />
          <Chip label="Last 7 days" variant="outlined" />
        </Box>
      </PageHeader>

      <Grid container spacing={3}>
        {/* Stats Row */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Executions"
            value={stats.totalExecutions}
            subtitle="Overall"
            icon={<ExecutionIcon />}
            trend="+12%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pass Rate"
            value={stats.passRate}
            subtitle="Execution Accuracy"
            icon={<PassIcon />}
            color="success"
            trend="+2.3%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Failed/Bugs"
            value={stats.failedTests}
            subtitle="Needs attention"
            icon={<FailIcon />}
            color="error"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Avg Duration"
            value={stats.avgDuration}
            subtitle="Per test"
            icon={<PerformanceIcon />}
            color="warning"
            trend="-5%"
          />
        </Grid>

        {/* Recent Executions */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Executions
              </Typography>
              <List>
                {stats.recentExecutions.map((execution: RecentExecution) => (
                  <ListItem
                    key={execution.id}
                    sx={{
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '&:last-child': { borderBottom: 0 },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'background.default' }}>
                        <ExecutionIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={execution.name}
                      secondary={`${execution.duration} • ${execution.time}`}
                    />
                    <StatusBadge status={execution.status} />
                  </ListItem>
                ))}
                {stats.recentExecutions.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                    No recent executions found.
                  </Typography>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Flaky Tests */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Flaky Tests
              </Typography>
              <List>
                {stats.flakyTests.length > 0 ? stats.flakyTests.map((test: FlakyTestData, index: number) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemText
                      primary={test.name}
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <LinearProgress
                            variant="determinate"
                            value={parseInt(test.flaky)}
                            sx={{ flex: 1, height: 6, borderRadius: 3 }}
                          />
                          <Typography variant="caption">{test.flaky}</Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                )) : (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                    No flaky tests data available.
                  </Typography>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip label="Run All Tests" color="primary" clickable onClick={() => router.push('/executions')} />
                <Chip label="Generate Report" variant="outlined" clickable onClick={() => router.push('/reports')} />
                <Chip label="Create Test" variant="outlined" clickable onClick={() => router.push('/test-cases')} />
                <Chip label="View Analytics" variant="outlined" clickable onClick={() => router.push('/analytics')} />
                <Chip label="Manage Environments" variant="outlined" clickable onClick={() => router.push('/admin/environments')} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}