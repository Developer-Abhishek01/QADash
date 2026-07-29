'use client';

import { Cancel as CancelIcon, Replay as ReplayIcon } from '@mui/icons-material';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  LinearProgress,
} from '@mui/material';

import { StatusBadge } from '@/components/common/StatusBadge';

import { OrchestrationJob } from './types';

interface JobQueueTableProps {
  jobs: OrchestrationJob[];
  onCancel: (jobId: string) => void;
  onRetry: (jobId: string) => void;
  loading?: boolean;
}

export function JobQueueTable({ jobs, onCancel, onRetry, loading }: JobQueueTableProps) {
  const getPriorityColor = (p: OrchestrationJob['priority']): 'error' | 'warning' | 'info' | 'default' => {
    switch (p) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
    }
  };

  return (
    <TableContainer component={Paper}>
      <Table size="small">
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
          {loading && (
            <TableRow>
              <TableCell colSpan={7} align="center">Loading...</TableCell>
            </TableRow>
          )}
          {!loading && jobs.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} align="center">
                <Typography variant="body2" color="text.secondary">No jobs found</Typography>
              </TableCell>
            </TableRow>
          )}
          {jobs.map((job) => (
            <TableRow key={job.id}>
              <TableCell>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{job.id}</Typography>
              </TableCell>
              <TableCell><Chip label={job.type} size="small" variant="outlined" /></TableCell>
              <TableCell>
                <Chip label={job.priority} size="small" color={getPriorityColor(job.priority)} />
              </TableCell>
              <TableCell><StatusBadge status={job.status} /></TableCell>
              <TableCell sx={{ minWidth: 150 }}>
                {job.status === 'running' ? (
                  <LinearProgress variant="determinate" value={job.progress} sx={{ height: 8, borderRadius: 4 }} />
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress variant="determinate" value={job.progress} sx={{ height: 8, borderRadius: 4, flex: 1 }} />
                    <Typography variant="caption">{job.progress}%</Typography>
                  </Box>
                )}
              </TableCell>
              <TableCell><Typography variant="caption">{new Date(job.createdAt).toLocaleString()}</Typography></TableCell>
              <TableCell>
                <IconButton size="small" onClick={() => onCancel(job.id)} disabled={job.status === 'completed' || job.status === 'cancelled'} title="Cancel">
                  <CancelIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => onRetry(job.id)} disabled={job.status !== 'failed'} title="Retry">
                  <ReplayIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
