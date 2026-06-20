'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Description as ReportIcon,
  Link as LinkIcon,
  GetApp as DownloadIcon,
} from '@mui/icons-material';
import { reportsApi } from '@/lib/api/client';
import { copyToClipboard } from '@/lib/utils';
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

export default function SharedReportPage() {
  const params = useParams();
  const reportId = params.id as string;
  const { enqueueSnackbar } = useSnackbar();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) return;
    setLoading(true);
    setError(null);
    reportsApi.get(reportId)
      .then((data) => {
        setReport(data);
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.message || err?.message || 'Report not found';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [reportId]);

  const handleCopyLink = async () => {
    const shareUrl = window.location.href;
    try {
      await copyToClipboard(shareUrl);
      enqueueSnackbar('Link copied to clipboard!', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to copy link', { variant: 'error' });
    }
  };

  const handleDownload = () => {
    if (!report) return;
    const content = JSON.stringify({
      id: report.id,
      name: report.name,
      type: report.type,
      summary: report.summary,
      createdAt: report.createdAt,
      project: report.project,
      user: report.user,
      testResults: report.data?.testResults,
    }, null, 2);
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.name.replace(/\s+/g, '_')}_${report.id.substring(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    enqueueSnackbar('Report downloaded!', { variant: 'success' });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#f8fafc' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !report) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#f8fafc' }}>
        <Card sx={{ maxWidth: 480, borderRadius: 3, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <CardContent sx={{ textAlign: 'center', py: 6, px: 4 }}>
            <ReportIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>Report Not Found</Typography>
            <Typography variant="body2" color="text.secondary">
              {error || 'This report does not exist or has been deleted.'}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', py: 4, px: 2 }}>
      <Box sx={{ maxWidth: 800, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: 1.5, bgcolor: alpha('#6366f1', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ReportIcon sx={{ color: '#6366f1', fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{report.name}</Typography>
              <Typography variant="caption" color="text.secondary">Shared Report &middot; {report.type.replace('_', ' ')}</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<LinkIcon />} onClick={handleCopyLink} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
              Copy Link
            </Button>
            <Button variant="contained" size="small" startIcon={<DownloadIcon />} onClick={handleDownload} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
              Download
            </Button>
          </Box>
        </Box>

        {/* Report Details */}
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={2.5}>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, letterSpacing: 0.5 }}>Report ID</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace', mt: 0.3 }}>{report.id}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, letterSpacing: 0.5 }}>Type</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.3, textTransform: 'capitalize' }}>{report.type.replace('_', ' ')}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, letterSpacing: 0.5 }}>Generated By</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.3 }}>{report.user?.name || 'System'}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, letterSpacing: 0.5 }}>Project</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.3 }}>{report.project?.name || '—'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, letterSpacing: 0.5 }}>Generated At</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.3 }}>{new Date(report.createdAt).toLocaleString()}</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Execution Summary */}
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Execution Summary</Typography>
            <Box sx={{ bgcolor: alpha('#6366f1', 0.03), p: 2.5, borderRadius: 2, border: '1px solid', borderColor: alpha('#6366f1', 0.1) }}>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">Total Tests</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{report.summary?.totalTests ?? 0}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">Passed</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#10b981' }}>{report.summary?.passed ?? 0}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">Failed</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#ef4444' }}>{report.summary?.failed ?? 0}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">Pass Rate</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {report.summary?.totalTests
                      ? `${Math.round(((report.summary.passed ?? 0) / report.summary.totalTests) * 100)}%`
                      : 'N/A'}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>

        {/* Test Results */}
        {report.data?.testResults && report.data.testResults.length > 0 && (
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Test Case Details</Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem', letterSpacing: 0.5 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem', letterSpacing: 0.5 }}>Test Name</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem', letterSpacing: 0.5 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem', letterSpacing: 0.5 }}>Duration</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {report.data.testResults.map((tr, idx) => (
                      <TableRow
                        key={tr.id}
                        sx={{
                          bgcolor: tr.status === 'FAILED' ? alpha('#ef4444', 0.04) : tr.status === 'PASSED' ? alpha('#10b981', 0.04) : undefined,
                        }}
                      >
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{tr.testName}</Typography>
                          <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace' }}>{tr.testId}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={tr.status}
                            size="small"
                            color={tr.status === 'PASSED' ? 'success' : tr.status === 'FAILED' ? 'error' : 'default'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {tr.duration ? `${Math.floor(tr.duration / 1000)}s` : '-'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="caption" color="text.disabled">
            Powered by QA Dashboard
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
