'use client';

import {
  Timeline as TimelineIcon,
  PieChart as PieChartIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Divider,
  Button,
} from '@mui/material';

import { PageHeader } from '@/components/common/PageHeader';
import { Loading } from '@/components/feedback/Loading';
import { useAnalyticsOverview, useAnalyticsCoverage, useAnalyticsFlaky } from '@/lib/analytics/hooks';

interface AnalyticsOverviewData {
  successRate: number;
  total: number;
  passed: number;
  failed: number;
}

interface AnalyticsCoverageData {
  coverage: number;
  automated: number;
  manual: number;
}

interface FlakyTestItem {
  flaky: number;
  name: string;
  module?: string;
}

export default function AnalyticsPage() {
  const { data: overview, isLoading, refetch } = useAnalyticsOverview();
  const { data: coverage } = useAnalyticsCoverage();
  const { data: flaky } = useAnalyticsFlaky();

  if (isLoading) return <Loading />;

  return (
    <Box>
      <PageHeader
        title="Analytics"
        subtitle="Historical trends and deep quality insights"
        actions={
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => refetch()}>Refresh</Button>
        }
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <TimelineIcon color="primary" />
                <Typography variant="h6">Execution Success Trend</Typography>
              </Box>
              <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f9f9f9', borderRadius: 1 }}>
                {overview ? (
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" fontWeight={700}>{(overview as AnalyticsOverviewData).successRate ?? '-'}%</Typography>
                    <Typography variant="body2" color="text.secondary">Success Rate</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Total: {(overview as AnalyticsOverviewData).total ?? 0} | Passed: {(overview as AnalyticsOverviewData).passed ?? 0} | Failed: {(overview as AnalyticsOverviewData).failed ?? 0}
                    </Typography>
                  </Box>
                ) : (
                  <Typography color="text.secondary">No historical data available for the selected period.</Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <PieChartIcon color="secondary" />
                <Typography variant="h6">Test Coverage</Typography>
              </Box>
              <Box sx={{ py: 4 }}>
                <Box sx={{ position: 'relative', height: 200, width: 200, mx: 'auto' }}>
                  <Box sx={{ height: '100%', width: '100%', borderRadius: '50%', border: '20px solid', borderColor: coverage ? '#4CAF50' : '#eee' }} />
                  <Typography variant="h3" sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontWeight: 700, color: coverage ? '#4CAF50' : '#ccc' }}>
                    {(coverage as AnalyticsCoverageData)?.coverage ?? 0}%
                  </Typography>
                </Box>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Automated</Typography>
                  <Typography variant="body1" fontWeight={600}>{(coverage as AnalyticsCoverageData)?.automated ?? 0}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Manual</Typography>
                  <Typography variant="body1" fontWeight={600}>{(coverage as AnalyticsCoverageData)?.manual ?? 0}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Defect Density by Module</Typography>
              <Box sx={{ p: 4, textAlign: 'center' }}>
                {flaky ? (
                  <Grid container spacing={2}>
                    {(flaky as FlakyTestItem[]).map((item: FlakyTestItem, i: number) => (
                      <Grid item xs={12} sm={6} md={3} key={i}>
                        <Typography variant="h4" fontWeight={700}>{item.flaky ?? '-'}</Typography>
                        <Typography variant="body2" color="text.secondary">{item.name ?? item.module ?? 'Module'}</Typography>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Typography color="text.secondary">Run more tests to see defect density analysis.</Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
