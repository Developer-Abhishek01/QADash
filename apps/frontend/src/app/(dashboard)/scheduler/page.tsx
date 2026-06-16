'use client';

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
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  PlayArrow as RunIcon,
  Pause as PauseIcon,
} from '@mui/icons-material';
import { PageHeader } from '@/components/common/PageHeader';
import { useState, useEffect } from 'react';

interface ScheduledJob {
  id: string;
  name: string;
  suite: string;
  cron: string;
  nextRun: string;
  status: 'Active' | 'Paused';
  lastResult?: 'Passed' | 'Failed';
}

export default function SchedulerPage() {
  const [schedules, setSchedules] = useState<ScheduledJob[]>([]);
  const [open, setOpen] = useState(false);
  const [newJob, setNewJob] = useState({ name: '', suite: 'Smoke Suite', cron: '0 * * * *' });

  useEffect(() => {
    const saved = localStorage.getItem('qadash_schedules');
    if (saved) {
      setSchedules(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (schedules.length > 0) {
      localStorage.setItem('qadash_schedules', JSON.stringify(schedules));
    }
  }, [schedules]);

  const handleAdd = () => {
    const job: ScheduledJob = {
      id: `SCH-${Date.now()}`,
      name: newJob.name,
      suite: newJob.suite,
      cron: newJob.cron,
      nextRun: '2024-05-20 10:00', // Mock next run
      status: 'Active',
    };
    setSchedules([...schedules, job]);
    setOpen(false);
  };

  const toggleStatus = (id: string) => {
    setSchedules(schedules.map(s => 
      s.id === id ? { ...s, status: s.status === 'Active' ? 'Paused' : 'Active' } : s
    ));
  };

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
                {schedules.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell sx={{ fontWeight: 600 }}>{job.name}</TableCell>
                    <TableCell>{job.suite}</TableCell>
                    <TableCell>
                      <code>{job.cron}</code>
                    </TableCell>
                    <TableCell>{job.nextRun}</TableCell>
                    <TableCell>
                      {job.lastResult ? (
                        <Chip label={job.lastResult} size="small" color={job.lastResult === 'Passed' ? 'success' : 'error'} />
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={job.status} 
                        size="small" 
                        color={job.status === 'Active' ? 'success' : 'default'} 
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => toggleStatus(job.id)}>
                        {job.status === 'Active' ? <PauseIcon fontSize="small" /> : <RunIcon fontSize="small" />}
                      </IconButton>
                      <IconButton size="small" color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Schedule New Test</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Schedule Name"
              fullWidth
              value={newJob.name}
              onChange={(e) => setNewJob({ ...newJob, name: e.target.value })}
            />
            <TextField
              select
              label="Test Suite"
              fullWidth
              value={newJob.suite}
              onChange={(e) => setNewJob({ ...newJob, suite: e.target.value })}
            >
              <MenuItem value="Smoke Suite">Smoke Suite</MenuItem>
              <MenuItem value="Regression Suite">Regression Suite</MenuItem>
              <MenuItem value="Security Scan">Security Scan</MenuItem>
            </TextField>
            <TextField
              label="Cron Expression"
              fullWidth
              value={newJob.cron}
              onChange={(e) => setNewJob({ ...newJob, cron: e.target.value })}
              helperText="Format: minute hour day month day-of-week"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd}>Create Schedule</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}