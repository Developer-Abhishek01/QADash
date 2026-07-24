'use client';

import {
  Add as AddIcon,
  Delete as DeleteIcon,
  PlayArrow as RunIcon,
  Pause as PauseIcon,
} from '@mui/icons-material';
import {
  Box,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Snackbar,
  Alert,
  Typography,
} from '@mui/material';
import { useState } from 'react';

import { PageHeader } from '@/components/common/PageHeader';
import { Loading } from '@/components/feedback/Loading';
import { useSchedules, useCreateSchedule, useDeleteSchedule, usePauseSchedule, useResumeSchedule, useRunSchedule } from '@/lib/scheduler/hooks';
import type { ScheduledJob } from '@/lib/scheduler/types';

export default function SchedulerPage() {
  const { data: schedules, isLoading } = useSchedules();
  const createSchedule = useCreateSchedule();
  const deleteSchedule = useDeleteSchedule();
  const pauseSchedule = usePauseSchedule();
  const resumeSchedule = useResumeSchedule();
  const runSchedule = useRunSchedule();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', suite: 'Smoke Suite', cron: '0 * * * *' });
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  if (isLoading) return <Loading />;

  const handleAdd = async () => {
    try {
      await createSchedule.mutateAsync(form);
      setSnackbar({ message: 'Schedule created', severity: 'success' });
      setOpen(false);
      setForm({ name: '', suite: 'Smoke Suite', cron: '0 * * * *' });
    } catch {
      setSnackbar({ message: 'Failed to create schedule', severity: 'error' });
    }
  };

  const handleToggle = async (job: ScheduledJob) => {
    try {
      if (job.status === 'Active') {
        await pauseSchedule.mutateAsync(job.id);
        setSnackbar({ message: 'Schedule paused', severity: 'success' });
      } else {
        await resumeSchedule.mutateAsync(job.id);
        setSnackbar({ message: 'Schedule resumed', severity: 'success' });
      }
    } catch {
      setSnackbar({ message: 'Toggle failed', severity: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSchedule.mutateAsync(id);
      setSnackbar({ message: 'Schedule deleted', severity: 'success' });
    } catch {
      setSnackbar({ message: 'Delete failed', severity: 'error' });
    }
  };

  const handleRun = async (id: string) => {
    try {
      await runSchedule.mutateAsync(id);
      setSnackbar({ message: 'Job triggered', severity: 'success' });
    } catch {
      setSnackbar({ message: 'Run failed', severity: 'error' });
    }
  };

  const jobs = schedules ?? [];

  return (
    <Box>
      <PageHeader
        title="Scheduler"
        subtitle="Automate and manage recurring test executions"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            Schedule Test
          </Button>
        }
      />

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Schedule Name</TableCell>
                  <TableCell>Test Suite</TableCell>
                  <TableCell>Cron / Interval</TableCell>
                  <TableCell>Next Run</TableCell>
                  <TableCell>Last Result</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {jobs.map((job: ScheduledJob) => (
                  <TableRow key={job.id}>
                    <TableCell sx={{ fontWeight: 600 }}>{job.name}</TableCell>
                    <TableCell>{job.suite}</TableCell>
                    <TableCell><code>{job.cron}</code></TableCell>
                    <TableCell>{job.nextRun}</TableCell>
                    <TableCell>
                      {job.lastResult ? <Chip label={job.lastResult} size="small" color={job.lastResult === 'Passed' ? 'success' : 'error'} /> : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip label={job.status} size="small" color={job.status === 'Active' ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" color="primary" onClick={() => handleRun(job.id)} disabled={runSchedule.isPending}>
                        <RunIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleToggle(job)} disabled={pauseSchedule.isPending || resumeSchedule.isPending}>
                        {job.status === 'Active' ? <PauseIcon fontSize="small" /> : <RunIcon fontSize="small" />}
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(job.id)} disabled={deleteSchedule.isPending}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {jobs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center"><Typography py={2} color="text.secondary">No schedules found</Typography></TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Schedule New Test</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Schedule Name" fullWidth value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField select label="Test Suite" fullWidth value={form.suite} onChange={(e) => setForm({ ...form, suite: e.target.value })}>
              <MenuItem value="Smoke Suite">Smoke Suite</MenuItem>
              <MenuItem value="Regression Suite">Regression Suite</MenuItem>
              <MenuItem value="Security Scan">Security Scan</MenuItem>
            </TextField>
            <TextField label="Cron Expression" fullWidth value={form.cron} onChange={(e) => setForm({ ...form, cron: e.target.value })} helperText="Format: minute hour day month day-of-week" />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd} disabled={createSchedule.isPending}>Create Schedule</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snackbar} autoHideDuration={3000} onClose={() => setSnackbar(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {snackbar ? <Alert severity={snackbar.severity}>{snackbar.message}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
