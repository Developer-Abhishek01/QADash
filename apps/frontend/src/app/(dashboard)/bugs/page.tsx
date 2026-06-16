'use client';

import { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Button, TextField, MenuItem, Select, FormControl, InputLabel, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Grid, Avatar, Tooltip, LinearProgress } from '@mui/material';
import { PageHeader } from '@/components/common/PageHeader';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/lib/auth/AuthContext';

interface Bug {
  id: string;
  title: string;
  description?: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'REOPENED';
  assignee?: { id: string; name: string };
  user: { name: string };
  project: { name: string };
  tags: string[];
  screenshots: string[];
  videos: string[];
  logs?: string;
  createdAt: string;
  aiPrediction?: { severity: string; confidence: number; priority: string; reasoning: string };
}

const severityColors: Record<string, string> = { CRITICAL: '#d32f2f', HIGH: '#f57c00', MEDIUM: '#fbc02d', LOW: '#388e3c' };
const statusColors: Record<string, string> = { OPEN: '#1976d2', IN_PROGRESS: '#7b1fa2', RESOLVED: '#388e3c', CLOSED: '#757575', REOPENED: '#d32f2f' };
const priorityIcons: Record<string, string> = { P1: '🔴', P2: '🟠', P3: '🟡', P4: '🟢' };

interface BugStats { total: number; open: number; inProgress: number; resolved: number; closed: number; byStatus: Record<string, number>; bySeverity: Record<string, number> }

import { bugsApi } from '@/lib/api/client';

export default function BugsPage() {
  const { user: _user } = useAuth();
  const { projects = [] } = useProjects() || { projects: [] };
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [_isMounted, setIsMounted] = useState(false);
  const [stats, setStats] = useState<BugStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ projectId: '', status: '', severity: '' });
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedBug, setSelectedBug] = useState<Bug | null>(null);
  const [newBug, setNewBug] = useState({ title: '', description: '', severity: 'MEDIUM', priority: 'P3', tags: '' });

  // Fetch bugs from real API
  const fetchBugs = async () => {
    try {
      setLoading(true);
      const data = await bugsApi.list(filters);
      setBugs(data);
      updateStats(data);
    } catch (error) {
      console.error('Failed to fetch bugs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchBugs();
  }, [filters]);

  const updateStats = (currentBugs: Bug[]) => {
    const newStats: BugStats = {
      total: currentBugs.length,
      open: currentBugs.filter(b => b.status === 'OPEN').length,
      inProgress: currentBugs.filter(b => b.status === 'IN_PROGRESS').length,
      resolved: currentBugs.filter(b => b.status === 'RESOLVED').length,
      closed: currentBugs.filter(b => b.status === 'CLOSED').length,
      byStatus: {},
      bySeverity: {
        CRITICAL: currentBugs.filter(b => b.severity === 'CRITICAL').length,
        HIGH: currentBugs.filter(b => b.severity === 'HIGH').length,
        MEDIUM: currentBugs.filter(b => b.severity === 'MEDIUM').length,
        LOW: currentBugs.filter(b => b.severity === 'LOW').length,
      }
    };
    setStats(newStats);
  };

  const handleCreate = async () => {
    try {
      setLoading(true);
      const bugData = {
        title: newBug.title,
        description: newBug.description,
        severity: newBug.severity,
        priority: newBug.priority,
        status: 'OPEN',
        projectId: filters.projectId || projects[0]?.id,
        tags: newBug.tags.split(',').map(t => t.trim()),
      };
      await bugsApi.create(bugData);
      setCreateOpen(false);
      setNewBug({ title: '', description: '', severity: 'MEDIUM', priority: 'P3', tags: '' });
      fetchBugs();
    } catch (error) {
      console.error('Failed to create bug:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type: 'excel' | 'csv') => {
    if (!filters.projectId) return alert('Select a project first');
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
    if (type === 'csv') {
      window.open(`${baseUrl}/api/v1/bugs/export/csv/${filters.projectId}`, '_blank');
    } else {
      try {
        const res = await fetch(`${baseUrl}/api/v1/bugs/export/excel?projectId=${filters.projectId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        });
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bugs.xlsx';
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) { console.error(err); }
    }
  };

  const handleSyncJira = async () => {
    if (!selectedBug) return;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
      await fetch(`${baseUrl}/api/v1/bugs/${selectedBug.id}/sync-jira`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } });
      alert('Synced to Jira!');
    } catch (err) { console.error(err); }
  };

  return (
    <Box>
       <PageHeader title="Bug Management" subtitle="Track, assign, and manage bug lifecycle with AI predictions" actions={<Button variant="contained" onClick={() => setCreateOpen(true)}>Create Bug</Button>} />
      
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} md={2}><Card sx={{ textAlign: 'center' }}><CardContent><Typography variant="h4">{stats.total}</Typography><Typography variant="caption">Total</Typography></CardContent></Card></Grid>
          <Grid item xs={6} md={2}><Card sx={{ textAlign: 'center', bgcolor: 'error.light' }}><CardContent><Typography variant="h4" color="white">{stats.open}</Typography><Typography variant="caption" color="white">Open</Typography></CardContent></Card></Grid>
          <Grid item xs={6} md={2}><Card sx={{ textAlign: 'center', bgcolor: 'warning.light' }}><CardContent><Typography variant="h4" color="white">{stats.inProgress}</Typography><Typography variant="caption" color="white">In Progress</Typography></CardContent></Card></Grid>
          <Grid item xs={6} md={2}><Card sx={{ textAlign: 'center', bgcolor: 'success.light' }}><CardContent><Typography variant="h4" color="white">{stats.resolved}</Typography><Typography variant="caption" color="white">Resolved</Typography></CardContent></Card></Grid>
          <Grid item xs={6} md={2}><Card sx={{ textAlign: 'center', bgcolor: 'grey.400' }}><CardContent><Typography variant="h4">{stats.closed}</Typography><Typography variant="caption">Closed</Typography></CardContent></Card></Grid>
          <Grid item xs={6} md={2}>
            <Card sx={{ textAlign: 'center' }}><CardContent>
              <Typography variant="caption" display="block">By Severity</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 1 }}>
                {stats.bySeverity['CRITICAL'] && <Chip label={`C:${stats.bySeverity['CRITICAL']}`} size="small" sx={{ bgcolor: '#d32f2f', color: 'white', height: 20, fontSize: '0.65rem' }} />}
                {stats.bySeverity['HIGH'] && <Chip label={`H:${stats.bySeverity['HIGH']}`} size="small" sx={{ bgcolor: '#f57c00', color: 'white', height: 20, fontSize: '0.65rem' }} />}
                {stats.bySeverity['MEDIUM'] && <Chip label={`M:${stats.bySeverity['MEDIUM']}`} size="small" sx={{ bgcolor: '#fbc02d', color: 'black', height: 20, fontSize: '0.65rem' }} />}
              </Box>
            </CardContent></Card>
          </Grid>
        </Grid>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Project</InputLabel>
            <Select value={filters.projectId} label="Project" onChange={e => setFilters({ ...filters, projectId: e.target.value })}>
              <MenuItem value="">All Projects</MenuItem>
              {projects.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select value={filters.status} label="Status" onChange={e => setFilters({ ...filters, status: e.target.value })}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="OPEN">Open</MenuItem>
              <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
              <MenuItem value="RESOLVED">Resolved</MenuItem>
              <MenuItem value="CLOSED">Closed</MenuItem>
              <MenuItem value="REOPENED">Reopened</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Severity</InputLabel>
            <Select value={filters.severity} label="Severity" onChange={e => setFilters({ ...filters, severity: e.target.value })}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="CRITICAL">Critical</MenuItem>
              <MenuItem value="HIGH">High</MenuItem>
              <MenuItem value="MEDIUM">Medium</MenuItem>
              <MenuItem value="LOW">Low</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={3}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" onClick={fetchBugs} fullWidth>Filter</Button>
            <Button variant="outlined" onClick={() => handleExport('excel')}>Excel</Button>
            <Button variant="outlined" onClick={() => handleExport('csv')}>CSV</Button>
          </Box>
        </Grid>
      </Grid>

      {loading && <LinearProgress />}
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Assignee</TableCell>
              <TableCell>AI Prediction</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bugs.length === 0 ? (
              <TableRow><TableCell colSpan={8} align="center">No bugs found. Select a project and filter.</TableCell></TableRow>
            ) : bugs.map(bug => (
              <TableRow key={bug.id} hover>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{bug.id.slice(0, 8)}</TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bug.title}</Typography>
                  {bug.tags.length > 0 && <Box sx={{ mt: 0.5 }}>{bug.tags.map(t => <Chip key={t} label={t} size="small" sx={{ mr: 0.5, height: 18 }} />)}</Box>}
                </TableCell>
                <TableCell><Chip label={bug.severity} size="small" sx={{ bgcolor: severityColors[bug.severity], color: 'white' }} /></TableCell>
                <TableCell><Tooltip title={`Priority ${bug.priority}`}><span>{priorityIcons[bug.priority]}</span></Tooltip></TableCell>
                <TableCell><Chip label={bug.status.replace('_', ' ')} size="small" sx={{ bgcolor: statusColors[bug.status], color: 'white' }} /></TableCell>
                <TableCell>{bug.assignee ? <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>{bug.assignee.name[0]}</Avatar> : '—'}</TableCell>
                <TableCell>
                  {bug.aiPrediction ? (
                    <Tooltip title={`AI: ${bug.aiPrediction.reasoning}`}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">🤖</Typography>
                        <Typography variant="caption">{bug.aiPrediction.severity} ({Math.round(bug.aiPrediction.confidence * 100)}%)</Typography>
                      </Box>
                    </Tooltip>
                  ) : '—'}
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => { setSelectedBug(bug); setDetailOpen(true); }}>👁️</IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Bug</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Title" fullWidth value={newBug.title} onChange={e => setNewBug({ ...newBug, title: e.target.value })} />
            <TextField label="Description" fullWidth multiline rows={3} value={newBug.description} onChange={e => setNewBug({ ...newBug, description: e.target.value })} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Severity</InputLabel>
                  <Select value={newBug.severity} label="Severity" onChange={e => setNewBug({ ...newBug, severity: e.target.value })}>
                    <MenuItem value="CRITICAL">Critical</MenuItem>
                    <MenuItem value="HIGH">High</MenuItem>
                    <MenuItem value="MEDIUM">Medium</MenuItem>
                    <MenuItem value="LOW">Low</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select value={newBug.priority} label="Priority" onChange={e => setNewBug({ ...newBug, priority: e.target.value })}>
                    <MenuItem value="P1">P1 - Critical</MenuItem>
                    <MenuItem value="P2">P2 - High</MenuItem>
                    <MenuItem value="P3">P3 - Medium</MenuItem>
                    <MenuItem value="P4">P4 - Low</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <TextField label="Tags (comma separated)" fullWidth value={newBug.tags} onChange={e => setNewBug({ ...newBug, tags: e.target.value })} helperText="e.g., login, ui, critical" />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!newBug.title}>Create</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Bug Details {selectedBug && <Chip label={selectedBug.id.slice(0, 8)} size="small" sx={{ ml: 2 }} />}</DialogTitle>
        <DialogContent>
          {selectedBug && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="h6">{selectedBug.title}</Typography>
                <Typography variant="body2" color="text.secondary">{selectedBug.description}</Typography>
              </Grid>
              <Grid item xs={6}><Typography variant="caption">Severity: <Chip label={selectedBug.severity} size="small" sx={{ bgcolor: severityColors[selectedBug.severity], color: 'white' }} /></Typography></Grid>
              <Grid item xs={6}><Typography variant="caption">Priority: {priorityIcons[selectedBug.priority]} {selectedBug.priority}</Typography></Grid>
              <Grid item xs={6}><Typography variant="caption">Status: <Chip label={selectedBug.status} size="small" /></Typography></Grid>
              <Grid item xs={6}><Typography variant="caption">Reporter: {selectedBug.user.name}</Typography></Grid>
              {selectedBug.aiPrediction && (
                <Grid item xs={12}>
                  <Card variant="outlined" sx={{ bgcolor: 'primary.50', p: 2 }}>
                    <Typography variant="subtitle2">🤖 AI Prediction</Typography>
                    <Typography variant="body2">Severity: {selectedBug.aiPrediction.severity} ({Math.round(selectedBug.aiPrediction.confidence * 100)}% confidence)</Typography>
                    <Typography variant="body2">Priority: {selectedBug.aiPrediction.priority}</Typography>
                    <Typography variant="caption" color="text.secondary">Reasoning: {selectedBug.aiPrediction.reasoning}</Typography>
                  </Card>
                </Grid>
              )}
              {selectedBug.screenshots.length > 0 && (
                <Grid item xs={12}><Typography variant="subtitle2">Screenshots ({selectedBug.screenshots.length})</Typography><Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>{selectedBug.screenshots.map((s, i) => <img key={i} src={s} alt={`screenshot-${i}`} style={{ width: 100, height: 60, objectFit: 'cover', borderRadius: 4 }} />)}</Box></Grid>
              )}
              {selectedBug.logs && <Grid item xs={12}><Typography variant="subtitle2">Logs</Typography><pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4, overflow: 'auto', maxHeight: 200 }}>{selectedBug.logs}</pre></Grid>}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Close</Button>
          <Button variant="outlined" onClick={handleSyncJira}>Sync to Jira</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}