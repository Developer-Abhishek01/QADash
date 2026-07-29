'use client';

import {
  Engineering as WorkerIcon,
  Speed as SpeedIcon,
  Refresh as RefreshIcon,
  Storage as StorageIcon,
  Memory as MemoryIcon,
  CheckCircleOutline as SuccessIcon,
  ErrorOutline as ErrorIcon,
  WarningAmber as WarningIcon,
  Pause as PauseIcon,
  PlayArrow as ResumeIcon,
  DeleteSweep as DrainIcon,
  Scale as ScaleIcon,
  Loop as RetryAllIcon,
} from '@mui/icons-material';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Divider,
  Chip,
  Button,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Snackbar,
  Alert,
} from '@mui/material';
import { useState } from 'react';

import { PageHeader } from '@/components/common/PageHeader';
import { Loading } from '@/components/feedback/Loading';
import { WorkerStatusChip, UtilizationBar, FailedJobsPanel, ScaleDialog } from '@/components/workers';
import {
  useWorkersStats,
  useQueueHealth,
  usePauseQueue,
  useResumeQueue,
  useDrainQueue,
  useRetryAllFailed,
} from '@/lib/workers/hooks';
import type { Worker, QueueMetrics } from '@/lib/workers/types';

const QUEUE_ICONS: Record<string, typeof SpeedIcon> = {
  execution: SpeedIcon,
  report: StorageIcon,
  ai: MemoryIcon,
};

export default function WorkerManagementPage() {
  const { data: workersStats, isLoading: statsLoading, isRefetching: statsRefetching, refetch: refetchStats } = useWorkersStats();
  const { data: queueHealth, isLoading: healthLoading, isRefetching: healthRefetching, refetch: refetchHealth } = useQueueHealth();
  const pauseQueue = usePauseQueue();
  const resumeQueue = useResumeQueue();
  const drainQueue = useDrainQueue();
  const retryAllFailed = useRetryAllFailed();

  const [scaleOpen, setScaleOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  const isLoading = statsLoading || healthLoading;
  const isRefreshing = statsRefetching || healthRefetching;
  const workers = workersStats?.workers ?? [];
  const queues = queueHealth?.queues ?? {};

  const handleRefresh = () => {
    refetchStats();
    refetchHealth();
  };

  const handleQueueAction = async (name: string, action: string, apiCall: () => Promise<unknown>) => {
    try {
      await apiCall();
      setSnackbar({ message: `${name} ${action}`, severity: 'success' });
    } catch {
      setSnackbar({ message: `Failed to ${action} ${name}`, severity: 'error' });
    }
  };

  if (isLoading) return <Loading />;

  return (
    <Box>
      <PageHeader
        title="Worker Management"
        subtitle="Monitor and manage execution workers and AI engines"
        actions={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<ScaleIcon />}
              onClick={() => setScaleOpen(true)}
            >
              Scale Workers
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </Box>
        }
      />

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" fontWeight={700}>{workersStats?.totalWorkers ?? 0}</Typography>
              <Typography variant="caption" color="text.secondary">Total Workers</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" fontWeight={700} color="success.main">{workersStats?.activeWorkers ?? 0}</Typography>
              <Typography variant="caption" color="text.secondary">Active Workers</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" fontWeight={700}>{workersStats?.totalJobsActive ?? 0}</Typography>
              <Typography variant="caption" color="text.secondary">Active Jobs</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" fontWeight={700}>{workersStats?.averageUtilization ?? 0}%</Typography>
              <Typography variant="caption" color="text.secondary">Avg Utilization</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="h6" sx={{ mb: 2 }}>Workers</Typography>
      <Grid container spacing={3}>
        {workers.length > 0 ? workers.map((worker: Worker) => (
          <Grid item xs={12} md={6} lg={3} key={worker.id}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WorkerIcon color="primary" />
                    <Typography variant="subtitle2">{worker.id}</Typography>
                  </Box>
                  <WorkerStatusChip status={worker.status} />
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Last heartbeat: {new Date(worker.lastHeartbeat).toLocaleTimeString()}
                </Typography>

                <Box sx={{ mt: 2 }}>
                  <UtilizationBar label="CPU" value={worker.cpu} />
                </Box>
                <Box sx={{ mt: 1.5 }}>
                  <UtilizationBar label="Memory" value={worker.memory} />
                </Box>
                <Box sx={{ mt: 1.5 }}>
                  <UtilizationBar label="Utilization" value={worker.utilization} errorThreshold={90} warningThreshold={75} />
                </Box>

                <Divider sx={{ my: 2 }} />
                <Grid container spacing={1}>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary" display="block">Active</Typography>
                    <Typography variant="body2" fontWeight={600}>{worker.jobsActive}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary" display="block">Completed</Typography>
                    <Typography variant="body2" fontWeight={600}>{worker.jobsCompleted}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary" display="block">Failed</Typography>
                    <Typography variant="body2" fontWeight={600} color={worker.jobsFailed > 0 ? 'error.main' : undefined}>{worker.jobsFailed}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )) : (
          <Grid item xs={12}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <WorkerIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                <Typography variant="body1" color="text.secondary">No workers currently connected.</Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Queue Health</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <List>
                {Object.entries(queues).length > 0 ? Object.entries(queues).map(([name, metrics]: [string, QueueMetrics]) => {
                  const Icon = QUEUE_ICONS[name] ?? SpeedIcon;
                  return (
                    <Box key={name}>
                      <ListItem
                        secondaryAction={
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="Retry all failed">
                              <IconButton
                                size="small"
                                onClick={() => handleQueueAction(name, 'retry all failed', () => retryAllFailed.mutateAsync(name))}
                                disabled={retryAllFailed.isPending || metrics.failed === 0}
                              >
                                <RetryAllIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={metrics.paused ? 'Resume' : 'Pause'}>
                              <IconButton
                                size="small"
                                onClick={() => metrics.paused
                                  ? handleQueueAction(name, 'resumed', () => resumeQueue.mutateAsync(name))
                                  : handleQueueAction(name, 'paused', () => pauseQueue.mutateAsync(name))
                                }
                                disabled={pauseQueue.isPending || resumeQueue.isPending}
                              >
                                {metrics.paused ? <ResumeIcon fontSize="small" /> : <PauseIcon fontSize="small" />}
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Drain queue">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleQueueAction(name, 'drained', () => drainQueue.mutateAsync(name))}
                                disabled={drainQueue.isPending}
                              >
                                <DrainIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        }
                      >
                        <ListItemIcon><Icon color={metrics.failed > 0 ? 'error' : metrics.active > 0 ? 'info' : 'disabled'} /></ListItemIcon>
                        <ListItemText
                          primary={name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          secondary={
                            `${metrics.waiting} waiting · ${metrics.active} active · ${metrics.completed} completed · ${metrics.failed} failed`
                          }
                        />
                        <Chip
                          label={metrics.paused ? 'Paused' : metrics.active > 0 ? 'Processing' : 'Idle'}
                          color={metrics.paused ? 'warning' : metrics.active > 0 ? 'info' : 'default'}
                          size="small"
                          sx={{ mr: 8 }}
                        />
                      </ListItem>
                      <Divider component="li" />
                    </Box>
                  );
                }) : (
                  <ListItem>
                    <ListItemText primary="No queues available" />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: queueHealth?.status === 'unhealthy' ? 'error.dark' : queueHealth?.status === 'degraded' ? 'warning.dark' : 'primary.dark', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Overall Health</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                {queueHealth?.status === 'healthy' ? <SuccessIcon /> : queueHealth?.status === 'degraded' ? <WarningIcon /> : <ErrorIcon />}
                <Typography variant="h5" sx={{ textTransform: 'capitalize' }}>{queueHealth?.status ?? 'Unknown'}</Typography>
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Workers: {queueHealth?.workers.active ?? 0} active / {queueHealth?.workers.idle ?? 0} idle
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Redis: {queueHealth?.redis.connected === false ? 'Disconnected' : 'Connected'}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.6, display: 'block', mt: 1 }}>
                Last updated: {queueHealth?.timestamp ? new Date(queueHealth.timestamp).toLocaleTimeString() : '-'}
              </Typography>
              {isRefreshing && (
                <Typography variant="caption" sx={{ opacity: 0.6, display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                  Auto-refreshing...
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4 }}>
        <FailedJobsPanel />
      </Box>

      <ScaleDialog open={scaleOpen} onClose={() => setScaleOpen(false)} />

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snackbar ? <Alert severity={snackbar.severity} sx={{}}>{snackbar.message}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
