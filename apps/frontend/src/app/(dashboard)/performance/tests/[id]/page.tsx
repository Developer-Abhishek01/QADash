'use client';

import {
  ArrowBack,
  PlayArrow,
  Stop,
  Download,
  Assessment,
  Speed,
  Timer,
  TrendingUp,
} from '@mui/icons-material';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { useParams, useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';

import PageHeader from '@/components/common/PageHeader';
import Loading from '@/components/feedback/Loading';
import { PerformanceStatusChip, TestTypeChip, MetricCard, MetricChart, RealtimeMetrics } from '@/components/performance';
import { usePerfSocket } from '@/components/performance/usePerfSocket';
import { usePerformanceTest, useRunPerformanceTest, useCancelPerformanceTest, useTestMetrics, useRealtimeMetrics } from '@/lib/performance/hooks';
import type { PerformanceMetric } from '@/lib/performance/types';

export default function TestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const testId = params.id as string;

  const { data: test, isLoading, refetch } = usePerformanceTest(testId);
  const { data: metrics } = useTestMetrics(testId);
  const { data: realtimeData } = useRealtimeMetrics(testId);

  const runTest = useRunPerformanceTest();
  const cancelTest = useCancelPerformanceTest();

  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportFormat, setReportFormat] = useState('html');
  const [reportType, setReportType] = useState('executive');

  const [liveMetrics, setLiveMetrics] = useState<PerformanceMetric[] | null>(null);

  const onRealtimeMetrics = useCallback((data: unknown) => {
    const d = data as { metrics: unknown; status: string };
    setLiveMetrics(d.metrics as unknown as PerformanceMetric[]);
    if (d.status === 'COMPLETED' || d.status === 'FAILED') {
      refetch();
    }
  }, [refetch]);

  usePerfSocket(test?.projectId, testId, {
    onRealtimeMetrics,
    onCompleted: (data: unknown) => {
      if ((data as { testId: string }).testId === testId) refetch();
    },
  });

  if (isLoading) return <Loading />;
  if (!test) return <Typography>Test not found</Typography>;

  const isRunning = test.status === 'RUNNING' || test.status === 'QUEUED';
  const displayRealtime = (liveMetrics || realtimeData) as unknown as Parameters<typeof RealtimeMetrics>[0]['data'];

  const metricsList = (metrics || []) as PerformanceMetric[];
  const responseTimeData = metricsList.filter((m) => m.metricType === 'HTTP_REQ_DURATION');
  const throughputData = metricsList.filter((m) => m.metricName === 'http_reqs');
  const errorData = metricsList.filter((m) => m.metricName === 'http_req_failed');

  const rtChartData = responseTimeData.slice(-50).map((m) => ({
    time: new Date(m.timestamp as string).toLocaleTimeString(),
    value: m.value as number,
  }));

  const tpChartData = throughputData.slice(-50).map((m) => ({
    time: new Date(m.timestamp as string).toLocaleTimeString(),
    value: m.value as number,
  }));

  const erChartData = errorData.slice(-50).map((m) => ({
    time: new Date(m.timestamp as string).toLocaleTimeString(),
    value: (m.value as number) * 100,
  }));

  const handleGenerateReport = () => {
    setReportDialogOpen(true);
  };

  const handleDownloadReport = () => {
    if (test.summary) {
      const blob = new Blob([JSON.stringify(test.summary, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `${test.name}-report.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setReportDialogOpen(false);
  };

  return (
    <Box>
      <PageHeader
        title={test.name}
        subtitle={`${test.testType} test - ${test.project?.name || 'N/A'}`}
        actions={
          <Button startIcon={<ArrowBack />} onClick={() => router.push('/performance/tests')}>
            Back to Tests
          </Button>
        }
      />

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={2}>
                  <PerformanceStatusChip status={test.status} size="medium" />
                </Grid>
                <Grid item xs={6} md={2}>
                  <Typography variant="caption" color="text.secondary">Type</Typography>
                  <TestTypeChip type={test.testType} />
                </Grid>
                <Grid item xs={6} md={2}>
                  <Typography variant="caption" color="text.secondary">Environment</Typography>
                  <Typography variant="body2">{test.environment?.name || '-'}</Typography>
                </Grid>
                <Grid item xs={6} md={2}>
                  <Typography variant="caption" color="text.secondary">Duration</Typography>
                  <Typography variant="body2">{test.duration ? `${(test.duration / 1000).toFixed(1)}s` : '-'}</Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box display="flex" gap={1} justifyContent="flex-end">
                    {['DRAFT', 'PENDING', 'QUEUED'].includes(test.status) && (
                      <Button size="small" variant="contained" startIcon={<PlayArrow />} onClick={() => runTest.mutate(testId)}>
                        Run
                      </Button>
                    )}
                    {isRunning && (
                      <Button size="small" color="error" variant="outlined" startIcon={<Stop />} onClick={() => cancelTest.mutate(testId)}>
                        Cancel
                      </Button>
                    )}
                    {test.status === 'COMPLETED' && (
                      <>
                        <Button size="small" variant="outlined" startIcon={<Download />} onClick={handleGenerateReport}>
                          Report
                        </Button>
                        <Button size="small" variant="contained" startIcon={<Assessment />} onClick={() => router.push(`/performance/tests`)}>
                          Compare
                        </Button>
                      </>
                    )}
                  </Box>
                </Grid>
              </Grid>

              {isRunning && (
                <Box mt={2}>
                  <LinearProgress sx={{ height: 6, borderRadius: 3 }} />
                </Box>
              )}

              {test.status === 'FAILED' && test.errorMessage && (
                <Alert severity="error" sx={{ mt: 2 }}>{test.errorMessage}</Alert>
              )}

              {test.description && (
                <Typography variant="body2" color="text.secondary" mt={2}>{test.description}</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <RealtimeMetrics data={displayRealtime} isRunning={isRunning} />
        </Grid>

        <Grid item xs={6} md={3}>
          <MetricCard
            icon={<Timer sx={{ fontSize: 36 }} />}
            value={test.avgResponseTime ? `${test.avgResponseTime.toFixed(0)}ms` : '-'}
            label="Avg Response Time"
            subtitle={test.p95ResponseTime ? `P95: ${test.p95ResponseTime.toFixed(0)}ms` : undefined}
            color="#3b82f6"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <MetricCard
            icon={<Speed sx={{ fontSize: 36 }} />}
            value={test.avgThroughput ? `${test.avgThroughput.toFixed(1)}/s` : '-'}
            label="Avg Throughput"
            subtitle={test.totalRequests ? `${test.totalRequests} total` : undefined}
            color="#10b981"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <MetricCard
            icon={<TrendingUp sx={{ fontSize: 36 }} />}
            value={test.p99ResponseTime ? `${test.p99ResponseTime.toFixed(0)}ms` : '-'}
            label="P99 Response Time"
            subtitle={test.maxVus ? `Max VUs: ${test.maxVus}` : undefined}
            color="#8b5cf6"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <MetricCard
            icon={<Assessment sx={{ fontSize: 36 }} />}
            value={test.errorRate ? `${test.errorRate.toFixed(2)}%` : '0%'}
            label="Error Rate"
            color={test.errorRate > 5 ? '#dc2626' : '#10b981'}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <MetricChart
            title="Response Time"
            data={rtChartData}
            xKey="time"
            lines={[{ dataKey: 'value', stroke: '#3b82f6', name: 'Response Time (ms)' }]}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <MetricChart
            title="Throughput"
            data={tpChartData}
            xKey="time"
            lines={[{ dataKey: 'value', stroke: '#10b981', name: 'Requests/s' }]}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <MetricChart
            title="Error Rate"
            data={erChartData}
            xKey="time"
            lines={[{ dataKey: 'value', stroke: '#dc2626', name: 'Error Rate (%)' }]}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Test Configuration</Typography>
              <Grid container spacing={1}>
                {test.config && Object.entries(test.config as Record<string, unknown>).map(([key, val]) => (
                  <Grid item xs={6} key={key}>
                    <Typography variant="caption" color="text.secondary">{key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}</Typography>
                    <Typography variant="body2">{String(val)}</Typography>
                  </Grid>
                ))}
                {test.tags && test.tags.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Tags</Typography>
                    <Box display="flex" gap={0.5} mt={0.5}>
                      {test.tags.map((tag: string) => (
                        <Chip key={tag} label={tag} size="small" />
                      ))}
                    </Box>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>K6 Script</Typography>
              <Box
                component="pre"
                sx={{
                  bgcolor: '#1e293b',
                  color: '#e2e8f0',
                  p: 2,
                  borderRadius: 1,
                  overflow: 'auto',
                  fontSize: '0.75rem',
                  maxHeight: 300,
                  fontFamily: 'monospace',
                }}
              >
                {test.script}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={reportDialogOpen} onClose={() => setReportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Download Report</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} mt={1}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Format</InputLabel>
                <Select value={reportFormat} onChange={(e) => setReportFormat(e.target.value)} label="Format">
                  <MenuItem value="json">JSON</MenuItem>
                  <MenuItem value="html">HTML</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select value={reportType} onChange={(e) => setReportType(e.target.value)} label="Type">
                  <MenuItem value="executive">Executive Summary</MenuItem>
                  <MenuItem value="detailed">Detailed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" startIcon={<Download />} onClick={handleDownloadReport}>
            Download
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
