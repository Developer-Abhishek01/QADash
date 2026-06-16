'use client';

import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import {
  PlayArrow,
  CheckCircle,
  Error as ErrorIcon,
  Cancel,
  SkipNext,
  RestartAlt,
  Stop,
  ContentCopy,
  Download,
  FilterAlt,
} from '@mui/icons-material';
import { useState, useEffect, useRef } from 'react';

interface ExecutionStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  duration?: string;
  logs?: string[];
}

interface ExecutionProgressProps {
  testName: string;
  steps: ExecutionStep[];
  currentStep: number;
  progress: number;
  status: 'running' | 'passed' | 'failed' | 'cancelled';
  startTime: string;
  estimatedEnd?: string;
}

export function ExecutionProgress({
  testName,
  steps,
  currentStep,
  progress,
  status,
  startTime,
  estimatedEnd,
}: ExecutionProgressProps) {
  const statusColors = {
    running: 'primary',
    passed: 'success',
    failed: 'error',
    cancelled: 'warning',
  };

  const statusIcons = {
    running: <PlayArrow />,
    passed: <CheckCircle />,
    failed: <ErrorIcon />,
    cancelled: <Cancel />,
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6">{testName}</Typography>
            <Typography variant="body2" color="text.secondary">
              Started: {startTime}
              {estimatedEnd && ` • Est. end: ${estimatedEnd}`}
            </Typography>
          </Box>
          <Chip
            icon={statusIcons[status]}
            label={status.charAt(0).toUpperCase() + status.slice(1)}
            color={statusColors[status] as "success" | "error" | "warning" | "info" | "primary" | "secondary" | "default"}
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Progress
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {progress.toFixed(1)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            color={statusColors[status] as any}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        <Stepper activeStep={currentStep} orientation="vertical">
          {steps.map((step) => (
            <Step key={step.id} completed={step.status === 'passed'}>
              <StepLabel
                error={step.status === 'failed'}
                icon={
                  step.status === 'passed' ? (
                    <CheckCircle color="success" />
                  ) : step.status === 'failed' ? (
                    <ErrorIcon color="error" />
                  ) : step.status === 'running' ? (
                    <LinearProgress sx={{ width: 20 }} />
                  ) : (
                    <SkipNext color="disabled" />
                  )
                }
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2">{step.name}</Typography>
                  {step.duration && (
                    <Chip label={step.duration} size="small" variant="outlined" />
                  )}
                </Box>
              </StepLabel>
              {step.logs && step.logs.length > 0 && (
                <StepContent>
                  <LogsViewer logs={step.logs} maxHeight={150} />
                </StepContent>
              )}
            </Step>
          ))}
        </Stepper>
      </CardContent>
    </Card>
  );
}

interface LogsViewerProps {
  logs: string[];
  maxHeight?: number;
  showLineNumbers?: boolean;
  filter?: string;
}

export function LogsViewer({
  logs,
  maxHeight = 300,
  showLineNumbers = true,
}: LogsViewerProps) {
  const [levelFilter, setLevelFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    if (levelFilter === 'all') return true;
    return log.toLowerCase().includes(levelFilter);
  });

  const getLogLevel = (log: string) => {
    if (log.toLowerCase().includes('error')) return 'error';
    if (log.toLowerCase().includes('warn')) return 'warn';
    return 'info';
  };

  const getLogColor = (level: string) => {
    switch (level) {
      case 'error': return 'error.main';
      case 'warn': return 'warning.main';
      default: return 'text.primary';
    }
  };

  return (
    <Card variant="outlined">
      <Box sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="body2" color="text.secondary">Logs</Typography>
        <Box sx={{ flex: 1 }} />
        {['All', 'Info', 'Warn', 'Error'].map((l) => (
          <Chip
            key={l}
            label={l}
            size="small"
            variant={levelFilter === l.toLowerCase() ? 'filled' : 'outlined'}
            onClick={() => setLevelFilter(l.toLowerCase() as any)}
          />
        ))}
        <IconButton size="small" onClick={() => setAutoScroll(!autoScroll)}>
          <FilterAlt fontSize="small" />
        </IconButton>
        <IconButton size="small"><ContentCopy fontSize="small" /></IconButton>
        <IconButton size="small"><Download fontSize="small" /></IconButton>
      </Box>
      <Box ref={containerRef} sx={{ p: 2, maxHeight, overflow: 'auto', bgcolor: 'grey.900', fontFamily: 'monospace', fontSize: '0.75rem' }}>
        {filteredLogs.map((log, index) => {
          const level = getLogLevel(log);
          return (
            <Box key={index} sx={{ display: 'flex', gap: 2, color: getLogColor(level), '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
              {showLineNumbers && (
                <Typography variant="caption" color="grey.500" sx={{ minWidth: 40 }}>
                  {String(index + 1).padStart(4, ' ')}
                </Typography>
              )}
              <Typography sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{log}</Typography>
            </Box>
          );
        })}
      </Box>
    </Card>
  );
}

interface TestExecutionCardProps {
  testName: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  duration?: string;
  onRetry?: () => void;
  onStop?: () => void;
}

export function TestExecutionCard({ testName, status, duration, onRetry, onStop }: TestExecutionCardProps) {
  const statusConfig = {
    pending: { icon: <SkipNext />, color: 'default' as const },
    running: { icon: <PlayArrow />, color: 'primary' as const },
    passed: { icon: <CheckCircle />, color: 'success' as const },
    failed: { icon: <ErrorIcon />, color: 'error' as const },
    skipped: { icon: <SkipNext />, color: 'default' as const },
  };

  const config = statusConfig[status];

  return (
    <Card variant="outlined">
      <CardContent sx={{ py: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip icon={config.icon} label={status} color={config.color} size="small" />
          <Typography variant="body1" sx={{ flex: 1 }}>{testName}</Typography>
          {duration && <Typography variant="body2" color="text.secondary">{duration}</Typography>}
          {status === 'failed' && <IconButton size="small" onClick={onRetry}><RestartAlt fontSize="small" /></IconButton>}
          {status === 'running' && <IconButton size="small" onClick={onStop}><Stop fontSize="small" /></IconButton>}
        </Box>
      </CardContent>
    </Card>
  );
}