'use client';

import {
  ArrowBack,
  PlayArrow,
  Stop,
  Download,
  Assessment,
  BugReport,
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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { useParams, useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';

import PageHeader from '@/components/common/PageHeader';
import Loading from '@/components/feedback/Loading';
import { SecurityStatusChip, SeverityChip, ScanTypeChip, FindingBadge, VulnDetailDialog } from '@/components/security';
import { useScanSocket } from '@/components/security/useScanSocket';
import { useSecurityScan, useStartSecurityScan, useCancelSecurityScan, useVulnerabilities, useUpdateVulnerability, useGenerateReport } from '@/lib/security/hooks';

const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Open' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'FALSE_POSITIVE', label: 'False Positive' },
  { value: 'ACCEPTED', label: 'Accepted Risk' },
  { value: 'REMEDIATED', label: 'Remediated' },
  { value: 'REOPENED', label: 'Reopened' },
];

export default function ScanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const scanId = params.id as string;

  const { data: scan, isLoading, refetch } = useSecurityScan(scanId);
  const { data: vulnsData } = useVulnerabilities({ scanId, limit: 200 });
  const startScan = useStartSecurityScan();
  const cancelScan = useCancelSecurityScan();
  const updateVuln = useUpdateVulnerability();
  const generateReport = useGenerateReport();

  const [selectedVuln, setSelectedVuln] = useState<any>(null);
  const [vulnDetailOpen, setVulnDetailOpen] = useState(false);
  const [statusUpdateId, setStatusUpdateId] = useState<string | null>(null);
  const [statusUpdateOpen, setStatusUpdateOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [reason, setReason] = useState('');
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportFormat, setReportFormat] = useState('html');
  const [reportType, setReportType] = useState('executive');

  const [liveProgress, setLiveProgress] = useState<number | null>(null);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const [liveFindings, setLiveFindings] = useState(0);

  const onProgress = useCallback((data: any) => {
    if (data.status) setLiveStatus(data.status);
    if (data.progress !== undefined) setLiveProgress(data.progress);
    if (data.findings !== undefined) setLiveFindings(data.findings);
    if (data.status === 'COMPLETED' || data.status === 'FAILED') {
      refetch();
    }
  }, [refetch]);

  useScanSocket(scan?.projectId, scanId, {
    onProgress,
    onVulnerabilityFound: () => { setLiveFindings((p) => p + 1); },
  });

  if (isLoading) return <Loading />;
  if (!scan) return <Typography>Scan not found</Typography>;

  const displayProgress = liveProgress ?? scan.progress;
  const displayStatus = liveStatus ?? scan.status;
  const isRunning = displayStatus === 'RUNNING' || displayStatus === 'QUEUED';
  const vulnerabilities = vulnsData?.vulnerabilities || [];

  const handleStatusUpdate = async () => {
    if (statusUpdateId) {
      await updateVuln.mutateAsync({ id: statusUpdateId, data: { status: newStatus, reason: reason || undefined } });
      setStatusUpdateOpen(false);
      setStatusUpdateId(null);
    }
  };

  const handleGenerateReport = async () => {
    try {
      const result = await generateReport.mutateAsync({ scanId, format: reportFormat, type: reportType });
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
        title={scan.name}
        subtitle={`Scan Details - ${scan.scanType} scan`}
        actions={
          <Button startIcon={<ArrowBack />} onClick={() => router.push('/security/scans')}>
            Back to Scans
          </Button>
        }
      />

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={2}>
                  <SecurityStatusChip status={displayStatus} size="medium" />
                </Grid>
                <Grid item xs={6} md={2}>
                  <Typography variant="caption" color="text.secondary">Type</Typography>
                  <ScanTypeChip type={scan.scanType} />
                </Grid>
                <Grid item xs={6} md={2}>
                  <Typography variant="caption" color="text.secondary">Project</Typography>
                  <Typography variant="body2">{scan.project?.name || '-'}</Typography>
                </Grid>
                <Grid item xs={6} md={2}>
                  <Typography variant="caption" color="text.secondary">Environment</Typography>
                  <Typography variant="body2">{scan.environment?.name || '-'}</Typography>
                </Grid>
                <Grid item xs={6} md={2}>
                  <Typography variant="caption" color="text.secondary">Duration</Typography>
                  <Typography variant="body2">{scan.duration ? `${(scan.duration / 1000).toFixed(1)}s` : '-'}</Typography>
                </Grid>
                <Grid item xs={12} md={2}>
                  <Box display="flex" gap={1}>
                    {['PENDING', 'QUEUED'].includes(displayStatus) && (
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<PlayArrow />}
                        onClick={() => startScan.mutate(scanId)}
                      >
                        Start
                      </Button>
                    )}
                    {isRunning && (
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        startIcon={<Stop />}
                        onClick={() => cancelScan.mutate(scanId)}
                      >
                        Cancel
                      </Button>
                    )}
                    {displayStatus === 'COMPLETED' && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Assessment />}
                        onClick={() => setReportDialogOpen(true)}
                      >
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
                        value={displayProgress}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                    <Typography variant="body2" fontWeight={500}>{displayProgress}%</Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {scan.scannedTargets} / {scan.totalTargets} targets scanned
                    {liveFindings > 0 && ` · ${liveFindings} findings so far`}
                  </Typography>
                </Box>
              )}

              {displayStatus === 'FAILED' && scan.errorMessage && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {scan.errorMessage}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: '#fef2f2' }}>
            <CardContent>
              <Box textAlign="center">
                <BugReport sx={{ fontSize: 36, color: '#dc2626' }} />
                <Typography variant="h4" fontWeight="bold" color="#dc2626">
                  {scan.criticalCount + liveFindings}
                </Typography>
                <Typography variant="body2" color="text.secondary">Total Findings</Typography>
                <Box mt={1}>
                  <FindingBadge
                    critical={scan.criticalCount}
                    high={scan.highCount}
                    medium={scan.mediumCount}
                    low={scan.lowCount}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {scan.startedAt && (
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box textAlign="center">
                  <Schedule sx={{ fontSize: 36, color: '#3b82f6' }} />
                  <Typography variant="h6" fontWeight="bold">{scan.startedAt ? new Date(scan.startedAt).toLocaleDateString() : '-'}</Typography>
                  <Typography variant="body2" color="text.secondary">Started</Typography>
                  <Typography variant="caption">{scan.startedAt ? new Date(scan.startedAt).toLocaleTimeString() : ''}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {scan.completedAt && (
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box textAlign="center">
                  <Schedule sx={{ fontSize: 36, color: '#10b981' }} />
                  <Typography variant="h6" fontWeight="bold">{new Date(scan.completedAt).toLocaleDateString()}</Typography>
                  <Typography variant="body2" color="text.secondary">Completed</Typography>
                  <Typography variant="caption">{new Date(scan.completedAt).toLocaleTimeString()}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Vulnerabilities ({vulnerabilities.length})
              </Typography>
              {vulnerabilities.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Title</TableCell>
                        <TableCell>Severity</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>CWE/CVE</TableCell>
                        <TableCell>OWASP</TableCell>
                        <TableCell>Affected URL</TableCell>
                        <TableCell align="right">Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {vulnerabilities.map((vuln: any) => (
                        <TableRow key={vuln.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>{vuln.title}</Typography>
                          </TableCell>
                          <TableCell>
                            <SeverityChip severity={vuln.severity} />
                          </TableCell>
                          <TableCell>
                            <Chip label={vuln.status} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{vuln.cweId || vuln.cveId || '-'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{vuln.owaspCategory?.replace(/_/g, ' ') || '-'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>{vuln.affectedUrl || '-'}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Box display="flex" gap={0.5} justifyContent="flex-end">
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => { setSelectedVuln(vuln); setVulnDetailOpen(true); }}
                              >
                                View
                              </Button>
                              <Button
                                size="small"
                                onClick={() => {
                                  setStatusUpdateId(vuln.id);
                                  setNewStatus(vuln.status);
                                  setReason('');
                                  setStatusUpdateOpen(true);
                                }}
                              >
                                Update
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="text.secondary" textAlign="center" py={4}>
                  {isRunning ? 'Scan in progress - vulnerabilities will appear here...' : 'No vulnerabilities found'}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <VulnDetailDialog
        vulnerability={selectedVuln}
        open={vulnDetailOpen}
        onClose={() => { setVulnDetailOpen(false); setSelectedVuln(null); }}
      />

      <Dialog open={statusUpdateOpen} onClose={() => setStatusUpdateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Vulnerability Status</DialogTitle>
        <DialogContent>
          <Box mt={1}>
            <FormControl fullWidth>
              <InputLabel>New Status</InputLabel>
              <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} label="New Status">
                {STATUS_OPTIONS.map((s) => (
                  <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {['FALSE_POSITIVE', 'ACCEPTED'].includes(newStatus) && (
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                sx={{ mt: 2 }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusUpdateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleStatusUpdate}>Update</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={reportDialogOpen} onClose={() => setReportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Generate Report</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} mt={1}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Format</InputLabel>
                <Select value={reportFormat} onChange={(e) => setReportFormat(e.target.value)} label="Format">
                  <MenuItem value="html">HTML</MenuItem>
                  <MenuItem value="json">JSON</MenuItem>
                  <MenuItem value="pdf">PDF</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Report Type</InputLabel>
                <Select value={reportType} onChange={(e) => setReportType(e.target.value)} label="Report Type">
                  <MenuItem value="executive">Executive</MenuItem>
                  <MenuItem value="developer">Developer</MenuItem>
                  <MenuItem value="compliance">Compliance</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
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
