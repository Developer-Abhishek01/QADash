'use client';

import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box,
  TextField, Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import { useState } from 'react';

interface JobCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { type: string; priority: string; callback?: string }) => void;
}

const JOB_TYPES = [
  { value: 'test', label: 'Test Execution' },
  { value: 'security', label: 'Security Scan' },
  { value: 'performance', label: 'Performance Test' },
  { value: 'accessibility', label: 'Accessibility Test' },
  { value: 'ai-analysis', label: 'AI Analysis' },
  { value: 'report', label: 'Report Generation' },
];

export function JobCreateDialog({ open, onClose, onSubmit }: JobCreateDialogProps) {
  const [type, setType] = useState('test');
  const [priority, setPriority] = useState('medium');
  const [callback, setCallback] = useState('');

  const handleSubmit = () => {
    onSubmit({ type, priority, callback: callback || undefined });
    setType('test');
    setPriority('medium');
    setCallback('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Submit New Job</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Job Type</InputLabel>
            <Select value={type} label="Job Type" onChange={(e) => setType(e.target.value)}>
              {JOB_TYPES.map((jt) => (
                <MenuItem key={jt.value} value={jt.value}>{jt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Priority</InputLabel>
            <Select value={priority} label="Priority" onChange={(e) => setPriority(e.target.value)}>
              <MenuItem value="critical">Critical</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="low">Low</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Callback URL (optional)"
            value={callback}
            onChange={(e) => setCallback(e.target.value)}
            placeholder="https://example.com/webhook"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>Submit Job</Button>
      </DialogActions>
    </Dialog>
  );
}
