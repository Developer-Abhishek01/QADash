import {
  Replay as ReplayIcon,
  ErrorOutline as ErrorIcon,
} from '@mui/icons-material';
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Tooltip,
  Box,
  Button,
} from '@mui/material';

import { useFailedJobs, useRetryJob, useRetryAllFailed } from '@/lib/workers/hooks';
import type { FailedJob } from '@/lib/workers/types';

export function FailedJobsPanel() {
  const { data: failedJobs = [], isLoading } = useFailedJobs();
  const retryJob = useRetryJob();
  const retryAll = useRetryAllFailed();

  if (isLoading) return null;

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Failed Jobs</Typography>
          {failedJobs.length > 0 && (
            <Button
              size="small"
              startIcon={<ReplayIcon />}
              onClick={() => retryAll.mutate('')}
              disabled={retryAll.isPending}
            >
              Retry All
            </Button>
          )}
        </Box>
        {failedJobs.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Job</TableCell>
                  <TableCell>Queue</TableCell>
                  <TableCell>Attempts</TableCell>
                  <TableCell>Error</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {failedJobs.map((job: FailedJob) => (
                  <TableRow key={job.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{job.name || job.id}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={job.queue ?? '-'} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{job.attempts}</TableCell>
                    <TableCell>
                      <Tooltip title={job.failedReason ?? ''}>
                        <Typography variant="body2" color="error.main" noWrap sx={{ maxWidth: 250 }}>
                          {job.failedReason ?? '-'}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => retryJob.mutate({ queue: job.queue ?? '', jobId: job.id })}
                        disabled={retryJob.isPending}
                      >
                        <ReplayIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <ErrorIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">No failed jobs</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
