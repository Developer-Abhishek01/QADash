'use client';

import { Clear as ClearIcon } from '@mui/icons-material';
import { Box, TextField, Select, MenuItem, FormControl, InputLabel, IconButton } from '@mui/material';

import { JobFilters } from './types';

interface JobFilterBarProps {
  filters: JobFilters;
  onChange: (filters: JobFilters) => void;
}

export function JobFilterBar({ filters, onChange }: JobFilterBarProps) {
  const update = (key: keyof JobFilters, value: string | undefined) => {
    onChange({ ...filters, [key]: value || undefined });
  };

  const clearAll = () => onChange({});

  const hasFilters = Object.values(filters).some((v) => v !== undefined);

  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
      <TextField
        size="small"
        placeholder="Search jobs..."
        value={filters.search || ''}
        onChange={(e) => update('search', e.target.value)}
        sx={{ minWidth: 200 }}
      />
      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel>Type</InputLabel>
        <Select value={filters.type || ''} label="Type" onChange={(e) => update('type', e.target.value || undefined)}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="test">Test</MenuItem>
          <MenuItem value="security">Security</MenuItem>
          <MenuItem value="performance">Performance</MenuItem>
          <MenuItem value="accessibility">Accessibility</MenuItem>
          <MenuItem value="ai-analysis">AI Analysis</MenuItem>
          <MenuItem value="report">Report</MenuItem>
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 100 }}>
        <InputLabel>Priority</InputLabel>
        <Select value={filters.priority || ''} label="Priority" onChange={(e) => update('priority', e.target.value || undefined)}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="critical">Critical</MenuItem>
          <MenuItem value="high">High</MenuItem>
          <MenuItem value="medium">Medium</MenuItem>
          <MenuItem value="low">Low</MenuItem>
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 100 }}>
        <InputLabel>Status</InputLabel>
        <Select value={filters.status || ''} label="Status" onChange={(e) => update('status', e.target.value || undefined)}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="running">Running</MenuItem>
          <MenuItem value="completed">Completed</MenuItem>
          <MenuItem value="failed">Failed</MenuItem>
          <MenuItem value="cancelled">Cancelled</MenuItem>
        </Select>
      </FormControl>
      {hasFilters && (
        <IconButton size="small" onClick={clearAll}><ClearIcon fontSize="small" /></IconButton>
      )}
    </Box>
  );
}
