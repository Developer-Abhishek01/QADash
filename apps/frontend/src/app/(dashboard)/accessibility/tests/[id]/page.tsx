'use client';

import {
  ArrowBack,
  PlayArrow,
  Stop,
  Download,
  BugReport,
  CheckCircle,
  Schedule,
} from '@mui/icons-material';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { useParams, useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';

import { AccessibilityStatusChip, ImpactChip, WcagLevelChip, MetricCard } from '@/components/accessibility';
import { useA11ySocket } from '@/components/accessibility/useA11ySocket';
import PageHeader from '@/components/common/PageHeader';
import Loading from '@/components/feedback/Loading';
import { useAccessibilityTest, useRunAccessibilityTest, useCancelAccessibilityTest, useAccessibilityIssues, useGenerateAccessibilityReport } from '@/lib/accessibility/hooks';
import type { AccessibilityIssue } from '@/lib/accessibility/types';

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#dc2626',
  SERIOUS: '#ea580c',
  MODERATE: '#ca8a04',
  MINOR: '#65a30d',
};

export default function TestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const testId = params.id as string;

  const { data: test, isLoading, refetch } = useAccessibilityTest(testId);
  const { data: issues } = useAccessibilityIssues({ testId });

  const runTest = useRunAccessibilityTest();
  const cancelTest = useCancelAccessibilityTest();
  const generateReport = useGenerateAccessibilityReport();

  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportFormat, setReportFormat] = useState('html');
  const [liveProgress, setLiveProgress] = useState<{ scannedPages: number; totalPages: number; issuesFound: number } | null>(null);

  const onProgress = useCallback((data: unknown) => {
    const d = data as { scannedPages: number; totalPages: number; issuesFound: number };
    setLiveProgress({ scannedPages: d.scannedPages, totalPages: d.totalPages, issuesFound: d.issuesFound });
  }, []);

  const onCompleted = useCallback(() => {
    refetch();
    setLiveProgress(null);
  }, [refetch]);

  useA11ySocket(test?.projectId, testId, { onProgress, onCompleted });

  if (isLoading) return <Loading />;
  if (!test) return <Typography>Test not found</Typography>;

  const isRunning = test.status === 'RUNNING' || test.status === 'QUEUED';
  const issueList = issues || [];

  const issueData = [
    { name: 'Critical', value: test.criticalCount, color: SEVERITY_COLORS.CRITICAL },
    { name: 'Serious', value: test.seriousCount, color: SEVERITY_COLORS.SERIOUS },
    { name: 'Moderate', value: test.moderateCount, color: SEVERITY_COLORS.MODERATE },
    { name: 'Minor', value: test.minorCount, color: SEVERITY_COLORS.MINOR },
  ].filter((d) => d.value > 0);

  const displayProgress = liveProgress || { scannedPages: test.scannedPages, totalPages: test.totalPages, issuesFound: 0 };

  const handleGenerateReport = async () => {
    try {
      const result = await generateReport.mutateAsync({ testId, format: reportFormat });
      if (result.downloadUrl) {
        window.open(result.downloadUrl, '_blank');
      }
      setReportDialogOpen(false);
    } catch (e) {
      console.error('Report generation failed', e);
    }
  };

  return (
    <Box>
      <PageHeader
        title={test.name}
        subtitle={`WCAG ${test.wcagLevel} - ${test.project?.name || 'N/A'}`}
        actions={
          <Button startIcon={<ArrowBack />} onClick={() => router.push('/accessibility/tests')}>
            Back to Tests
          </Button>
        }
      />

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={2}>
                  <AccessibilityStatusChip status={test.status} size="medium" />
                </Grid>
                <Grid item xs={6} md={2}>
                  <Typography variant="caption" color="text.secondary">WCAG Level</Typography>
                  <WcagLevelChip level={test.wcagLevel} />
                </Grid>
                <Grid item xs={6} md={2}>
                  <Typography variant="caption" color="text.secondary">Score</Typography>
                  <Typography variant="h6" fontWeight="bold" color={test.score >= 90 ? '#10b981' : test.score >= 70 ? '#f59e0b' : '#dc2626'}>
                    {test.score.toFixed(1)}%
                  </Typography>
                </Grid>
                <Grid item xs={6} md={2}>
                  <Typography variant="caption" color="text.secondary">Duration</Typography>
                  <Typography variant="body2">{test.duration ? `${(test.duration / 1000).toFixed(1)}s` : '-'}</Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box display="flex" gap={1} justifyContent="flex-end">
                    {['PENDING', 'QUEUED'].includes(test.status) && (
                      <Button size="small" variant="contained" startIcon={<PlayArrow />} onClick={() => runTest.mutate(testId)}>
                        Run
                      </Button>
                    )}
                    {isRunning && (
                      <Button size="small" color="error" variant="outlined" startIcon={<Stop />} onClick={() => cancelTest.mutate(testId)}>
                        Cancel
                      </Button>
                    )}
                    {test.status === 'COMPLETED' && (
                      <Button size="small" variant="outlined" startIcon={<Download />} onClick={() => setReportDialogOpen(true)}>
                        Report
                      </Button>
                    )}
                  </Box>
                </Grid>
              </Grid>

              {isRunning && (
                <Box mt={2}>
                  <Box display="flex" alignItems="center" gap={2} mb={1}>
                    <Box sx={{ flex: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={test.totalPages > 0 ? (displayProgress.scannedPages / displayProgress.totalPages * 100) : 0}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                    <Typography variant="body2" fontWeight={500}>
                      {Math.round(test.totalPages > 0 ? (displayProgress.scannedPages / displayProgress.totalPages * 100) : 0)}%
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {displayProgress.scannedPages} / {displayProgress.totalPages} pages scanned
                    {displayProgress.issuesFound > 0 && ` · ${displayProgress.issuesFound} issues found`}
                  </Typography>
                </Box>
              )}

              {test.status === 'FAILED' && test.errorMessage && (
                <Alert severity="error" sx={{ mt: 2 }}>{test.errorMessage}</Alert>
              )}

              {test.description && (
                <Typography variant="body2" color="text.secondary" mt={2}>{test.description}</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} md={3}>
          <MetricCard
            icon={<BugReport sx={{ fontSize: 36 }} />}
            value={test.totalIssues}
            label="Total Issues"
            subtitle={`${test.passCount} passed`}
            color={test.totalIssues > 0 ? '#dc2626' : '#10b981'}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <MetricCard
            icon={<CheckCircle sx={{ fontSize: 36 }} />}
            value={`${test.score.toFixed(1)}%`}
            label="Accessibility Score"
            color={test.score >= 90 ? '#10b981' : test.score >= 70 ? '#f59e0b' : '#dc2626'}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <MetricCard
            icon={<Schedule sx={{ fontSize: 36 }} />}
            value={test.scannedPages}
            label="Pages Scanned"
            subtitle={test.totalPages > 0 ? `of ${test.totalPages} total` : undefined}
            color="#3b82f6"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <Box textAlign="center" p={2}>
            <Box display="flex" justifyContent="center" gap={1} flexWrap="wrap">
              {test.criticalCount > 0 && <Chip label={`${test.criticalCount} Critical`} size="small" sx={{ bgcolor: '#dc2626', color: 'white' }} />}
              {test.seriousCount > 0 && <Chip label={`${test.seriousCount} Serious`} size="small" sx={{ bgcolor: '#ea580c', color: 'white' }} />}
              {test.moderateCount > 0 && <Chip label={`${test.moderateCount} Moderate`} size="small" sx={{ bgcolor: '#ca8a04', color: 'white' }} />}
            </Box>
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Issues by Impact</Typography>
              {issueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={issueData}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {issueData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box display="flex" alignItems="center" justifyContent="center" height={250}>
                  <Typography color="text.secondary">No issues found</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>URLs Scanned</Typography>
              <Box>
                {test.urls.map((url: string) => (
                  <Box key={url} sx={{ p: 1.5, borderBottom: '1px solid #e5e7eb' }}>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{url}</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Issues ({issueList.length})
              </Typography>
              {issueList.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Rule</TableCell>
                        <TableCell>Impact</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>WCAG</TableCell>
                        <TableCell>Page</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {issueList.map((issue: AccessibilityIssue) => (
                        <TableRow key={issue.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>{issue.ruleId}</Typography>
                            <Typography variant="caption" color="text.secondary">{issue.description?.substring(0, 80)}</Typography>
                          </TableCell>
                          <TableCell><ImpactChip impact={issue.impact} /></TableCell>
                          <TableCell><Typography variant="body2">{issue.category}</Typography></TableCell>
                          <TableCell>
                            <Box display="flex" gap={0.5} flexWrap="wrap">
                              {(issue.wcagCriteria || []).map((c: string) => (
                                <Chip key={c} label={c} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                              ))}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>{issue.pageUrl}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={issue.isResolved ? 'Resolved' : 'Open'}
                              size="small"
                              color={issue.isResolved ? 'success' : 'warning'}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="text.secondary" textAlign="center" py={4}>
                  {isRunning ? 'Scan in progress - issues will appear here...' : 'No issues found - great accessibility!'}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={reportDialogOpen} onClose={() => setReportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Generate Report</DialogTitle>
        <DialogContent>
          <Box mt={1}>
            <FormControl fullWidth>
              <InputLabel>Format</InputLabel>
              <Select value={reportFormat} onChange={(e) => setReportFormat(e.target.value)} label="Format">
                <MenuItem value="html">HTML</MenuItem>
                <MenuItem value="json">JSON</MenuItem>
                <MenuItem value="pdf">PDF</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleGenerateReport}
            disabled={generateReport.isPending}
          >
            {generateReport.isPending ? 'Generating...' : 'Generate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
