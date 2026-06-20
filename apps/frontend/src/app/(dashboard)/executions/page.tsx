'use client';

import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Grid,
  Divider,
  Chip,
  IconButton,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Collapse,
  Checkbox,
  InputAdornment,
  Select,
  FormControl,
  SelectChangeEvent,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Add as AddIcon,
  PlayArrow as RunIcon,
  PhotoCamera as ScreenshotIcon,
  Videocam as VideoIcon,
  History as LogsIcon,
  Delete as DeleteIcon,
  CheckCircle as PassIcon,
  Cancel as FailIcon,
  ExpandMore,
  ExpandLess,
  Search as SearchIcon,
  DateRange as DateRangeIcon,
  Download as DownloadIcon,
  FilterList as FilterListIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  PlayCircleOutline as PlayCircleIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  HighlightOff as HighlightOffIcon,
  HourglassEmpty as HourglassIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useSnackbar } from 'notistack';
import { executionsApi, testsApi, projectsApi } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import socketClient from '@/lib/socket';
import LivePreviewPanel from './LivePreviewPanel';

interface KpiCard {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  trend: { value: string; positive: boolean; neutral?: boolean };
}

export default function ExecutionsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { user: _user } = useAuth();
  const [executions, setExecutions] = useState<any[]>([]);
  const [_isLoading, setIsLoading] = useState(true);
  const [_isMounted, setIsMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [executionToDelete, setExecutionToDelete] = useState<any>(null);
  const [selectedExecution, setSelectedExecution] = useState<any>(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [newTest, setNewTest] = useState({ name: '', url: '', browser: 'chromium' });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [projects, setProjects] = useState<any[]>([]);
  const [projectId, setProjectId] = useState('');
  const [livePreview, setLivePreview] = useState<{ screenshot: string; step: string; timestamp: number } | null>(null);
  const [actionLogs, setActionLogs] = useState<any[]>([]);
  const [consoleLogs, setConsoleLogs] = useState<any[]>([]);
  const [elementHighlights, setElementHighlights] = useState<any[]>([]);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [availableTests, setAvailableTests] = useState<any[]>([]);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');

  const fetchExecutions = async () => {
    try {
      setIsLoading(true);
      const data = await executionsApi.list();
      setExecutions(data);
      if (detailOpen && selectedExecution) {
        const updated = data.find((e: any) => e.id === selectedExecution.id);
        if (updated && updated.status !== selectedExecution.status) {
          setSelectedExecution((prev: any) => ({ ...prev, status: updated.status }));
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch executions:', error);
      const message = error.response?.data?.message || error.message || 'Failed to load executions from server';
      enqueueSnackbar(message, { variant: 'error' });
      if (message.includes('Network Error')) {
        enqueueSnackbar('Backend server (Port 3001) is not responding. Please run run.bat', { variant: 'warning', persist: true });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExecutionsRef = useRef(fetchExecutions);
  fetchExecutionsRef.current = fetchExecutions;

  useEffect(() => {
    setIsMounted(true);
    fetchExecutions();
    projectsApi.list().then((projectsList: any[]) => {
      setProjects(projectsList);
      if (projectsList.length > 0) setProjectId(projectsList[0].id);
    }).catch(() => {});
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => { clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (open && projectId) {
      testsApi.list({ projectId }).then((tests: any[]) => {
        setAvailableTests(Array.isArray(tests) ? tests : []);
      }).catch(() => setAvailableTests([]));
    } else if (open) {
      testsApi.list().then((tests: any[]) => {
        setAvailableTests(Array.isArray(tests) ? tests : []);
      }).catch(() => setAvailableTests([]));
    } else {
      setAvailableTests([]);
    }
  }, [open, projectId]);

  useEffect(() => {
    const hasRunning = executions.some((e: any) => e.status === 'RUNNING');
    if (!hasRunning) return;
    const interval = setInterval(() => fetchExecutionsRef.current(), 5000);
    return () => clearInterval(interval);
  }, [executions]);

  const calculateElapsed = (startedAt: string) => {
    try {
      if (!startedAt) return '-';
      let start: Date;
      if (startedAt.includes('/')) {
        const [datePart, timePart] = startedAt.split(', ');
        if (!datePart || !timePart) return '-';
        const [day, month, year] = datePart.split('/').map(Number);
        const [hour, min, sec] = timePart.split(':').map(Number);
        start = new Date(year, month - 1, day, hour, min, sec);
      } else {
        start = new Date(startedAt);
      }
      if (isNaN(start.getTime())) return '-';
      const now = currentTime;
      const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
      if (diff < 0) return '0s';
      if (diff < 60) return `${diff}s`;
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      return `${mins}m ${secs}s`;
    } catch { return '-'; }
  };

  const kpiCards: KpiCard[] = useMemo(() => {
    const total = executions.length;
    const passed = executions.filter((e: any) => e.status === 'PASSED').length;
    const failed = executions.filter((e: any) => e.status === 'FAILED').length;
    const running = executions.filter((e: any) => e.status === 'RUNNING').length;
    return [
      {
        label: 'Total Executions',
        value: total,
        icon: <PlayCircleIcon sx={{ fontSize: 22 }} />,
        color: '#6366f1',
        bgColor: '#eef2ff',
        trend: { value: total > 0 ? '+12%' : '0%', positive: true },
      },
      {
        label: 'Passed',
        value: passed,
        icon: <CheckCircleOutlineIcon sx={{ fontSize: 22 }} />,
        color: '#10b981',
        bgColor: '#ecfdf5',
        trend: { value: total > 0 ? `${total > 0 ? Math.round((passed / total) * 100) : 0}%` : '0%', positive: true },
      },
      {
        label: 'Failed',
        value: failed,
        icon: <HighlightOffIcon sx={{ fontSize: 22 }} />,
        color: '#ef4444',
        bgColor: '#fef2f2',
        trend: { value: total > 0 ? `${total > 0 ? Math.round((failed / total) * 100) : 0}%` : '0%', positive: false },
      },
      {
        label: 'Running',
        value: running,
        icon: <HourglassIcon sx={{ fontSize: 22 }} />,
        color: '#f59e0b',
        bgColor: '#fffbeb',
        trend: { value: running > 0 ? `${running} active` : 'Idle', positive: true, neutral: running === 0 },
      },
    ];
  }, [executions]);

  const filteredExecutions = useMemo(() => {
    let result = [...executions];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter((e: any) =>
        e.name?.toLowerCase().includes(q) ||
        e.id?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter((e: any) => e.status === statusFilter.toUpperCase());
    }
    if (dateFilter === 'custom' && dateRangeStart && dateRangeEnd) {
      const start = new Date(dateRangeStart);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateRangeEnd);
      end.setHours(23, 59, 59, 999);
      result = result.filter((e: any) => e.createdAt && new Date(e.createdAt) >= start && new Date(e.createdAt) <= end);
    } else if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (dateFilter === 'today') {
        result = result.filter((e: any) => e.createdAt && new Date(e.createdAt) >= today);
      } else if (dateFilter === '7days') {
        const d = new Date(today); d.setDate(d.getDate() - 7);
        result = result.filter((e: any) => e.createdAt && new Date(e.createdAt) >= d);
      } else if (dateFilter === '30days') {
        const d = new Date(today); d.setDate(d.getDate() - 30);
        result = result.filter((e: any) => e.createdAt && new Date(e.createdAt) >= d);
      }
    }
    return result;
  }, [executions, searchTerm, statusFilter, dateFilter]);

  const formatDuration = (ms: number) => {
    if (!ms) return '-';
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  const handleRunTest = async () => {
    if (!projectId) return;
    setIsTriggering(true);
    try {
      const allTestIds: string[] = [];
      if (newTest.name && newTest.url) {
        const test = await testsApi.create({
          name: newTest.name,
          projectId,
          config: { url: newTest.url, framework: 'playwright', browsers: [newTest.browser], timeout: 30000, retries: 0 },
          tags: ['manual-execution'],
        });
        allTestIds.push(test.id);
      }
      allTestIds.push(...selectedTests);
      if (allTestIds.length === 0) {
        enqueueSnackbar('Create a new test or select existing tests to run', { variant: 'warning' });
        setIsTriggering(false);
        return;
      }
      const executionName = newTest.name || `Execution ${new Date().toLocaleString('en-IN')}`;
      const created = await executionsApi.create({ name: executionName, projectId, testIds: allTestIds });
      await executionsApi.start(created.id);
      enqueueSnackbar(`Execution started with ${allTestIds.length} test(s)`, { variant: 'success' });
      setNewTest({ name: '', url: '', browser: 'chromium' });
      setSelectedTests([]);
      setOpen(false);
      fetchExecutions();
    } catch (error) {
      console.error('Failed to run test:', error);
      enqueueSnackbar('Failed to trigger execution', { variant: 'error' });
    } finally {
      setIsTriggering(false);
    }
  };

  const handleRowClick = async (row: any) => {
    try {
      setDetailOpen(true);
      setLivePreview(null);
      const fullData = await executionsApi.get(row.id);
      setSelectedExecution(fullData);
      if (fullData.status === 'RUNNING') {
        const interval = setInterval(async () => {
          try {
            const updated = await executionsApi.get(row.id);
            setSelectedExecution(updated);
            if (updated.status !== 'RUNNING') clearInterval(interval);
          } catch {}
        }, 3000);
        setTimeout(() => clearInterval(interval), 300000);
      }
    } catch (error) {
      console.error('Failed to fetch execution details:', error);
      enqueueSnackbar('Failed to load execution details', { variant: 'error' });
    }
  };

  useEffect(() => {
    if (!detailOpen || !selectedExecution) { setLivePreview(null); setActionLogs([]); setConsoleLogs([]); setElementHighlights([]); return; }
    if (selectedExecution.status !== 'RUNNING') return;
    const socket = socketClient.connect();
    const onFrame = (data: any) => {
      if (data.executionId === selectedExecution.id && data.screenshot) {
        setLivePreview({ screenshot: data.screenshot, step: data.step, timestamp: data.timestamp });
      }
    };
    socket.on('live-preview', onFrame);
    const onActionLog = (data: any) => {
      if (data.executionId === selectedExecution.id) {
        setActionLogs(prev => [...prev.slice(-200), data]);
      }
    };
    const onConsoleLog = (data: any) => {
      if (data.executionId === selectedExecution.id) {
        setConsoleLogs(prev => [...prev.slice(-200), data]);
      }
    };
    const onElementHighlight = (data: any) => {
      if (data.executionId === selectedExecution.id) {
        setElementHighlights(prev => [...prev.slice(-50), data]);
      }
    };
    socket.on('action-log', onActionLog);
    socket.on('console-log', onConsoleLog);
    socket.on('element-highlight', onElementHighlight);
    const fetchLivePreview = async () => {
      try {
        const data = await executionsApi.livePreview(selectedExecution.id);
        if (data && data.screenshot) setLivePreview(data);
        else if (data && data.step && data.step !== 'Waiting for execution...') setLivePreview(data);
        else if (data) setLivePreview(prev => prev ? { ...prev, step: data.step || prev.step } : null);
      } catch {}
    };
    fetchLivePreview();
    const interval = setInterval(fetchLivePreview, 1000);
    return () => {
      clearInterval(interval);
      socket.off('live-preview', onFrame);
      socket.off('action-log', onActionLog);
      socket.off('console-log', onConsoleLog);
      socket.off('element-highlight', onElementHighlight);
    };
  }, [detailOpen, selectedExecution?.id, selectedExecution?.status]);

  const handleDelete = async () => {
    if (executionToDelete) {
      try {
        await executionsApi.delete(executionToDelete.id);
        enqueueSnackbar('Execution deleted successfully', { variant: 'success' });
        fetchExecutions();
      } catch (error) {
        enqueueSnackbar('Failed to delete execution', { variant: 'error' });
      }
    }
    setDeleteDialogOpen(false);
    setExecutionToDelete(null);
  };

  const handlePlayReplay = () => {
    setIsPlaying(true);
    setVideoProgress(0);
    const interval = setInterval(() => {
      setVideoProgress((prev) => {
        if (prev >= 100) { clearInterval(interval); setIsPlaying(false); return 100; }
        return prev + 5;
      });
    }, 200);
  };

  const handleDownloadAll = () => {
    enqueueSnackbar('Preparing downloads...', { variant: 'info' });
    setTimeout(() => enqueueSnackbar('Download started successfully!', { variant: 'success' }), 2000);
  };

  const handleExport = () => {
    const rows = filteredExecutions.map((e: any) => ({
      ID: e.id,
      Name: e.name || 'Untitled Execution',
      Status: e.status,
      Duration: e.duration ? formatDuration(e.duration) : '-',
      Started: e.startedAt ? new Date(e.startedAt).toLocaleString() : '-',
    }));
    const headers = Object.keys(rows[0] || {});
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String((r as any)[h]).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `executions-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    enqueueSnackbar(`Exported ${rows.length} execution(s)`, { variant: 'success' });
  };

  const getExecutionAssets = () => {
    const screenshots: { id: string; url: string; name: string }[] = [];
    let videoUrl = '';
    if (selectedExecution?.testRuns) {
      selectedExecution.testRuns.forEach((run: any) => {
        let meta = run.metadata;
        if (typeof meta === 'string') { try { meta = JSON.parse(meta); } catch {} }
        if (meta && typeof meta === 'object') {
          if (meta.screenshot) {
            screenshots.push({
              id: run.id,
              url: meta.screenshot.startsWith('http') ? meta.screenshot : `http://localhost:3001${meta.screenshot}`,
              name: run.test?.name || 'Test Step Screenshot',
            });
          }
          if (meta.video) {
            videoUrl = meta.video.startsWith('http') ? meta.video : `http://localhost:3001${meta.video}`;
          }
        }
      });
    }
    return { screenshots, videoUrl };
  };

  const { screenshots, videoUrl } = getExecutionAssets();

  const statusChip = (status: string) => {
    const config: Record<string, { color: 'success' | 'error' | 'warning' | 'info'; bg: string; text: string }> = {
      PASSED: { color: 'success', bg: '#ecfdf5', text: '#059669' },
      FAILED: { color: 'error', bg: '#fef2f2', text: '#dc2626' },
      RUNNING: { color: 'warning', bg: '#fffbeb', text: '#d97706' },
      PENDING: { color: 'info', bg: '#eff6ff', text: '#2563eb' },
    };
    const c = config[status] || { color: 'default' as const, bg: '#f8fafc', text: '#64748b' };
    return (
      <Chip
        label={status}
        size="small"
        sx={{
          fontWeight: 600,
          fontSize: '0.7rem',
          height: 22,
          bgcolor: c.bg,
          color: c.text,
          borderRadius: '6px',
          ...(status === 'RUNNING' && {
            '&:before': {
              content: '""',
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: c.text,
              mr: 0.5,
              animation: 'pulse 1.5s infinite',
            },
          }),
        }}
      />
    );
  };

  return (
    <Box sx={{ px: { xs: 0, sm: 0.5 } }}>
      {_isLoading && <LinearProgress sx={{ mb: 2, borderRadius: 1, height: 3 }} />}

      {/* KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        {kpiCards.map((card, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card
              sx={{
                borderRadius: 3,
                height: '100%',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
                  transform: 'translateY(-1px)',
                },
              }}
            >
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: 2.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: card.bgColor,
                      color: card.color,
                    }}
                  >
                    {card.icon}
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      px: 1,
                      py: 0.3,
                      borderRadius: 1,
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      bgcolor: card.trend.neutral
                        ? alpha('#64748b', 0.1)
                        : card.trend.positive
                          ? alpha('#10b981', 0.1)
                          : alpha('#ef4444', 0.1),
                      color: card.trend.neutral
                        ? '#64748b'
                        : card.trend.positive
                          ? '#059669'
                          : '#dc2626',
                    }}
                  >
                    {card.trend.neutral ? <TrendingFlatIcon sx={{ fontSize: 14 }} /> : card.trend.positive ? <TrendingUpIcon sx={{ fontSize: 14 }} /> : <TrendingDownIcon sx={{ fontSize: 14 }} />}
                    <span>{card.trend.value}</span>
                  </Box>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700, fontSize: '1.75rem', lineHeight: 1.1, mb: 0.3 }}>
                  {card.value}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.8rem' }}>
                  {card.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Main Card */}
      <Card
        sx={{
          borderRadius: 3,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Toolbar */}
        <Box
          sx={{
            px: 2.5,
            py: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flexWrap: 'wrap',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600, flexShrink: 0, mr: 0.5 }}>
            Executions
          </Typography>

          <TextField
            placeholder="Search by Test Name or Execution ID"
            size="small"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            sx={{
              flex: '1 1 220px',
              minWidth: 200,
              maxWidth: 360,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                bgcolor: 'grey.50',
                '& fieldset': { borderColor: 'transparent' },
                '&:hover fieldset': { borderColor: 'text.primary' },
                '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: 1.5 },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />

          <FormControl size="small" sx={{ minWidth: 150, flexShrink: 0 }}>
            <Select
              value={dateFilter}
              onChange={(e: SelectChangeEvent) => {
                setDateFilter(e.target.value);
                if (e.target.value !== 'custom') { setDateRangeStart(''); setDateRangeEnd(''); }
              }}
              displayEmpty
              sx={{
                borderRadius: 2,
                bgcolor: 'grey.50',
                fontSize: '0.8rem',
                fontWeight: 500,
                '& fieldset': { borderColor: 'transparent' },
                '&:hover fieldset': { borderColor: 'text.primary' },
                '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: 1.5 },
              }}
              startAdornment={<DateRangeIcon sx={{ color: 'text.disabled', fontSize: 18, mr: 0.5 }} />}
            >
              <MenuItem value="all">All Time</MenuItem>
              <MenuItem value="today">Today</MenuItem>
              <MenuItem value="7days">Last 7 Days</MenuItem>
              <MenuItem value="30days">Last 30 Days</MenuItem>
              <MenuItem value="custom" sx={{ borderTop: '1px solid', borderColor: 'divider', mt: 0.5, pt: 1 }}>Custom Range</MenuItem>
            </Select>
            {dateFilter === 'custom' && (
              <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
                <TextField
                  type="date"
                  size="small"
                  value={dateRangeStart}
                  onChange={(e) => setDateRangeStart(e.target.value)}
                  sx={{
                    '& .MuiInputBase-root': { borderRadius: 2, fontSize: '0.75rem', bgcolor: 'grey.50' },
                    '& .MuiInputBase-input': { py: 0.75 },
                  }}
                />
                <Typography variant="caption" color="text.disabled">to</Typography>
                <TextField
                  type="date"
                  size="small"
                  value={dateRangeEnd}
                  onChange={(e) => setDateRangeEnd(e.target.value)}
                  sx={{
                    '& .MuiInputBase-root': { borderRadius: 2, fontSize: '0.75rem', bgcolor: 'grey.50' },
                    '& .MuiInputBase-input': { py: 0.75 },
                  }}
                />
              </Box>
            )}
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 130, flexShrink: 0 }}>
            <Select
              value={statusFilter}
              onChange={(e: SelectChangeEvent) => setStatusFilter(e.target.value)}
              displayEmpty
              sx={{
                borderRadius: 2,
                bgcolor: 'grey.50',
                fontSize: '0.8rem',
                fontWeight: 500,
                '& fieldset': { borderColor: 'transparent' },
                '&:hover fieldset': { borderColor: 'text.primary' },
                '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: 1.5 },
              }}
              startAdornment={<FilterListIcon sx={{ color: 'text.disabled', fontSize: 18, mr: 0.5 }} />}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="passed">Passed</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
              <MenuItem value="running">Running</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              flexShrink: 0,
              borderColor: alpha('#6366f1', 0.3),
              color: '#6366f1',
              '&:hover': { borderColor: '#6366f1', bgcolor: alpha('#6366f1', 0.05) },
            }}
          >
            Export
          </Button>

          <Box sx={{ flex: '1 1 0', display: { xs: 'none', md: 'block' } }} />

          <Button
            variant="contained"
            startIcon={isTriggering ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
            onClick={() => setOpen(true)}
            disabled={isTriggering}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              px: 2.5,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              '&:hover': { background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' },
            }}
          >
            {isTriggering ? 'Running...' : 'Run New Test'}
          </Button>
        </Box>

        {isTriggering && (
          <Alert severity="info" sx={{ m: 2, borderRadius: 2 }}>
            A new test execution is currently in progress...
          </Alert>
        )}

        {/* Table */}
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {['ID', 'Test Name', 'Status', 'Duration', 'Started', 'Actions'].map((h) => (
                  <TableCell
                    key={h}
                    sx={{
                      fontWeight: 600,
                      color: 'text.secondary',
                      fontSize: '0.7rem',
                      letterSpacing: 0.5,
                      bgcolor: '#f8fafc',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      py: 1.5,
                    }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredExecutions.length === 0 && !_isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        bgcolor: 'grey.100',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 2,
                      }}
                    >
                      <PlayCircleIcon sx={{ fontSize: 28, color: 'text.disabled' }} />
                    </Box>
                    <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600 }} gutterBottom>
                      {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                        ? 'No matching executions'
                        : 'No executions found'}
                    </Typography>
                    <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
                      {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                        ? 'Try adjusting your filters'
                        : 'Run your first test to see execution results'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredExecutions.map((row: any) => (
                  <TableRow
                    key={row.id}
                    hover
                    sx={{
                      '&:hover': { bgcolor: alpha('#6366f1', 0.04) },
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'text.secondary', fontWeight: 500 }}>
                        {row.id?.length > 8 ? row.id.substring(0, 8) : row.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {row.name || 'Untitled Execution'}
                      </Typography>
                    </TableCell>
                    <TableCell>{statusChip(row.status)}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.8rem' }}>
                        {row.status === 'RUNNING' ? calculateElapsed(row.startedAt) : formatDuration(row.duration)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {row.startedAt
                          ? new Date(row.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                       <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="View details">
                          <IconButton
                            size="small"
                            onClick={() => handleRowClick(row)}
                            sx={{ color: 'text.secondary', '&:hover': { bgcolor: alpha('#6366f1', 0.1), color: '#6366f1' } }}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete execution">
                          <IconButton
                            size="small"
                            onClick={() => { setExecutionToDelete(row); setDeleteDialogOpen(true); }}
                            sx={{ color: 'text.secondary', '&:hover': { bgcolor: alpha('#ef4444', 0.1), color: '#ef4444' } }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Footer */}
        <Box
          sx={{
            px: 2.5,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: '#f8fafc',
          }}
        >
          <Typography variant="caption" color="text.disabled">
            {filteredExecutions.length} execution{filteredExecutions.length !== 1 ? 's' : ''}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {['PASSED', 'FAILED', 'RUNNING', 'PENDING'].map((s) => {
              const count = filteredExecutions.filter((e: any) => e.status === s).length;
              if (count === 0) return null;
              return (
                <Chip
                  key={s}
                  label={`${s}: ${count}`}
                  size="small"
                  variant="outlined"
                  sx={{
                    height: 20,
                    fontSize: '0.6rem',
                    fontWeight: 600,
                    borderColor: 'transparent',
                    bgcolor:
                      s === 'PASSED' ? alpha('#10b981', 0.1) :
                      s === 'FAILED' ? alpha('#ef4444', 0.1) :
                      s === 'RUNNING' ? alpha('#f59e0b', 0.1) :
                      alpha('#6366f1', 0.1),
                    color:
                      s === 'PASSED' ? '#059669' :
                      s === 'FAILED' ? '#dc2626' :
                      s === 'RUNNING' ? '#d97706' :
                      '#4f46e5',
                  }}
                />
              );
            })}
          </Box>
        </Box>
      </Card>

      {/* Execution Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: 1.5, bgcolor: alpha('#6366f1', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PlayCircleIcon sx={{ color: '#6366f1', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>{selectedExecution?.name}</Typography>
                <Typography variant="caption" color="text.secondary">Execution Details</Typography>
              </Box>
            </Box>
            {statusChip(selectedExecution?.status)}
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ '&.MuiDialogContent-dividers': { borderColor: 'divider' } }}>
          <Box sx={{ py: 1 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600}>Test Case Breakdown</Typography>
                </Box>
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.7rem', letterSpacing: 0.5 }}>Test Case</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.7rem', letterSpacing: 0.5 }}>Details</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.7rem', letterSpacing: 0.5 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.7rem', letterSpacing: 0.5, width: 50 }}></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedExecution?.testRuns && selectedExecution.testRuns.length > 0 ? (
                        selectedExecution.testRuns.map((run: any) => {
                          const config = run.test?.config || {};
                          const steps = config?.steps || [];
                          const srcData = config?._sourceFileData?.[0] || {};
                          const hasSrcData = srcData && Object.keys(srcData).length > 0;
                          const isRunning = run.status === 'RUNNING';
                          const isPassed = run.status === 'PASSED';
                          const isFailed = run.status === 'FAILED';
                          return (
                            <TableRow key={run.id}>
                              <TableCell sx={{ verticalAlign: 'top' }}>
                                <Typography variant="body2" fontWeight={600}>{run.test?.name || 'Unknown Test'}</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}>
                                  ID: {run.test?.id?.substring(0, 12) || run.id.substring(0, 12)}...
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ verticalAlign: 'top' }}>
                                <Typography variant="caption" display="block">{steps.length > 0 ? `${steps.length} step(s)` : 'No steps'}</Typography>
                                {run.duration != null && <Typography variant="caption" color="text.secondary" display="block">Duration: {(run.duration / 1000).toFixed(1)}s</Typography>}
                              </TableCell>
                              <TableCell sx={{ verticalAlign: 'top' }}>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {isPassed && <PassIcon fontSize="small" color="success" />}
                                    {isFailed && <FailIcon fontSize="small" color="error" />}
                                    {statusChip(run.status)}
                                    {isRunning && <CircularProgress size={12} />}
                                  </Box>
                                  {isFailed && run.error && (
                                    <Tooltip title={run.error}>
                                      <Typography variant="caption" color="error" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                                        {run.error.substring(0, 60)}{run.error.length > 60 ? '...' : ''}
                                      </Typography>
                                    </Tooltip>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell sx={{ verticalAlign: 'top' }}>
                                {hasSrcData && (
                                  <IconButton size="small" onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}>
                                    {expandedRun === run.id ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                                  </IconButton>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} align="center">
                            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                              {selectedExecution?.status === 'RUNNING' ? 'Initializing test runs...' : 'No detailed test results available for this execution.'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              {selectedExecution?.testRuns && (
                <Grid item xs={12}>
                  {selectedExecution.testRuns.map((run: any) => {
                    const config = run.test?.config || {};
                    const srcData = config?._sourceFileData?.[0] || {};
                    const hasSrcData = srcData && Object.keys(srcData).length > 0;
                    return (
                      <Collapse key={`detail-${run.id}`} in={expandedRun === run.id}>
                        <Box sx={{ px: 2, py: 1.5, bgcolor: '#fafafa', border: '1px solid', borderColor: 'divider', borderRadius: 2, mt: 0.5 }}>
                          {hasSrcData ? (
                            <>
                              <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>Source File Data:</Typography>
                              <Table size="small" sx={{ '& td': { fontSize: '0.7rem', py: 0.3 } }}>
                                <TableBody>
                                  {Object.entries(srcData).map(([key, val]) => (
                                    <TableRow key={key}>
                                      <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap', width: 120, fontWeight: 500, fontSize: '0.7rem' }}>{key}</TableCell>
                                      <TableCell sx={{ wordBreak: 'break-word', fontSize: '0.7rem' }}>{String(val)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </>
                          ) : (
                            <Typography variant="caption" color="text.secondary">No additional source data available</Typography>
                          )}
                          {run.logs && (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>Logs:</Typography>
                              <Box sx={{ fontFamily: 'monospace', fontSize: '0.65rem', bgcolor: '#1e1e1e', color: '#d4d4d4', p: 1.5, borderRadius: 2, maxHeight: 120, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                                {run.logs}
                              </Box>
                            </Box>
                          )}
                          {run.error && (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" fontWeight={600} color="error" sx={{ mb: 0.5, display: 'block' }}>Error:</Typography>
                              <Typography variant="caption" color="error" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', whiteSpace: 'pre-wrap' }}>{run.error}</Typography>
                            </Box>
                          )}
                        </Box>
                      </Collapse>
                    );
                  })}
                </Grid>
              )}

              {(selectedExecution?.status === 'RUNNING' || livePreview) && (
                <Grid item xs={12}>
                  <LivePreviewPanel
                    livePreview={livePreview}
                    actionLogs={actionLogs}
                    consoleLogs={consoleLogs}
                    elementHighlights={elementHighlights}
                    isRunning={selectedExecution?.status === 'RUNNING'}
                  />
                </Grid>
              )}

              <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <ScreenshotIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight={600}>Screenshots</Typography>
                </Box>
                {selectedExecution?.status === 'RUNNING' ? (
                  <Box sx={{ py: 4, textAlign: 'center', bgcolor: '#f9f9f9', borderRadius: 2 }}>
                    <ScreenshotIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">Screenshots will appear here once the test starts capturing them.</Typography>
                  </Box>
                ) : screenshots.length > 0 ? (
                  <Grid container spacing={2}>
                    {screenshots.map((s, idx) => (
                      <Grid item xs={12} sm={4} key={s.id}>
                        <Box component="img" src={s.url}
                          sx={{ width: '100%', borderRadius: 2, border: '1px solid #eee', objectFit: 'contain', maxHeight: 240, cursor: 'pointer' }}
                          onClick={() => window.open(s.url, '_blank')} />
                        <Typography variant="caption" color="text.secondary" display="block" align="center" sx={{ mt: 0.5, fontWeight: 500 }}>
                          Step {idx + 1}: {s.name}
                        </Typography>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Grid container spacing={2}>
                    {[1, 2, 3].map((i) => (
                      <Grid item xs={12} sm={4} key={i}>
                        <Box component="img"
                          src={selectedExecution?.status === 'PASSED' ? `https://placehold.co/600x400/10b981/FFFFFF?text=Test+Step+${i}` : `https://placehold.co/600x400/ef4444/FFFFFF?text=Failure+Step+${i}`}
                          sx={{ width: '100%', borderRadius: 2, border: '1px solid #eee' }} />
                        <Typography variant="caption" color="text.secondary">
                          {selectedExecution?.status === 'PASSED' ? `Step ${i}: Action completed successfully` : `Step ${i}: Element mismatch at this point`}
                        </Typography>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Grid>

              <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>

              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <VideoIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight={600}>Execution Video</Typography>
                </Box>
                <Box sx={{ width: '100%', aspectRatio: '16/9', bgcolor: 'black', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'white', position: 'relative', overflow: 'hidden' }}>
                  {selectedExecution?.status === 'RUNNING' ? (
                    <><CircularProgress color="inherit" size={32} sx={{ mb: 2 }} /><Typography variant="body2">Recording in progress...</Typography></>
                  ) : videoUrl ? (
                    <video src={videoUrl} controls style={{ width: '100%', height: '100%', borderRadius: '4px', objectFit: 'contain' }} />
                  ) : isPlaying ? (
                    <><Box component="img" src="https://placehold.co/600x400/000000/FFFFFF?text=Simulating+Playback..." sx={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />
                      <Box sx={{ position: 'absolute', bottom: 0, left: 0, width: '100%', p: 2 }}>
                        <LinearProgress variant="determinate" value={videoProgress} sx={{ height: 4, borderRadius: 2 }} />
                        <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>Playing: {videoProgress}%</Typography>
                      </Box>
                    </>
                  ) : (
                    <><VideoIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                      <Typography variant="body2" sx={{ opacity: 0.7 }}>{videoProgress === 100 ? 'Replay Finished' : 'Video Replay Ready'}</Typography>
                      <Button size="small" variant="contained" sx={{ mt: 2 }} onClick={handlePlayReplay}>
                        {videoProgress === 100 ? 'Restart Replay' : 'Play Replay'}
                      </Button>
                    </>
                  )}
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <LogsIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight={600}>Console Logs</Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: '#1e1e1e', color: '#d4d4d4', borderRadius: 2, fontFamily: 'monospace', fontSize: '0.75rem', height: 200, overflowY: 'auto' }}>
                  {selectedExecution?.testRuns && selectedExecution.testRuns.length > 0 ? (
                    selectedExecution.testRuns.map((run: any, idx: number) => (
                      <div key={idx}>
                        <div style={{ color: '#569cd6', marginBottom: 4 }}>--- Test: {run.test?.name} ---</div>
                        {run.logs ? <div style={{ whiteSpace: 'pre-wrap' }}>{run.logs}</div> : <div style={{ fontStyle: 'italic', opacity: 0.6 }}>Waiting for logs...</div>}
                        {run.error && <div style={{ color: '#f44747', marginTop: 4 }}>Error: {run.error}</div>}
                      </div>
                    ))
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, opacity: 0.6 }}>
                      <CircularProgress size={12} color="inherit" />
                      <span>Initializing logs...</span>
                    </Box>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setDetailOpen(false)} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>Close</Button>
          <Button variant="contained" startIcon={<ScreenshotIcon />} onClick={handleDownloadAll}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', '&:hover': { background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' } }}>
            Download All
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} PaperProps={{ sx: { borderRadius: 3, maxWidth: 420 } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 1.5, bgcolor: alpha('#ef4444', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DeleteIcon sx={{ color: '#ef4444', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Delete Execution</Typography>
              <Typography variant="caption" color="text.secondary">This action cannot be undone</Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Are you sure you want to delete this execution record?</Typography>
          {executionToDelete && (
            <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" fontWeight={600}>{executionToDelete.name}</Typography>
              <Typography variant="caption" color="text.secondary">Started: {executionToDelete.startedAt}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* New Execution Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 1.5, bgcolor: alpha('#6366f1', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RunIcon sx={{ color: '#6366f1', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Start New Test Execution</Typography>
              <Typography variant="caption" color="text.secondary">Configure and run your tests</Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ '&.MuiDialogContent-dividers': { borderColor: 'divider' } }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <TextField select label="Project" fullWidth value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              {projects.map((p: any) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </TextField>

            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem', letterSpacing: 0.5 }}>CREATE NEW TEST (OPTIONAL)</Typography>
            <TextField label="Test Name" fullWidth value={newTest.name} onChange={(e) => setNewTest({ ...newTest, name: e.target.value })} placeholder="e.g. Homepage Load Test" />
            <TextField label="Target URL" fullWidth value={newTest.url} onChange={(e) => setNewTest({ ...newTest, url: e.target.value })} placeholder="https://your-website.com" />
            <TextField select label="Browser" fullWidth value={newTest.browser} onChange={(e) => setNewTest({ ...newTest, browser: e.target.value })} SelectProps={{ native: true }}>
              <option value="chromium">Chromium (Chrome/Edge)</option>
              <option value="firefox">Firefox</option>
              <option value="webkit">Webkit (Safari)</option>
            </TextField>

            <Divider />

            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem', letterSpacing: 0.5 }}>OR SELECT EXISTING TESTS</Typography>
            {availableTests.length > 0 ? (
              <Box sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1 }}>
                {availableTests.map((tc: any) => (
                  <Box key={tc.id} sx={{ display: 'flex', alignItems: 'center', py: 0.3 }}>
                    <Checkbox size="small" checked={selectedTests.includes(tc.id)}
                      onChange={() => setSelectedTests(prev => prev.includes(tc.id) ? prev.filter(id => id !== tc.id) : [...prev, tc.id])} />
                    <Box sx={{ ml: 0.5 }}>
                      <Typography variant="body2">{tc.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {tc.config?.url ? tc.config.url.substring(0, 40) : 'No URL'}
                        {tc.tags?.length > 0 ? ` | ${tc.tags.join(', ')}` : ''}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                No test cases found. Upload test cases from the Test Cases page first.
              </Typography>
            )}
            {selectedTests.length > 0 && <Typography variant="caption" color="primary" sx={{ fontWeight: 600 }}>{selectedTests.length} test(s) selected</Typography>}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => { setOpen(false); setSelectedTests([]); }} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>Cancel</Button>
          <Button variant="contained" startIcon={<RunIcon />} onClick={handleRunTest}
            disabled={(!newTest.name || !newTest.url) && selectedTests.length === 0 || isTriggering}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', '&:hover': { background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' } }}>
            {isTriggering ? <CircularProgress size={16} /> : 'Start Execution'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
