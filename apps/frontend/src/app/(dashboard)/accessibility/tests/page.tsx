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
  IconButton,
  Chip,
  Menu,
  MenuItem,
  Pagination,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  Add,
  MoreVert,
  PlayArrow,
  Stop,
  Visibility,
  Delete,
  Search,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useAccessibilityTests, useRunAccessibilityTest, useCancelAccessibilityTest } from '@/lib/accessibility/hooks';
import PageHeader from '@/components/common/PageHeader';
import Loading from '@/components/feedback/Loading';

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#6b7280',
  QUEUED: '#3b82f6',
  RUNNING: '#8b5cf6',
  COMPLETED: '#10b981',
  FAILED: '#dc2626',
  CANCELLED: '#6b7280',
};

export default function AccessibilityTestsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);

  const { data, isLoading } = useAccessibilityTests({
    offset: (page - 1) * 20,
    limit: 20,
    status: statusFilter || undefined,
  });

  const runTest = useRunAccessibilityTest();
  const cancelTest = useCancelAccessibilityTest();

  if (isLoading) return <Loading />;

  const tests = data?.tests || [];
  const total = data?.total || 0;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, testId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedTest(testId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTest(null);
  };

  const getTestStatus = (testId: string) => tests.find((t) => t.id === testId)?.status || '';

  return (
    <Box>
      <PageHeader
        title="Accessibility Tests"
        subtitle="WCAG compliance testing with Axe Core"
        actions={
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => router.push('/accessibility/tests/new')}
          >
            New Test
          </Button>
        }
      />

      <Card>
        <Box p={2} display="flex" gap={2} flexWrap="wrap">
          <TextField
            size="small"
            placeholder="Search tests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ width: 250 }}
          />
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="RUNNING">Running</MenuItem>
              <MenuItem value="COMPLETED">Completed</MenuItem>
              <MenuItem value="FAILED">Failed</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>WCAG Level</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Score</TableCell>
                <TableCell>Issues</TableCell>
                <TableCell>Pages</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tests.map((test) => (
                <TableRow key={test.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {test.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {test.project?.name} - {test.urls?.length || 0} URLs
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={`WCAG ${test.wcagLevel}`} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={test.status}
                      size="small"
                      sx={{
                        bgcolor: (STATUS_COLORS[test.status] || '#6b7280') + '20',
                        color: STATUS_COLORS[test.status] || '#6b7280',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      color={test.score >= 90 ? 'success' : test.score >= 70 ? 'warning' : 'error'}
                    >
                      {test.score}%
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={0.5}>
                      {test.criticalCount > 0 && (
                        <Chip label={`${test.criticalCount}`} size="small" sx={{ bgcolor: '#dc2626', color: 'white' }} />
                      )}
                      {test.seriousCount > 0 && (
                        <Chip label={`${test.seriousCount}`} size="small" sx={{ bgcolor: '#ea580c', color: 'white' }} />
                      )}
                      {test.moderateCount > 0 && (
                        <Chip label={`${test.moderateCount}`} size="small" sx={{ bgcolor: '#ca8a04', color: 'white' }} />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {test.scannedPages}/{test.totalPages}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {new Date(test.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="right">
                    {['PENDING', 'QUEUED'].includes(test.status) && (
                      <Tooltip title="Run test">
                        <IconButton size="small" onClick={() => runTest.mutate(test.id)}>
                          <PlayArrow />
                        </IconButton>
                      </Tooltip>
                    )}
                    {test.status === 'RUNNING' && (
                      <Tooltip title="Cancel test">
                        <IconButton size="small" onClick={() => cancelTest.mutate(test.id)}>
                          <Stop />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="View details">
                      <IconButton size="small" onClick={() => router.push(`/accessibility/tests/${test.id}`)}>
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    <IconButton size="small" onClick={(e) => handleMenuOpen(e, test.id)}>
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
            Showing {tests.length} of {total} tests
          </Typography>
          <Pagination
            count={Math.ceil(total / 20)}
            page={page}
            onChange={(_, p) => setPage(p)}
          />
        </Box>
      </Card>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={() => router.push(`/accessibility/tests/${selectedTest}`)}>
          <Visibility sx={{ mr: 1 }} /> View Details
        </MenuItem>
        {['PENDING', 'QUEUED'].includes(getTestStatus(selectedTest || '')) && (
          <MenuItem onClick={() => { runTest.mutate(selectedTest || ''); handleMenuClose(); }}>
            <PlayArrow sx={{ mr: 1 }} /> Run Test
          </MenuItem>
        )}
        {getTestStatus(selectedTest || '') === 'RUNNING' && (
          <MenuItem onClick={() => { cancelTest.mutate(selectedTest || ''); handleMenuClose(); }}>
            <Stop sx={{ mr: 1 }} /> Cancel
          </MenuItem>
        )}
        <MenuItem sx={{ color: 'error.main' }} onClick={handleMenuClose}>
          <Delete sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>
    </Box>
  );
}

function Tooltip({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <Box component="span" title={title} sx={{ display: 'inline-flex' }}>
      {children}
    </Box>
  );
}