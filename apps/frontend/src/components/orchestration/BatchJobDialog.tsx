'use client';

import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box,
  Select, MenuItem, FormControl, InputLabel, IconButton, Typography, Stack,
} from '@mui/material';
import { useState } from 'react';

interface BatchJobEntry {
  type: string;
  priority: string;
}

interface BatchJobDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (jobs: BatchJobEntry[]) => void;
}

export function BatchJobDialog({ open, onClose, onSubmit }: BatchJobDialogProps) {
  const [jobs, setJobs] = useState<BatchJobEntry[]>([
    { type: 'test', priority: 'high' },
  ]);

  const addJob = () => setJobs([...jobs, { type: 'test', priority: 'medium' }]);
  const removeJob = (index: number) => setJobs(jobs.filter((_, i) => i !== index));
  const updateJob = (index: number, key: keyof BatchJobEntry, value: string) => {
    const updated = [...jobs];
    updated[index] = { ...updated[index], [key]: value };
    setJobs(updated);
  };

  const handleSubmit = () => {
    onSubmit(jobs);
    setJobs([{ type: 'test', priority: 'high' }]);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Submit Batch Jobs</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 2 }}>
          {jobs.map((job, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Typography variant="body2" sx={{ minWidth: 24 }}>{i + 1}.</Typography>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Type</InputLabel>
                <Select value={job.type} label="Type" onChange={(e) => updateJob(i, 'type', e.target.value)}>
                  <MenuItem value="test">Test</MenuItem>
                  <MenuItem value="security">Security</MenuItem>
                  <MenuItem value="performance">Performance</MenuItem>
                  <MenuItem value="accessibility">Accessibility</MenuItem>
                  <MenuItem value="ai-analysis">AI Analysis</MenuItem>
                  <MenuItem value="report">Report</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Priority</InputLabel>
                <Select value={job.priority} label="Priority" onChange={(e) => updateJob(i, 'priority', e.target.value)}>
                  <MenuItem value="critical">Critical</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                </Select>
              </FormControl>
              <IconButton size="small" onClick={() => removeJob(i)} disabled={jobs.length <= 1}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
          <Button startIcon={<AddIcon />} onClick={addJob} variant="outlined" size="small">Add Job</Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>Submit {jobs.length} Job{jobs.length > 1 ? 's' : ''}</Button>
      </DialogActions>
    </Dialog>
  );
}
