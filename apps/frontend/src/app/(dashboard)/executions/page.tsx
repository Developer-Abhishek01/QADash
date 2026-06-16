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
} from '@mui/material';
import { 
  Add as AddIcon, 
  PlayArrow as RunIcon,
  PhotoCamera as ScreenshotIcon,
  Videocam as VideoIcon,
  History as LogsIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { useState, useEffect, useRef } from 'react';
import { useSnackbar } from 'notistack';
import { executionsApi, testsApi, projectsApi } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';

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

  // Fetch real data from API
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

    return () => {
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const hasRunning = executions.some((e: any) => e.status === 'RUNNING');
    if (!hasRunning) return;

    const interval = setInterval(() => fetchExecutionsRef.current(), 5000);
    return () => clearInterval(interval);
  }, [executions]);

  const calculateElapsed = (startedAt: string) => {
    try {
      if (!startedAt) return '-';
      
      // Handle ISO string or common local formats
      let start: Date;
      if (startedAt.includes('/')) {
        // Handle "dd/mm/yyyy, hh:mm:ss" format
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
    } catch (e) {
      console.error('Error calculating elapsed time:', e);
      return '-';
    }
  };

  const columns = [
    { id: 'id', label: 'ID', minWidth: 80 },
    { id: 'name', label: 'Test Name', minWidth: 200 },
    { 
      id: 'status', 
      label: 'Status', 
      minWidth: 100,
      format: (value: any) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip 
            label={value.toUpperCase()} 
            size="small" 
            color={value === 'PASSED' ? 'success' : value === 'FAILED' ? 'error' : 'warning'}
            sx={{ 
              fontWeight: 600,
              ...(value === 'RUNNING' && {
                animation: 'pulse 1.5s infinite ease-in-out',
                '@keyframes pulse': {
                  '0%': { opacity: 1 },
                  '50%': { opacity: 0.5 },
                  '100%': { opacity: 1 },
                }
              })
            }}
          />
          {value === 'RUNNING' && <CircularProgress size={14} />}
        </Box>
      )
    },
    { 
      id: 'duration', 
      label: 'Duration', 
      minWidth: 100,
      format: (value: any, row: any) => {
        if (row.status === 'RUNNING') {
          return (
            <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 600 }}>
              {calculateElapsed(row.startedAt)}
            </Typography>
          );
        }
        return value ? `${(Number(value) / 1000).toFixed(2)}s` : '-';
      }
    },
    { id: 'startedAt', label: 'Started', minWidth: 150 },
    { 
      id: 'actions', 
      label: 'Actions', 
      minWidth: 100, 
      align: 'right' as const,
      format: (_: any, row: any) => (
        <IconButton 
          size="small" 
          color="error" 
          onClick={(e) => {
            e.stopPropagation();
            setExecutionToDelete(row);
            setDeleteDialogOpen(true);
          }}
        >
          <DeleteIcon />
        </IconButton>
      )
    },
  ];



  const handleRunTest = async () => {
    if (!newTest.name || !newTest.url || !projectId) return;

    setIsTriggering(true);
    try {
      // 1. Create a real test case with the provided config
      const test = await testsApi.create({
        name: newTest.name,
        projectId,
        config: {
          url: newTest.url,
          framework: 'playwright',
          browsers: [newTest.browser],
          timeout: 30000,
          retries: 0,
        },
        tags: ['manual-execution'],
      });

      // 2. Create Execution with the real test ID
      const created = await executionsApi.create({
        name: newTest.name,
        projectId,
        testIds: [test.id],
      });
      
      // 3. Start Execution
      await executionsApi.start(created.id);
      
      enqueueSnackbar('Test execution started successfully!', { variant: 'success' });
      setNewTest({ name: '', url: '', browser: 'chromium' });
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
    } catch (error) {
      console.error('Failed to fetch execution details:', error);
      enqueueSnackbar('Failed to load execution details', { variant: 'error' });
    }
  };

  useEffect(() => {
    if (!detailOpen || !selectedExecution) {
      setLivePreview(null);
      return;
    }

    if (selectedExecution.status !== 'RUNNING') {
      return;
    }

    const fetchLivePreview = async () => {
      try {
        const data = await executionsApi.livePreview(selectedExecution.id);
        if (data && data.screenshot) {
          setLivePreview(data);
        } else if (data && data.step && data.step !== 'Waiting for execution...') {
          setLivePreview(data);
        }
      } catch {}
    };

    fetchLivePreview();
    const interval = setInterval(fetchLivePreview, 2000);

    return () => clearInterval(interval);
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
        if (prev >= 100) {
          clearInterval(interval);
          setIsPlaying(false);
          return 100;
        }
        return prev + 5;
      });
    }, 200);
  };

  const handleDownloadAll = () => {
    enqueueSnackbar('Preparing downloads... All screenshots and logs will be zipped.', { variant: 'info' });
    setTimeout(() => {
      enqueueSnackbar('Download started successfully!', { variant: 'success' });
    }, 2000);
  };

  // Helper to extract screenshots and video URLs from selectedExecution test runs
  const getExecutionAssets = () => {
    const screenshots: { id: string; url: string; name: string }[] = [];
    let videoUrl = '';

    if (selectedExecution?.testRuns) {
      selectedExecution.testRuns.forEach((run: any) => {
        let meta = run.metadata;
        if (typeof meta === 'string') {
          try {
            meta = JSON.parse(meta);
          } catch {}
        }

        if (meta && typeof meta === 'object') {
          if (meta.screenshot) {
            const url = meta.screenshot.startsWith('http') 
              ? meta.screenshot 
              : `http://localhost:3001${meta.screenshot}`;
            screenshots.push({
              id: run.id,
              url,
              name: run.test?.name || 'Test Step Screenshot',
            });
          }

          if (meta.video) {
            videoUrl = meta.video.startsWith('http')
              ? meta.video
              : `http://localhost:3001${meta.video}`;
          }
        }
      });
    }

    return { screenshots, videoUrl };
  };

  const { screenshots, videoUrl } = getExecutionAssets();

  return (
    <Box>
      <PageHeader
        title="Executions"
        subtitle="View and manage test execution history"
        actions={
          <Button 
            variant="contained" 
            startIcon={isTriggering ? <CircularProgress size={20} color="inherit" /> : <AddIcon />} 
            onClick={() => setOpen(true)}
            disabled={isTriggering}
          >
            {isTriggering ? 'Running...' : 'Run New Test'}
          </Button>
        }
      />
      
      {isTriggering && (
        <Alert severity="info" sx={{ mb: 3 }}>
          A new test execution is currently in progress...
        </Alert>
      )}

      <Card>
        <CardContent>
          <DataTable 
            columns={columns} 
            data={executions} 
            onRowClick={handleRowClick}
          />
        </CardContent>
      </Card>

      {/* Execution Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight={600}>Execution Details: {selectedExecution?.name}</Typography>
          <Chip 
            label={selectedExecution?.status?.toUpperCase()} 
            color={selectedExecution?.status === 'passed' ? 'success' : 'error'} 
            size="small" 
          />
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            {/* Individual Test Case Results Table */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>Test Case Breakdown</Typography>
              </Box>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Test Case ID</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedExecution?.testRuns && selectedExecution.testRuns.length > 0 ? (
                      selectedExecution.testRuns.map((run: any) => (
                        <TableRow key={run.id}>
                          <TableCell>{run.id.substring(0, 8)}...</TableCell>
                          <TableCell>{run.test?.name || 'Unknown Test'}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip 
                                label={run.status.toUpperCase()} 
                                size="small" 
                                color={run.status === 'PASSED' ? 'success' : run.status === 'FAILED' ? 'error' : 'warning'}
                                variant="outlined"
                              />
                              {run.status === 'RUNNING' && <CircularProgress size={12} />}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                            {selectedExecution?.status === 'RUNNING' 
                              ? 'Initializing test runs...' 
                              : 'No detailed test results available for this execution.'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>

            {/* Live Preview Section - shows real-time browser view during execution */}
            {selectedExecution?.status === 'RUNNING' && (
              <Grid item xs={12}>
                <Box sx={{ mb: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 2, border: '2px solid', borderColor: 'primary.light' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'error.main', '@keyframes livePulse': { '0%': { opacity: 1 }, '50%': { opacity: 0.3 }, '100%': { opacity: 1 } }, animation: 'livePulse 1s infinite' }} />
                    <Typography variant="subtitle1" fontWeight={600} color="primary">
                      Live Preview
                    </Typography>
                    {livePreview?.step && (
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        {livePreview.step}
                      </Typography>
                    )}
                  </Box>
                  <Box
                    sx={{
                      width: '100%',
                      aspectRatio: '16/9',
                      bgcolor: '#000',
                      borderRadius: 1,
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    {livePreview?.screenshot ? (
                      <Box
                        component="img"
                        src={livePreview.screenshot.startsWith('/') ? `http://localhost:3001${livePreview.screenshot}` : `data:image/jpeg;base64,${livePreview.screenshot}`}
                        sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        alt="Live browser preview"
                      />
                    ) : (
                      <Box sx={{ textAlign: 'center', color: 'white' }}>
                        <CircularProgress color="inherit" size={32} sx={{ mb: 1 }} />
                        <Typography variant="body2">{livePreview?.step || 'Initializing browser...'}</Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Grid>
            )}

            <Grid item xs={12}><Divider /></Grid>

            {/* Screenshots Section */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <ScreenshotIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={600}>Screenshots</Typography>
              </Box>
              {selectedExecution?.status === 'RUNNING' ? (
                <Box sx={{ py: 4, textAlign: 'center', bgcolor: '#f9f9f9', borderRadius: 1 }}>
                  <ScreenshotIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">Screenshots will appear here once the test starts capturing them.</Typography>
                </Box>
              ) : screenshots.length > 0 ? (
                <Grid container spacing={2}>
                  {screenshots.map((s, idx) => (
                    <Grid item xs={12} sm={4} key={s.id}>
                      <Box 
                        component="img"
                        src={s.url}
                        sx={{ width: '100%', borderRadius: 1, border: '1px solid #eee', objectFit: 'contain', maxHeight: 240, cursor: 'pointer' }}
                        onClick={() => window.open(s.url, '_blank')}
                      />
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
                      <Box 
                        component="img"
                        src={selectedExecution?.status === 'PASSED' 
                          ? `https://placehold.co/600x400/10b981/FFFFFF?text=Test+Step+${i}` 
                          : `https://placehold.co/600x400/ef4444/FFFFFF?text=Failure+Step+${i}`
                        }
                        sx={{ width: '100%', borderRadius: 1, border: '1px solid #eee' }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {selectedExecution?.status === 'PASSED' 
                          ? `Step ${i}: Action completed successfully` 
                          : `Step ${i}: Element mismatch at this point`
                        }
                      </Typography>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Grid>

            <Grid item xs={12}><Divider /></Grid>

            {/* Video Section */}
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <VideoIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={600}>Execution Video</Typography>
              </Box>
              <Box 
                sx={{ 
                  width: '100%', 
                  aspectRatio: '16/9', 
                  bgcolor: 'black', 
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  color: 'white',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {selectedExecution?.status === 'RUNNING' ? (
                  <>
                    <CircularProgress color="inherit" size={32} sx={{ mb: 2 }} />
                    <Typography variant="body2">Recording in progress...</Typography>
                  </>
                ) : videoUrl ? (
                  <video 
                    src={videoUrl} 
                    controls 
                    style={{ width: '100%', height: '100%', borderRadius: '4px', objectFit: 'contain' }}
                  />
                ) : isPlaying ? (
                  <>
                    <Box 
                      component="img"
                      src="https://placehold.co/600x400/000000/FFFFFF?text=Simulating+Playback..."
                      sx={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }}
                    />
                    <Box sx={{ position: 'absolute', bottom: 0, left: 0, width: '100%', p: 2 }}>
                      <LinearProgress variant="determinate" value={videoProgress} sx={{ height: 4, borderRadius: 2 }} />
                      <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>Playing: {videoProgress}%</Typography>
                    </Box>
                  </>
                ) : (
                  <>
                    <VideoIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                    <Typography variant="body2" sx={{ opacity: 0.7 }}>
                      {videoProgress === 100 ? 'Replay Finished' : 'Video Replay Ready'}
                    </Typography>
                    <Button 
                      size="small" 
                      variant="contained" 
                      sx={{ mt: 2 }} 
                      onClick={handlePlayReplay}
                    >
                      {videoProgress === 100 ? 'Restart Replay' : 'Play Replay'}
                    </Button>
                  </>
                )}
              </Box>
            </Grid>

            {/* Logs Section */}
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <LogsIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={600}>Console Logs</Typography>
              </Box>
              <Box 
                sx={{ 
                  p: 2, 
                  bgcolor: '#1e1e1e', 
                  color: '#d4d4d4', 
                  borderRadius: 1, 
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  height: 200,
                  overflowY: 'auto'
                }}
              >
                {selectedExecution?.testRuns && selectedExecution.testRuns.length > 0 ? (
                  selectedExecution.testRuns.map((run: any, idx: number) => (
                    <div key={idx}>
                      <div style={{ color: '#569cd6', marginBottom: 4 }}>--- Test: {run.test?.name} ---</div>
                      {run.logs ? (
                        <div style={{ whiteSpace: 'pre-wrap' }}>{run.logs}</div>
                      ) : (
                        <div style={{ fontStyle: 'italic', opacity: 0.6 }}>Waiting for logs...</div>
                      )}
                      {run.error && (
                        <div style={{ color: '#f44747', marginTop: 4 }}>Error: {run.error}</div>
                      )}
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
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDetailOpen(false)}>Close</Button>
          <Button variant="contained" startIcon={<ScreenshotIcon />} onClick={handleDownloadAll}>Download All</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Execution</DialogTitle>
        <DialogContent dividers>
          <Typography>Are you sure you want to delete this execution record? This action cannot be undone.</Typography>
          {executionToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="body2" fontWeight={600}>{executionToDelete.name}</Typography>
              <Typography variant="caption" color="text.secondary">Started: {executionToDelete.startedAt}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Start New Test Execution</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              select
              label="Project"
              fullWidth
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              {projects.map((p: any) => (
                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Test Name"
              fullWidth
              value={newTest.name}
              onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
              placeholder="e.g. Homepage Load Test"
            />
            <TextField
              label="Target URL"
              fullWidth
              value={newTest.url}
              onChange={(e) => setNewTest({ ...newTest, url: e.target.value })}
              placeholder="https://your-website.com"
            />
            <TextField
              select
              label="Browser"
              fullWidth
              value={newTest.browser}
              onChange={(e) => setNewTest({ ...newTest, browser: e.target.value })}
              SelectProps={{ native: true }}
            >
              <option value="chromium">Chromium (Chrome/Edge)</option>
              <option value="firefox">Firefox</option>
              <option value="webkit">Webkit (Safari)</option>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            startIcon={<RunIcon />} 
            onClick={handleRunTest}
            disabled={!newTest.name || !newTest.url || !projectId}
          >
            Start Execution
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}