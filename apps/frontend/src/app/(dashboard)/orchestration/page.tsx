'use client';

import {
  Add as AddIcon,
  PlaylistAdd as BatchIcon,
  PlayCircle as ExecuteIcon,
} from '@mui/icons-material';
import {
  Box,
  Grid,
  Button,
  Typography,
  Chip,
  Stack,
} from '@mui/material';
import { useState, useEffect, useCallback } from 'react';

import { PageHeader } from '@/components/common/PageHeader';
import { BatchJobDialog } from '@/components/orchestration/BatchJobDialog';
import { EventHistoryTimeline } from '@/components/orchestration/EventHistoryTimeline';
import { ExecutionOrchestrationDialog } from '@/components/orchestration/ExecutionOrchestrationDialog';
import { JobCreateDialog } from '@/components/orchestration/JobCreateDialog';
import { JobFilterBar } from '@/components/orchestration/JobFilterBar';
import { JobQueueTable } from '@/components/orchestration/JobQueueTable';
import { QueueStatsPanel } from '@/components/orchestration/QueueStatsPanel';
import { ServiceHealthGrid } from '@/components/orchestration/ServiceHealthGrid';
import { ServiceScaleDialog } from '@/components/orchestration/ServiceScaleDialog';
import { JobFilters } from '@/components/orchestration/types';
import { OrchestrationJob, ServiceHealth, QueueStats, EventMessage } from '@/components/orchestration/types';
import { useSocket } from '@/hooks/useSocket';
import { orchestrationApi } from '@/lib/api/client';

interface ExecutionUpdatePayload {
  executionId: string;
  status: string;
  progress?: number;
}

interface JobUpdatePayload {
  jobId: string;
  status: string;
  progress?: number;
}

export default function OrchestrationPage() {
  const [jobs, setJobs] = useState<OrchestrationJob[]>([]);
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [events, setEvents] = useState<EventMessage[]>([]);
  const [filters, setFilters] = useState<JobFilters>({});
  const [loading, setLoading] = useState({ jobs: false, services: false, stats: false, events: false });

  const [createOpen, setCreateOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [executeOpen, setExecuteOpen] = useState(false);
  const [scaleOpen, setScaleOpen] = useState(false);
  const [scaleService, setScaleService] = useState('');

  const { isConnected } = useSocket({
    onExecutionUpdate: useCallback((data: unknown) => {
      const d = data as ExecutionUpdatePayload;
      setJobs((prev) => prev.map((j): OrchestrationJob =>
        j.id === d.executionId ? { ...j, status: d.status as OrchestrationJob['status'], progress: d.progress ?? j.progress } : j
      ));
    }, []),
    onJobUpdate: useCallback((data: unknown) => {
      const d = data as JobUpdatePayload;
      setJobs((prev) => prev.map((j): OrchestrationJob =>
        j.id === d.jobId ? { ...j, status: d.status as OrchestrationJob['status'], progress: d.progress ?? j.progress } : j
      ));
    }, []),
    onAlert: useCallback((data: unknown) => {
      setEvents((prev) => [{
        id: `evt-${Date.now()}`,
        channel: 'alerts',
        payload: data,
        timestamp: new Date().toISOString(),
      }, ...prev].slice(0, 100));
    }, []),
  });

  const fetchServices = useCallback(async () => {
    setLoading((l) => ({ ...l, services: true }));
    try {
      const data = await orchestrationApi.getServiceHealth() as ServiceHealth[];
      setServices(data || []);
    } catch {
      console.warn('Service health not available');
    } finally {
      setLoading((l) => ({ ...l, services: false }));
    }
  }, []);

  const fetchQueueStats = useCallback(async () => {
    setLoading((l) => ({ ...l, stats: true }));
    try {
      const data = await orchestrationApi.getQueueStats() as QueueStats;
      setStats(data);
    } catch {
      console.warn('Queue stats not available');
    } finally {
      setLoading((l) => ({ ...l, stats: false }));
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoading((l) => ({ ...l, events: true }));
    try {
      const data = await orchestrationApi.getEvents(50) as EventMessage[];
      setEvents(data || []);
    } catch {
      console.warn('Events not available');
    } finally {
      setLoading((l) => ({ ...l, events: false }));
    }
  }, []);

  const fetchJobs = useCallback(async () => {
    setLoading((l) => ({ ...l, jobs: true }));
    try {
      const params: Record<string, string> = {};
      if (filters.type) params.type = filters.type;
      if (filters.priority) params.priority = filters.priority;
      if (filters.status) params.status = filters.status;

      const data = await orchestrationApi.listJobs?.(params) as OrchestrationJob[] | { data: OrchestrationJob[] };
      if (data) {
        setJobs(Array.isArray(data) ? data as OrchestrationJob[] : (data as { data: OrchestrationJob[] }).data || []);
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading((l) => ({ ...l, jobs: false }));
    }
  }, [filters]);

  useEffect(() => {
    fetchServices();
    fetchQueueStats();
    fetchEvents();
  }, [fetchServices, fetchQueueStats, fetchEvents]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleSubmitJob = async (data: { type: string; priority: string; callback?: string }) => {
    const newJob: OrchestrationJob = {
      id: `job-${Date.now()}`,
      type: data.type as OrchestrationJob['type'],
      priority: data.priority as OrchestrationJob['priority'],
      status: 'queued',
      progress: 0,
      createdAt: new Date().toISOString(),
    };

    try {
      const result = await orchestrationApi.submitJob({
        type: data.type,
        priority: data.priority,
        payload: {},
        callback: data.callback,
      }) as { jobId: string };
      newJob.id = result.jobId || newJob.id;
    } catch {
      console.warn('Job submission to API failed — using local');
    }

    setJobs([newJob, ...jobs]);
  };

  const handleSubmitBatch = async (batchJobs: { type: string; priority: string }[]) => {
    const newJobs: OrchestrationJob[] = batchJobs.map((bj) => ({
      id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: bj.type as OrchestrationJob['type'],
      priority: bj.priority as OrchestrationJob['priority'],
      status: 'queued' as const,
      progress: 0,
      createdAt: new Date().toISOString(),
    }));

    try {
      await orchestrationApi.submitBatch(newJobs.map((j) => ({
        id: j.id,
        type: j.type,
        priority: j.priority,
        payload: {},
      })));
    } catch {
      console.warn('Batch submission to API failed — using local');
    }

    setJobs([...newJobs, ...jobs]);
  };

  const handleOrchestrateExecution = async (data: {
    tests: boolean;
    security: boolean;
    performance: boolean;
    accessibility: boolean;
    aiAnalysis: boolean;
    priority: string;
    parallel: boolean;
    maxRetries: number;
    timeout: number;
  }) => {
    const executionId = `exec-${Date.now()}`;
    try {
      await orchestrationApi.orchestrateExecution(executionId, data);
    } catch {
      console.warn('Execution orchestration to API failed');
    }

    const typeLabels: string[] = [];
    if (data.tests) typeLabels.push('test');
    if (data.security) typeLabels.push('security');
    if (data.performance) typeLabels.push('performance');
    if (data.accessibility) typeLabels.push('accessibility');
    if (data.aiAnalysis) typeLabels.push('ai-analysis');

    const newJobs: OrchestrationJob[] = typeLabels.map((type, i) => ({
      id: `${executionId}-${type}`,
      type: type as OrchestrationJob['type'],
      priority: data.priority as OrchestrationJob['priority'],
      status: 'queued',
      progress: 0,
      createdAt: new Date().toISOString(),
      dependencies: i > 0 && !data.parallel ? [`${executionId}-${typeLabels[0]}`] : undefined,
    }));

    setJobs([...newJobs, ...jobs]);
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      await orchestrationApi.cancelJob(jobId);
    } catch {
      console.warn('Cancel via API failed');
    }
    setJobs(jobs.map((j) => j.id === jobId ? { ...j, status: 'cancelled' as const } : j));
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      await orchestrationApi.submitJob({ id: jobId, type: 'test', priority: 'medium', payload: {} });
    } catch {
      console.warn('Retry via API failed');
    }
    setJobs(jobs.map((j) => j.id === jobId ? { ...j, status: 'queued' as const, progress: 0, error: undefined } : j));
  };

  const handleScaleService = async (serviceName: string) => {
    setScaleService(serviceName);
    setScaleOpen(true);
  };

  const handleScaleSubmit = async (serviceName: string, replicas: number) => {
    try {
      await orchestrationApi.scaleService(serviceName, replicas);
    } catch {
      console.warn('Scale via API failed');
    }
  };

  const filteredJobs = jobs.filter((job) => {
    if (filters.type && job.type !== filters.type) return false;
    if (filters.priority && job.priority !== filters.priority) return false;
    if (filters.status && job.status !== filters.status) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!job.id.toLowerCase().includes(q) && !job.type.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <Box>
      <PageHeader title="Orchestration" subtitle="Unified job coordination and service management">
        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            Submit Job
          </Button>
          <Button variant="outlined" startIcon={<BatchIcon />} onClick={() => setBatchOpen(true)}>
            Batch
          </Button>
          <Button variant="outlined" startIcon={<ExecuteIcon />} onClick={() => setExecuteOpen(true)}>
            Orchestrate
          </Button>
        </Stack>
      </PageHeader>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <ServiceHealthGrid
            services={services}
            loading={loading.services}
            onRefresh={fetchServices}
            onScale={handleScaleService}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <QueueStatsPanel stats={stats} loading={loading.stats} />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">Job Queue</Typography>
              <Stack direction="row" spacing={1}>
                <Chip label={`Total: ${filteredJobs.length}`} size="small" />
                <Chip label={`Running: ${filteredJobs.filter((j) => j.status === 'running').length}`} size="small" color="primary" />
                <Chip label={`Failed: ${filteredJobs.filter((j) => j.status === 'failed').length}`} size="small" color="error" />
                {isConnected && <Chip label="Live" size="small" color="success" variant="outlined" />}
              </Stack>
            </Box>
            <JobFilterBar filters={filters} onChange={setFilters} />
          </Box>
          <JobQueueTable
            jobs={filteredJobs}
            onCancel={handleCancelJob}
            onRetry={handleRetryJob}
            loading={loading.jobs}
          />
        </Grid>
        <Grid item xs={12} lg={4}>
          <EventHistoryTimeline events={events} loading={loading.events} onRefresh={fetchEvents} />
        </Grid>
      </Grid>

      <JobCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} onSubmit={handleSubmitJob} />
      <BatchJobDialog open={batchOpen} onClose={() => setBatchOpen(false)} onSubmit={handleSubmitBatch} />
      <ExecutionOrchestrationDialog open={executeOpen} onClose={() => setExecuteOpen(false)} onSubmit={handleOrchestrateExecution} />
      <ServiceScaleDialog
        open={scaleOpen}
        serviceName={scaleService}
        onClose={() => setScaleOpen(false)}
        onSubmit={handleScaleSubmit}
      />
    </Box>
  );
}
