'use client';

import { useState } from 'react';
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
  Chip,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material';
import {
  Search,
  CheckCircle,
  Cancel,
  Lock,
  BugReport,
} from '@mui/icons-material';
import { useVulnerabilities, useUpdateVulnerability } from '@/lib/security/hooks';
import PageHeader from '@/components/common/PageHeader';
import Loading from '@/components/feedback/Loading';

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#dc2626',
  HIGH: '#ea580c',
  MEDIUM: '#ca8a04',
  LOW: '#65a30d',
  INFO: '#3b82f6',
};


const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Open' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'FALSE_POSITIVE', label: 'False Positive' },
  { value: 'ACCEPTED', label: 'Accepted Risk' },
  { value: 'REMEDIATED', label: 'Remediated' },
  { value: 'REOPENED', label: 'Reopened' },
];

const SEVERITY_OPTIONS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

export default function VulnerabilitiesPage() {
  const [page, setPage] = useState(1);
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedVuln, setSelectedVuln] = useState<string | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [reason, setReason] = useState('');

  const { data, isLoading } = useVulnerabilities({
    offset: (page - 1) * 50,
    limit: 50,
    severity: severityFilter || undefined,
    status: statusFilter || undefined,
  });

  const updateVulnerability = useUpdateVulnerability();

  if (isLoading) return <Loading />;

  const vulnerabilities = data?.vulnerabilities || [];
  const total = data?.total || 0;

  const handleOpenUpdateDialog = (vulnId: string, currentStatus: string) => {
    setSelectedVuln(vulnId);
    setNewStatus(currentStatus);
    setReason('');
    setUpdateDialogOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (selectedVuln) {
      await updateVulnerability.mutateAsync({
        id: selectedVuln,
        data: { status: newStatus, reason: reason || undefined },
      });
      setUpdateDialogOpen(false);
      setSelectedVuln(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'REMEDIATED':
        return <CheckCircle sx={{ color: '#10b981' }} />;
      case 'FALSE_POSITIVE':
        return <Cancel sx={{ color: '#6b7280' }} />;
      case 'ACCEPTED':
        return <Lock sx={{ color: '#f59e0b' }} />;
      default:
        return <BugReport sx={{ color: '#3b82f6' }} />;
    }
  };

  return (
    <Box>
      <PageHeader
        title="Vulnerabilities"
        subtitle="Track and manage security vulnerabilities"
      />

      <Card>
        <Box p={2} display="flex" gap={2} flexWrap="wrap">
          <TextField
            size="small"
            placeholder="Search vulnerabilities..."
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
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Severity</InputLabel>
            <Select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              label="Severity"
            >
              <MenuItem value="">All</MenuItem>
              {SEVERITY_OPTIONS.map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status"
            >
              <MenuItem value="">All</MenuItem>
              {STATUS_OPTIONS.map((s) => (
                <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>CWE/CVE</TableCell>
                <TableCell>OWASP</TableCell>
                <TableCell>Affected URL</TableCell>
                <TableCell>Scan</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vulnerabilities.map((vuln) => (
                <TableRow
                  key={vuln.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => handleOpenUpdateDialog(vuln.id, vuln.status)}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {vuln.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 300 }}>
                      {vuln.description.substring(0, 100)}...
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={vuln.severity}
                      size="small"
                      sx={{
                        bgcolor: SEVERITY_COLORS[vuln.severity],
                        color: 'white',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      {getStatusIcon(vuln.status)}
                      <Typography variant="body2">{vuln.status}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {vuln.cweId || (vuln.cveId ? vuln.cveId : '-')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {vuln.owaspCategory?.replace('A0', '').replace('_', ' ') || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {vuln.affectedUrl || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {vuln.scan?.name || '-'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box p={2} display="flex" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">
            Showing {vulnerabilities.length} of {total} vulnerabilities
          </Typography>
          <Pagination
            count={Math.ceil(total / 50)}
            page={page}
            onChange={(_, p) => setPage(p)}
          />
        </Box>
      </Card>

      <Dialog open={updateDialogOpen} onClose={() => setUpdateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Vulnerability Status</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} mt={1}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>New Status</InputLabel>
                <Select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  label="New Status"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {['FALSE_POSITIVE', 'ACCEPTED'].includes(newStatus) && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    newStatus === 'FALSE_POSITIVE'
                      ? 'Explain why this is a false positive...'
                      : 'Document the accepted risk...'
                  }
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpdateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleUpdateStatus}
            disabled={updateVulnerability.isPending}
          >
            {updateVulnerability.isPending ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}