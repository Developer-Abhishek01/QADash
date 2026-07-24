'use client';

import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box,
  FormControlLabel, Switch, Select, MenuItem, FormControl, InputLabel,
  Typography, Divider, Chip, Stack,
} from '@mui/material';
import { useState } from 'react';

interface ExecutionOrchestrationDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    tests: boolean;
    security: boolean;
    performance: boolean;
    accessibility: boolean;
    aiAnalysis: boolean;
    priority: string;
    parallel: boolean;
    maxRetries: number;
    timeout: number;
  }) => void;
}

export function ExecutionOrchestrationDialog({ open, onClose, onSubmit }: ExecutionOrchestrationDialogProps) {
  const [tests, setTests] = useState(true);
  const [security, setSecurity] = useState(false);
  const [performance, setPerformance] = useState(false);
  const [accessibility, setAccessibility] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(true);
  const [priority, setPriority] = useState('high');
  const [parallel, setParallel] = useState(true);
  const [maxRetries, setMaxRetries] = useState(3);
  const [timeout, setTimeout] = useState(600000);

  const handleSubmit = () => {
    onSubmit({ tests, security, performance, accessibility, aiAnalysis, priority, parallel, maxRetries, timeout });
    onClose();
  };

  const selectedCount = [tests, security, performance, accessibility, aiAnalysis].filter(Boolean).length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Orchestrate Execution</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">Select test types to run:</Typography>

          <FormControlLabel control={<Switch checked={tests} onChange={(e) => setTests(e.target.checked)} />} label="Functional Tests" />
          <FormControlLabel control={<Switch checked={security} onChange={(e) => setSecurity(e.target.checked)} />} label="Security Scan (ZAP)" />
          <FormControlLabel control={<Switch checked={performance} onChange={(e) => setPerformance(e.target.checked)} />} label="Performance Test (K6)" />
          <FormControlLabel control={<Switch checked={accessibility} onChange={(e) => setAccessibility(e.target.checked)} />} label="Accessibility (Axe)" />
          <FormControlLabel control={<Switch checked={aiAnalysis} onChange={(e) => setAiAnalysis(e.target.checked)} />} label="AI Analysis" />

          <Divider />
          <Typography variant="subtitle2" color="text.secondary">Configuration:</Typography>

          <FormControl fullWidth size="small">
            <InputLabel>Priority</InputLabel>
            <Select value={priority} label="Priority" onChange={(e) => setPriority(e.target.value)}>
              <MenuItem value="critical">Critical</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="low">Low</MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel control={<Switch checked={parallel} onChange={(e) => setParallel(e.target.checked)} />} label="Run in Parallel" />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Max Retries</InputLabel>
              <Select value={maxRetries} label="Max Retries" onChange={(e) => setMaxRetries(Number(e.target.value))}>
                {[0, 1, 2, 3, 5].map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Timeout (s)</InputLabel>
              <Select value={timeout} label="Timeout (s)" onChange={(e) => setTimeout(Number(e.target.value))}>
                <MenuItem value={300000}>5 min</MenuItem>
                <MenuItem value={600000}>10 min</MenuItem>
                <MenuItem value={900000}>15 min</MenuItem>
                <MenuItem value={1800000}>30 min</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Typography variant="body2">Selected:</Typography>
            <Stack direction="row" spacing={0.5}>
              {tests && <Chip label="Tests" size="small" color="primary" />}
              {security && <Chip label="Security" size="small" color="error" />}
              {performance && <Chip label="Performance" size="small" color="warning" />}
              {accessibility && <Chip label="Accessibility" size="small" color="info" />}
              {aiAnalysis && <Chip label="AI" size="small" color="secondary" />}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={selectedCount === 0}>
          Start {selectedCount} Test Type{selectedCount > 1 ? 's' : ''}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
