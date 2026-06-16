'use client';

import { useState, useEffect } from 'react';
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
import {
  PlayArrow as ExecutionIcon,
  CheckCircle as PassIcon,
  Error as FailIcon,
  TrendingUp as TrendIcon,
  Speed as PerformanceIcon,
} from '@mui/icons-material';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useRouter } from 'next/navigation';
import { executionsApi } from '@/lib/api/client';

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



export default function DashboardPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [stats, setStats] = useState({
    totalExecutions: 0,
    passRate: '0%',
    failedTests: 0,
    avgDuration: '0s',
    recentExecutions: [],
    flakyTests: [
      { name: 'Payment Gateway', flaky: '35%', trend: 'up' },
      { name: 'OAuth Login', flaky: '28%', trend: 'down' },
      { name: 'File Upload', flaky: '22%', trend: 'up' },
    ]
  });

  const fetchDashboardStats = async () => {
    try {
      const executions = await executionsApi.list();
      const passed = Array.isArray(executions) ? executions.filter(e => e.status === 'passed').length : 0;
      const failed = Array.isArray(executions) ? executions.filter(e => e.status === 'failed').length : 0;
      const total = Array.isArray(executions) ? executions.length : 0;
      const recent = Array.isArray(executions) ? executions.slice(0, 5) : [];
      
      setStats(prev => ({
        ...prev,
        totalExecutions: total,
        passRate: total > 0 ? ((passed / total) * 100).toFixed(1) + '%' : '0%',
        failedTests: failed,
        recentExecutions: recent as any
      }));
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchDashboardStats();
    const interval = setInterval(fetchDashboardStats, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

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
                {stats.recentExecutions.map((execution: any) => (
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
                {stats.flakyTests.map((test, index) => (
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
                ))}
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