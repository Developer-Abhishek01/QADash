'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
} from '@mui/material';
import {
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';

interface Job {
  id: string;
  type: string;
  priority: string;
  status: string;
  createdAt: string;
  progress: number;
}

interface ServiceHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
}

const mockServicesData: ServiceHealth[] = [
  { service: 'Frontend', status: 'healthy', latency: 12 },
  { service: 'Backend API', status: 'healthy', latency: 15 },
  { service: 'AI Engine', status: 'healthy', latency: 82 },
  { service: 'Playwright Workers', status: 'healthy', latency: 45 },
  { service: 'Redis Queue', status: 'healthy', latency: 2 },
  { service: 'PostgreSQL', status: 'healthy', latency: 4 },
];

export default function OrchestrationPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newJob, setNewJob] = useState({ type: 'test', priority: 'medium', data: {} });

  useEffect(() => {
    const saved = localStorage.getItem('qadash_jobs');
    if (saved) {
      setJobs(JSON.parse(saved));
    }
    
    setServices(mockServicesData);
  }, []);

  useEffect(() => {
    if (jobs.length > 0) {
      localStorage.setItem('qadash_jobs', JSON.stringify(jobs));
    }
  }, [jobs]);

  const handleSubmitJob = () => {
    const job: Job = {
      id: `job-${Date.now()}`,
      type: newJob.type,
      priority: newJob.priority,
      status: 'pending',
      createdAt: new Date().toLocaleString(),
      progress: 0,
    };
    setJobs([job, ...jobs]);
    setCreateDialogOpen(false);
  };

  const handleCancelJob = (jobId: string) => {
    setJobs(jobs.map(j => j.id === jobId ? { ...j, status: 'cancelled' } : j));
  };

  const handleRefreshServices = () => {
    // Generate slight random updates to make the health dashboard feel alive!
    const refreshed = services.map(s => ({
      ...s,
      latency: Math.floor(Math.random() * 80) + (s.service === 'AI Engine' ? 15 : 2), // realistic latencies
      status: Math.random() > 0.05 ? 'healthy' as const : 'degraded' as const, // 5% chance of degraded status to show dynamic features
    }));
    setServices(refreshed);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  return (
    <Box>
      <PageHeader
        title="Orchestration"
        subtitle="Unified job coordination and service management"
      >
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Submit Job
        </Button>
      </PageHeader>

      {/* Service Health Overview */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Service Health</Typography>
                <IconButton onClick={handleRefreshServices}>
                  <RefreshIcon />
                </IconButton>
              </Box>
              <Grid container spacing={2}>
                {services.map((service) => (
                  <Grid item xs={12} sm={6} md={3} key={service.service}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 1,
                        bgcolor: service.status === 'healthy' ? 'success.light' : service.status === 'degraded' ? 'warning.light' : 'error.light',
                        border: '1px solid',
                        borderColor: service.status === 'healthy' ? 'success.main' : service.status === 'degraded' ? 'warning.main' : 'error.main',
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight={600}>
                        {service.service}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                        <Chip
                          label={service.status}
                          size="small"
                          color={service.status === 'healthy' ? 'success' : service.status === 'degraded' ? 'warning' : 'error'}
                        />
                        <Typography variant="caption">
                          {service.latency}ms
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Jobs Queue */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Job Queue</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip label={`Total: ${jobs.length}`} size="small" />
                  <Chip label={`Running: ${jobs.filter(j => j.status === 'running').length}`} size="small" color="primary" />
                  <Chip label={`Failed: ${jobs.filter(j => j.status === 'failed').length}`} size="small" color="error" />
                </Box>
              </Box>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Job ID</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Progress</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>{job.id}</TableCell>
                        <TableCell>
                          <Chip label={job.type} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Chip label={job.priority} size="small" color={getPriorityColor(job.priority) as any} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={job.status} />
                        </TableCell>
                        <TableCell sx={{ minWidth: 150 }}>
                          {job.status === 'running' ? (
                            <LinearProgress variant="determinate" value={job.progress} sx={{ height: 8, borderRadius: 4 }} />
                          ) : (
                            <Typography variant="caption">{job.progress}%</Typography>
                          )}
                        </TableCell>
                        <TableCell>{job.createdAt}</TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => handleCancelJob(job.id)} disabled={job.status === 'completed'}>
                            <CancelIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Create Job Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Submit New Job</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Job Type</InputLabel>
              <Select
                value={newJob.type}
                label="Job Type"
                onChange={(e) => setNewJob({ ...newJob, type: e.target.value })}
              >
                <MenuItem value="test">Test Execution</MenuItem>
                <MenuItem value="security">Security Scan</MenuItem>
                <MenuItem value="performance">Performance Test</MenuItem>
                <MenuItem value="accessibility">Accessibility Test</MenuItem>
                <MenuItem value="ai-analysis">AI Analysis</MenuItem>
                <MenuItem value="report">Report Generation</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={newJob.priority}
                label="Priority"
                onChange={(e) => setNewJob({ ...newJob, priority: e.target.value })}
              >
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmitJob}>Submit</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}