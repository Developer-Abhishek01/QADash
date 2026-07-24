'use client';

import {
  Add,
  MoreVert,
  PlayArrow,
  Stop,
  Visibility,
  Delete,
  Search,
} from '@mui/icons-material';
import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Pagination,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  LinearProgress,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import PageHeader from '@/components/common/PageHeader';
import Loading from '@/components/feedback/Loading';
import { SecurityStatusChip, ScanTypeChip, FindingBadge } from '@/components/security';
import { useSecurityScans, useStartSecurityScan, useCancelSecurityScan } from '@/lib/security/hooks';

export default function SecurityScansPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedScan, setSelectedScan] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const { data, isLoading } = useSecurityScans({
    offset: (page - 1) * 20,
    limit: 20,
    status: statusFilter || undefined,
  });

  const startScan = useStartSecurityScan();
  const cancelScan = useCancelSecurityScan();

  if (isLoading) return <Loading />;

  const scans = data?.scans || [];
  const total = data?.total || 0;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, scanId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedScan(scanId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedScan(null);
  };

  const handleStartScan = async () => {
    if (selectedScan) {
      await startScan.mutateAsync(selectedScan);
      handleMenuClose();
    }
  };

  const handleCancelScan = async () => {
    if (selectedScan) {
      await cancelScan.mutateAsync(selectedScan);
      setCancelDialogOpen(false);
      handleMenuClose();
    }
  };

  return (
    <Box>
      <PageHeader
        title="Security Scans"
        subtitle="Manage and monitor security scan executions"
        actions={
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => router.push('/security/scans/new')}
          >
            New Scan
          </Button>
        }
      />

      <Card>
        <Box p={2} display="flex" gap={2}>
          <TextField
            size="small"
            placeholder="Search scans..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ width: 300 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="PENDING">Pending</MenuItem>
              <MenuItem value="RUNNING">Running</MenuItem>
              <MenuItem value="COMPLETED">Completed</MenuItem>
              <MenuItem value="FAILED">Failed</MenuItem>
              <MenuItem value="CANCELLED">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Findings</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {scans.map((scan) => (
                <TableRow key={scan.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {scan.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {scan.project?.name} - {scan.environment?.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <ScanTypeChip type={scan.scanType} />
                  </TableCell>
                  <TableCell>
                    <SecurityStatusChip status={scan.status} />
                  </TableCell>
                  <TableCell>
                    {scan.status === 'RUNNING' || scan.status === 'QUEUED' ? (
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box sx={{ width: 100 }}>
                          <LinearProgress
                            variant="determinate"
                            value={scan.progress}
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                        </Box>
                        <Typography variant="caption">{scan.progress}%</Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2">-</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <FindingBadge
                      critical={scan.criticalCount}
                      high={scan.highCount}
                      medium={scan.mediumCount}
                      low={scan.lowCount}
                    />
                  </TableCell>
                  <TableCell>
                    {scan.duration ? `${(scan.duration / 1000).toFixed(1)}s` : '-'}
                  </TableCell>
                  <TableCell>
                    {new Date(scan.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="right">
                    {['PENDING', 'QUEUED'].includes(scan.status) && (
                      <IconButton size="small" onClick={() => startScan.mutate(scan.id)}>
                        <PlayArrow />
                      </IconButton>
                    )}
                    {scan.status === 'RUNNING' && (
                      <IconButton size="small" onClick={() => {
                        setSelectedScan(scan.id);
                        setCancelDialogOpen(true);
                      }}>
                        <Stop />
                      </IconButton>
                    )}
                    <IconButton size="small" onClick={(e) => handleMenuOpen(e, scan.id)}>
                      <MoreVert />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box p={2} display="flex" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">
            Showing {scans.length} of {total} scans
          </Typography>
          <Pagination
            count={Math.ceil(total / 20)}
            page={page}
            onChange={(_, p) => setPage(p)}
          />
        </Box>
      </Card>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={() => router.push(`/security/scans/${selectedScan}`)}>
          <Visibility sx={{ mr: 1 }} /> View Details
        </MenuItem>
        {['PENDING', 'QUEUED'].includes(scans.find((s) => s.id === selectedScan)?.status || '') && (
          <MenuItem onClick={handleStartScan}>
            <PlayArrow sx={{ mr: 1 }} /> Start Scan
          </MenuItem>
        )}
        {scans.find((s) => s.id === selectedScan)?.status === 'RUNNING' && (
          <MenuItem onClick={handleCancelScan}>
            <Stop sx={{ mr: 1 }} /> Cancel
          </MenuItem>
        )}
        <MenuItem sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
        <DialogTitle>Cancel Scan</DialogTitle>
        <DialogContent>
          Are you sure you want to cancel this scan? This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>No, Keep Running</Button>
          <Button onClick={handleCancelScan} color="error" variant="contained">
            Yes, Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}