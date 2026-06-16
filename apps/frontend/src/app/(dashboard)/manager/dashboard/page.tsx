'use client';

import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Divider,
  Button,
  LinearProgress,
} from '@mui/material';
import {
  TrendingUp as TrendUpIcon,
  GetApp as DownloadIcon,
  CheckCircle as SuccessIcon,
  BugReport as BugIcon,
  Timer as TimeIcon,
  AutoFixHigh as AIIcon,
} from '@mui/icons-material';
import { PageHeader } from '@/components/common/PageHeader';

import { useState, useEffect } from 'react';
import { executionsApi } from '@/lib/api/client';

export default function ManagerDashboardPage() {
  const [stats, setStats] = useState({
    passRate: '0%',
    coverage: '0%',
    leakage: '0%',
    execTime: '0m'
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const executions = await executionsApi.list();
        const passed = executions.filter(e => e.status === 'passed').length;
        const total = executions.length;
        setStats(prev => ({
          ...prev,
          passRate: total > 0 ? ((passed / total) * 100).toFixed(1) + '%' : '0%'
        }));
      } catch (error) {
        console.error('Failed to fetch manager stats:', error);
      }
    };
    fetchStats();
  }, []);

  const kpis = [
    { label: 'Overall Pass Rate', value: stats.passRate, trend: '0%', isPositive: true, icon: <SuccessIcon color="success" /> },
    { label: 'Automation Coverage', value: stats.coverage, trend: '0%', isPositive: true, icon: <TrendUpIcon color="primary" /> },
    { label: 'Defect Leakage', value: stats.leakage, trend: '0%', isPositive: true, icon: <BugIcon color="error" /> },
    { label: 'Avg Execution Time', value: stats.execTime, trend: '0%', isPositive: true, icon: <TimeIcon color="warning" /> },
  ];
  return (
    <Box>
      <PageHeader
        title="Executive Dashboard"
        subtitle="High-level quality metrics and release readiness"
        actions={
          <Button variant="contained" startIcon={<DownloadIcon />}>
            Export Executive Report
          </Button>
        }
      />

      <Grid container spacing={3}>
        {kpis.map((kpi) => (
          <Grid item xs={12} md={3} key={kpi.label}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  {kpi.icon}
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: kpi.isPositive ? 'success.main' : 'error.main',
                      bgcolor: kpi.isPositive ? 'success.light' : 'error.light',
                      px: 1, borderRadius: 1, fontWeight: 'bold'
                    }}
                  >
                    {kpi.trend}
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={700}>{kpi.value}</Typography>
                <Typography variant="body2" color="text.secondary">{kpi.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}

        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Release Readiness Score</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 4 }}>
                <Typography variant="h2" color="success.main">88</Typography>
                <Box sx={{ flexGrow: 1 }}>
                  <LinearProgress variant="determinate" value={88} sx={{ height: 10, borderRadius: 5 }} />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Target: 95 | Minimum for release: 85
                  </Typography>
                </Box>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>Quality Gates Status</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Critical Bugs</Typography>
                    <Typography variant="body2" color="success.main">0 (Pass)</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Code Coverage</Typography>
                    <Typography variant="body2" color="warning.main">72% (Warning)</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Security Scan</Typography>
                    <Typography variant="body2" color="success.main">Clean (Pass)</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Performance Baseline</Typography>
                    <Typography variant="body2" color="success.main">Met (Pass)</Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', bgcolor: 'primary.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <AIIcon />
                <Typography variant="h6">AI Predictions</Typography>
              </Box>
              <Typography variant="body1" gutterBottom>
                Based on current sprint trends, AI predicts a <b>92% probability</b> of meeting the release deadline.
              </Typography>
              <Typography variant="body2" sx={{ mt: 2, opacity: 0.9 }}>
                Recommendation: Prioritize 3 remaining high-severity bugs to reach 95% readiness score.
              </Typography>
              <Button variant="contained" color="secondary" fullWidth sx={{ mt: 4 }}>
                Approve Release Candidate
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
