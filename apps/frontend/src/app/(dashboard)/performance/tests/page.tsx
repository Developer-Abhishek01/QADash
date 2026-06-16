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
  LinearProgress,
  Tooltip,
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
import { usePerformanceTests, useRunPerformanceTest, useCancelPerformanceTest } from '@/lib/performance/hooks';
import PageHeader from '@/components/common/PageHeader';
import Loading from '@/components/feedback/Loading';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6b7280',
  PENDING: '#6b7280',
  QUEUED: '#3b82f6',
  RUNNING: '#8b5cf6',
  COMPLETED: '#10b981',
  FAILED: '#dc2626',
  CANCELLED: '#6b7280',
};

const TEST_TYPE_LABELS: Record<string, string> = {
  LOAD: 'Load',
  STRESS: 'Stress',
  SPIKE: 'Spike',
  SOAK: 'Soak',
  SMOKE: 'Smoke',
};

export default function PerformanceTestsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);

  const { data, isLoading } = usePerformanceTests({
    offset: (page - 1) * 20,
    limit: 20,
    status: statusFilter || undefined,
    testType: typeFilter || undefined,
  });

  const runTest = useRunPerformanceTest();
  const cancelTest = useCancelPerformanceTest();

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

  const handleRunTest = async () => {
    if (selectedTest) {
      await runTest.mutateAsync(selectedTest);
      handleMenuClose();
    }
  };

  const handleCancelTest = async () => {
    if (selectedTest) {
      await cancelTest.mutateAsync(selectedTest);
      handleMenuClose();
    }
  };

  const getTestStatus = (testId: string) => tests.find((t) => t.id === testId)?.status || '';

  return (
    <Box>
      <PageHeader
        title="Performance Tests"
        subtitle="Manage and execute load, stress, and performance tests"
        actions={
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => router.push('/performance/tests/new')}
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
            <InputLabel>Type</InputLabel>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              label="Type"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="LOAD">Load</MenuItem>
              <MenuItem value="STRESS">Stress</MenuItem>
              <MenuItem value="SPIKE">Spike</MenuItem>
              <MenuItem value="SOAK">Soak</MenuItem>
              <MenuItem value="SMOKE">Smoke</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="DRAFT">Draft</MenuItem>
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
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Results</TableCell>
                <TableCell>Duration</TableCell>
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
                      {test.project?.name} - {test.environment?.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={TEST_TYPE_LABELS[test.testType] || test.testType} size="small" />
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
                    {test.status === 'RUNNING' && (
                      <LinearProgress sx={{ mt: 0.5, width: '80px' }} />
                    )}
                  </TableCell>
                  <TableCell>
                    <Box display="flex" flexDirection="column" gap={0.5}>
                      {test.avgResponseTime > 0 && (
                        <Typography variant="caption">
                          {test.avgResponseTime.toFixed(0)}ms avg
                        </Typography>
                      )}
                      {test.p95ResponseTime > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          P95: {test.p95ResponseTime.toFixed(0)}ms
                        </Typography>
                      )}
                      {test.errorRate > 0 && (
                        <Typography variant="caption" color={test.errorRate > 5 ? 'error' : 'warning'}>
                          {test.errorRate.toFixed(2)}% errors
                        </Typography>
                      )}
                      {test.avgResponseTime === 0 && test.status === 'COMPLETED' && (
                        <Typography variant="caption" color="text.secondary">-</Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {test.duration ? `${(test.duration / 1000).toFixed(1)}s` : '-'}
                  </TableCell>
                  <TableCell>
                    {new Date(test.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="right">
                    {['DRAFT', 'PENDING', 'QUEUED'].includes(test.status) && (
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
                      <IconButton size="small" onClick={() => router.push(`/performance/tests/${test.id}`)}>
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
        <MenuItem onClick={() => router.push(`/performance/tests/${selectedTest}`)}>
          <Visibility sx={{ mr: 1 }} /> View Details
        </MenuItem>
        {['DRAFT', 'PENDING', 'QUEUED'].includes(getTestStatus(selectedTest || '')) && (
          <MenuItem onClick={handleRunTest}>
            <PlayArrow sx={{ mr: 1 }} /> Run Test
          </MenuItem>
        )}
        {getTestStatus(selectedTest || '') === 'RUNNING' && (
          <MenuItem onClick={handleCancelTest}>
            <Stop sx={{ mr: 1 }} /> Cancel
          </MenuItem>
        )}
        <MenuItem sx={{ color: 'error.main' }} onClick={() => {
          handleMenuClose();
        }}>
          <Delete sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>
    </Box>
  );
}