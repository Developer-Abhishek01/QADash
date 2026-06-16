'use client';

import {
  Box,
  Card,
  CardContent,
  Typography,
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
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Checkbox,
  Tooltip,
} from '@mui/material';
import {
  GetApp as DownloadIcon,
  Visibility as ViewIcon,
  Description as ReportIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Share as ShareIcon,
  Link as LinkIcon,
  DeleteSweep as BulkDeleteIcon,
} from '@mui/icons-material';
import { reportsApi, projectsApi } from '@/lib/api/client';
import { copyToClipboard } from '@/lib/utils';
import { PageHeader } from '@/components/common/PageHeader';
import { useState, useEffect } from 'react';
import { useSnackbar } from 'notistack';

interface TestResult {
  id: string;
  testId: string;
  testName: string;
  status: string;
  duration?: number;
  error?: string;
  logs?: string;
  screenshotUrl?: string;
  videoUrl?: string;
  completedAt?: string;
}

interface Report {
  id: string;
  name: string;
  type: string;
  summary: {
    totalTests?: number;
    passed?: number;
    failed?: number;
    status?: string;
    executionId?: string;
    completedAt?: string;
  };
  data?: { testResults?: TestResult[] };
  createdAt: string;
  project?: { id: string; name: string };
  user?: { name: string };
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const { enqueueSnackbar } = useSnackbar();
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewReport, setViewReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; ids: string[] }>({ open: false, ids: [] });

  const recent24hCount = reports.filter(
    r => Date.now() - new Date(r.createdAt).getTime() < 24 * 60 * 60 * 1000
  ).length;

  const estimatedStorageMB = Math.round(reports.length * 0.3 * 10) / 10;
  const storagePercent = Math.min(estimatedStorageMB / 100 * 100, 100);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await reportsApi.list();
      setReports(data);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      enqueueSnackbar('Failed to load reports', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleView = (report: Report) => {
    setViewReport(report);
  };

  const handleShare = async (report: Report) => {
    const shareUrl = `${window.location.origin}/share/report/${report.id}`;
    await copyToClipboard(shareUrl);
    enqueueSnackbar('Share link copied to clipboard!', { variant: 'success' });
  };

  const handleDeleteClick = (id: string) => {
    setConfirmDelete({ open: true, ids: [id] });
  };

  const handleBulkDeleteClick = () => {
    if (selectedIds.length === 0) return;
    setConfirmDelete({ open: true, ids: selectedIds });
  };

  const handleConfirmDelete = async () => {
    const { ids } = confirmDelete;
    setConfirmDelete({ open: false, ids: [] });
    try {
      if (ids.length === 1) {
        await reportsApi.delete(ids[0]);
      } else {
        await reportsApi.bulkDelete(ids);
      }
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
      enqueueSnackbar(`${ids.length} report(s) deleted successfully`, { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Failed to delete report(s)', { variant: 'error' });
    }
    await fetchReports();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === reports.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(reports.map(r => r.id));
    }
  };

  const handleGenerateReport = async () => {
    try {
      setIsGenerating(true);
      enqueueSnackbar('Generating new report...', { variant: 'info' });

      let projectId = 'default';
      try {
        const projects = await projectsApi.list();
        if (projects && projects.length > 0) {
          projectId = projects[0].id;
        }
      } catch {
      }

      await reportsApi.generate({
        name: `Report_${new Date().toISOString().slice(0, 10)}_${reports.length + 1}`,
        projectId,
        type: 'TEST_SUMMARY',
        summary: {},
      });
      enqueueSnackbar('Report generated successfully', { variant: 'success' });
      fetchReports();
    } catch (error) {
      enqueueSnackbar('Failed to generate report', { variant: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Box>
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <PageHeader
        title="Reports"
        subtitle="Manage and export your testing reports and data"
        actions={
          <Box sx={{ display: 'flex', gap: 1 }}>
            {selectedIds.length > 0 && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<BulkDeleteIcon />}
                onClick={handleBulkDeleteClick}
              >
                Delete Selected ({selectedIds.length})
              </Button>
            )}
            <Button variant="contained" onClick={handleGenerateReport} disabled={isGenerating}>
              {isGenerating ? 'Generating...' : 'Generate New Report'}
            </Button>
          </Box>
        }
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Report Statistics</Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">Storage Used</Typography>
                <Typography variant="h5">{estimatedStorageMB} MB / 100 MB</Typography>
                <LinearProgress variant="determinate" value={storagePercent} sx={{ mt: 1, height: 8, borderRadius: 4 }} />
              </Box>
              <Grid container spacing={2} sx={{ mt: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Total Reports</Typography>
                  <Typography variant="h6">{reports.length}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Recent (24h)</Typography>
                  <Typography variant="h6">{recent24hCount}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedIds.length > 0 && selectedIds.length < reports.length}
                      checked={reports.length > 0 && selectedIds.length === reports.length}
                      onChange={toggleSelectAll}
                    />
                  </TableCell>
                  <TableCell>Report Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Tests</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reports.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <ReportIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No reports found
                      </Typography>
                      <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
                        Generate your first report to get started
                      </Typography>
                      <Button
                        variant="contained"
                        onClick={handleGenerateReport}
                        disabled={isGenerating}
                      >
                        {isGenerating ? 'Generating...' : 'Generate Report'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((report) => (
                    <TableRow key={report.id} hover selected={selectedIds.includes(report.id)}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedIds.includes(report.id)}
                          onChange={() => toggleSelect(report.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ReportIcon color="action" />
                          <Box>
                            <Typography variant="body2" fontWeight={600}>{report.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{report.user?.name || 'System'}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={report.type.replace('_', ' ')} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {report.summary?.passed ?? 0}/{report.summary?.totalTests ?? 0}
                          </Typography>
                          {report.summary?.totalTests ? (
                            <Chip
                              label={`${Math.round((report.summary?.passed ?? 0) / report.summary.totalTests * 100)}%`}
                              size="small"
                              color={((report.summary?.passed ?? 0) / report.summary.totalTests) >= 0.9 ? 'success' : ((report.summary?.passed ?? 0) / report.summary.totalTests) >= 0.5 ? 'warning' : 'error'}
                              variant="outlined"
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          ) : null}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={report.summary?.status || 'N/A'}
                          size="small"
                          color={report.summary?.status === 'PASSED' ? 'success' : report.summary?.status === 'FAILED' ? 'error' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{new Date(report.createdAt).toLocaleString()}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleView(report)} title="View"><ViewIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="primary" disabled title="Download (unavailable)"><DownloadIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="secondary" onClick={() => handleShare(report)} title="Share"><ShareIcon fontSize="small" /></IconButton>
                        <Tooltip title="Delete report">
                          <IconButton size="small" color="error" onClick={() => handleDeleteClick(report.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>

      {/* View Report Dialog */}
      <Dialog open={Boolean(viewReport)} onClose={() => setViewReport(null)} fullWidth maxWidth="md">
        <DialogTitle>
          {viewReport?.name}
          <IconButton onClick={() => setViewReport(null)} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ py: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Report ID</Typography>
                <Typography variant="body1" fontWeight={600}>{viewReport?.id}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Type</Typography>
                <Typography variant="body1">{viewReport?.type?.replace('_', ' ')}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Generated By</Typography>
                <Typography variant="body1">{viewReport?.user?.name || 'System'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Project</Typography>
                <Typography variant="body1">{viewReport?.project?.name || '—'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">Generated At</Typography>
                <Typography variant="body1">{new Date(viewReport?.createdAt || '').toLocaleString()}</Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle2" gutterBottom>Execution Summary</Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              The report status is <strong>{viewReport?.summary?.status || 'N/A'}</strong>.
            </Typography>

            <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider', mb: 3 }}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                TEST RESULTS SUMMARY
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={3}>
                  <Typography variant="body2">Total: <strong>{viewReport?.summary?.totalTests ?? 0}</strong></Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="body2" color="success.main">
                    <strong>{viewReport?.summary?.passed ?? 0}</strong> Passed
                  </Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="body2" color="error.main">
                    <strong>{viewReport?.summary?.failed ?? 0}</strong> Failed
                  </Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="body2">Pass Rate: <strong>
                    {viewReport?.summary?.totalTests
                      ? `${Math.round((viewReport.summary.passed ?? 0) / viewReport.summary.totalTests * 100)}%`
                      : 'N/A'}
                  </strong></Typography>
                </Grid>
              </Grid>
            </Box>

            <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>Test Case Details</Typography>
            {viewReport?.data?.testResults && viewReport.data.testResults.length > 0 ? (
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Test Case ID</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>File / Test Name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Duration</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Error</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {viewReport.data.testResults.map((tr, idx) => (
                      <TableRow
                        key={tr.id}
                        sx={{
                          bgcolor: tr.status === 'FAILED' ? 'error.50' : tr.status === 'PASSED' ? 'success.50' : undefined,
                        }}
                      >
                        <TableCell>
                          <Typography variant="caption">{idx + 1}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                            {tr.testId}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>{tr.testName}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={tr.status}
                            size="small"
                            color={tr.status === 'PASSED' ? 'success' : tr.status === 'FAILED' ? 'error' : 'default'}
                            variant={tr.status === 'PASSED' ? 'filled' : 'outlined'}
                            sx={{ fontWeight: 600, minWidth: 80 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{tr.duration ? `${tr.duration}ms` : '-'}</Typography>
                        </TableCell>
                        <TableCell>
                          {tr.error ? (
                            <Tooltip title={tr.error}>
                              <Typography variant="caption" color="error" sx={{
                                maxWidth: 200,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'block',
                              }}>
                                {tr.error}
                              </Typography>
                            </Tooltip>
                          ) : (
                            <Typography variant="caption" color="text.disabled">—</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant="body2" color="text.disabled">No individual test results available</Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="outlined" startIcon={<LinkIcon />} onClick={() => { if (viewReport) handleShare(viewReport); }}>
            Copy Link
          </Button>
          <Button onClick={() => setViewReport(null)}>Close</Button>
          <Button variant="contained" startIcon={<DownloadIcon />} disabled>
            Download Report
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog open={confirmDelete.open} onClose={() => setConfirmDelete({ open: false, ids: [] })}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            {confirmDelete.ids.length === 1
              ? 'Are you sure you want to delete this report? This action cannot be undone.'
              : `Are you sure you want to delete ${confirmDelete.ids.length} reports? This action cannot be undone.`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete({ open: false, ids: [] })}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleConfirmDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
