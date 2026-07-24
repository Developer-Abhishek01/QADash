'use client';

import { Timer, Speed, TrendingUp, Error as ErrorIcon } from '@mui/icons-material';
import { Box, Card, CardContent, Typography, Grid, Chip, LinearProgress } from '@mui/material';

interface RealtimeMetric {
  latest: number;
  avg: number;
  min: number;
  max: number;
  count: number;
}

interface RealtimeMetricsData {
  timestamp: string;
  metrics: Record<string, RealtimeMetric>;
  active: boolean;
}

interface RealtimeMetricsProps {
  data?: RealtimeMetricsData | null;
  isRunning?: boolean;
}

export function RealtimeMetrics({ data, isRunning }: RealtimeMetricsProps) {
  const httpDuration = data?.metrics?.['http_req_duration'];
  const httpReqs = data?.metrics?.['http_reqs'];
  const vus = data?.metrics?.['vus'];
  const httpFailed = data?.metrics?.['http_req_failed'];

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6">Live Metrics</Typography>
          {isRunning && <Chip label="LIVE" size="small" color="error" sx={{ animation: 'pulse 2s infinite' }} />}
        </Box>

        {!isRunning && !data && (
          <Typography color="text.secondary" textAlign="center" py={4}>
            No active test
          </Typography>
        )}

        {isRunning && !data && (
          <Box textAlign="center" py={2}>
            <LinearProgress />
            <Typography variant="caption" color="text.secondary" mt={1}>
              Waiting for metrics...
            </Typography>
          </Box>
        )}

        {data && (
          <Grid container spacing={2}>
            {httpDuration && (
              <Grid item xs={6} sm={3}>
                <Box textAlign="center" p={1}>
                  <Timer sx={{ fontSize: 28, color: '#3b82f6' }} />
                  <Typography variant="h5" fontWeight="bold">
                    {httpDuration.latest.toFixed(0)}ms
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Response Time
                  </Typography>
                </Box>
              </Grid>
            )}
            {httpReqs && (
              <Grid item xs={6} sm={3}>
                <Box textAlign="center" p={1}>
                  <Speed sx={{ fontSize: 28, color: '#10b981' }} />
                  <Typography variant="h5" fontWeight="bold">
                    {httpReqs.latest.toFixed(1)}/s
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Throughput
                  </Typography>
                </Box>
              </Grid>
            )}
            {vus && (
              <Grid item xs={6} sm={3}>
                <Box textAlign="center" p={1}>
                  <TrendingUp sx={{ fontSize: 28, color: '#8b5cf6' }} />
                  <Typography variant="h5" fontWeight="bold">
                    {vus.latest.toFixed(0)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Active VUs
                  </Typography>
                </Box>
              </Grid>
            )}
            {httpFailed && (
              <Grid item xs={6} sm={3}>
                <Box textAlign="center" p={1}>
                  <ErrorIcon sx={{ fontSize: 28, color: httpFailed.latest > 0 ? '#dc2626' : '#10b981' }} />
                  <Typography variant="h5" fontWeight="bold" color={httpFailed.latest > 0 ? '#dc2626' : '#10b981'}>
                    {(httpFailed.latest * 100).toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Error Rate
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        )}

        {data?.metrics && Object.keys(data.metrics).length > 0 && (
          <Box mt={2}>
            <Typography variant="caption" color="text.secondary">
              Last updated: {new Date(data.timestamp).toLocaleTimeString()}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default RealtimeMetrics;
