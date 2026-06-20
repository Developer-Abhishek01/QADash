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
  TextField,
  InputAdornment,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  GetApp as DownloadIcon,
  Visibility as ViewIcon,
  Description as ReportIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Share as ShareIcon,
  Link as LinkIcon,
  DeleteSweep as BulkDeleteIcon,
  Assessment as AssessmentIcon,
  Storage as StorageIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { reportsApi } from '@/lib/api/client';
import { copyToClipboard, cn } from '@/lib/utils';
import { PageHeader } from '@/components/common/PageHeader';
import { ReportsFilter } from '@/components/reports/ReportsFilter';
import type { ReportsFilters } from '@/components/reports/types';
import { DEFAULT_FILTERS, STATUS_OPTIONS, DATE_OPTIONS, REPORT_TYPE_OPTIONS } from '@/components/reports/types';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSnackbar } from 'notistack';
import { X } from 'lucide-react';

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

interface StatCard {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  maxValue?: string;
  progress?: number;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const { enqueueSnackbar } = useSnackbar();
  const [viewReport, setViewReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; ids: string[] }>({ open: false, ids: [] });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<ReportsFilters>(DEFAULT_FILTERS);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status !== 'all') count++;
    if (filters.dateRange !== 'all') count++;
    if (filters.reportTypes.length > 0) count++;
    return count;
  }, [filters]);

  const filteredReports = useMemo(() => {
    let result = [...reports];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        r.summary?.status?.toLowerCase().includes(q)
      );
    }

    if (filters.status !== 'all') {
      const statusMap: Record<string, string> = {
        passed: 'PASSED',
        failed: 'FAILED',
        in_progress: 'RUNNING',
      };
      const target = statusMap[filters.status];
      result = result.filter(r => r.summary?.status === target);
    }

    if (filters.dateRange !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (filters.dateRange === 'today') {
        result = result.filter(r => new Date(r.createdAt) >= today);
      } else if (filters.dateRange === 'last7') {
        const d = new Date(today);
        d.setDate(d.getDate() - 7);
        result = result.filter(r => new Date(r.createdAt) >= d);
      } else if (filters.dateRange === 'last30') {
        const d = new Date(today);
        d.setDate(d.getDate() - 30);
        result = result.filter(r => new Date(r.createdAt) >= d);
      } else if (filters.dateRange === 'custom' && filters.customDateFrom) {
        const from = new Date(filters.customDateFrom);
        const to = filters.customDateTo
          ? new Date(filters.customDateTo + 'T23:59:59')
          : new Date();
        result = result.filter(r => {
          const d = new Date(r.createdAt);
          return d >= from && d <= to;
        });
      }
    }

    if (filters.reportTypes.length > 0) {
      result = result.filter(r => filters.reportTypes.includes(r.type));
    }

    return result;
  }, [reports, searchTerm, filters]);

  const handleApplyFilters = useCallback((newFilters: ReportsFilters) => {
    setFilters(newFilters);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const totalPassed = useMemo(
    () => reports.reduce((sum, r) => sum + (r.summary?.passed ?? 0), 0),
    [reports]
  );

  const totalFailed = useMemo(
    () => reports.reduce((sum, r) => sum + (r.summary?.failed ?? 0), 0),
    [reports]
  );

  const estimatedStorageMB = Math.round(reports.length * 0.3 * 10) / 10;

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

  const handleDownloadReport = (report: Report) => {
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
    enqueueSnackbar('Report downloaded successfully!', { variant: 'success' });
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
    if (selectedIds.length === filteredReports.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredReports.map(r => r.id));
    }
  };

  const statCards: StatCard[] = [
    {
      label: 'Total Reports',
      value: reports.length,
      icon: <AssessmentIcon />,
      color: '#6366f1',
      bgColor: '#eef2ff',
    },
    {
      label: 'Storage Used',
      value: `${estimatedStorageMB} MB`,
      icon: <StorageIcon />,
      color: '#f59e0b',
      bgColor: '#fffbeb',
      maxValue: '100 MB',
      progress: Math.min((estimatedStorageMB / 100) * 100, 100),
    },
    {
      label: 'Passed Reports',
      value: totalPassed,
      icon: <CheckCircleIcon />,
      color: '#10b981',
      bgColor: '#ecfdf5',
    },
    {
      label: 'Failed Reports',
      value: totalFailed,
      icon: <CancelIcon />,
      color: '#ef4444',
      bgColor: '#fef2f2',
    },
  ];

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'PASSED': return 'success';
      case 'FAILED': return 'error';
      case 'RUNNING': return 'info';
      default: return 'default';
    }
  };

  const getPassRateColor = (passed: number, total: number) => {
    if (total === 0) return 'default';
    const rate = passed / total;
    if (rate >= 0.9) return 'success';
    if (rate >= 0.5) return 'warning';
    return 'error';
  };

  const chipSx = {
    fontWeight: 600,
    fontSize: '0.75rem',
    height: 24,
    '& .MuiChip-label': { px: 1 },
  };

  return (
    <Box>
      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

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
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
              >
                Delete Selected ({selectedIds.length})
              </Button>
            )}
          </Box>
        }
      />

      {/* Stats Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {statCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                borderRadius: 3,
                height: '100%',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, letterSpacing: 0.5 }}>
                      {card.label}
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
                      {card.value}
                    </Typography>
                    {card.maxValue && (
                      <Typography variant="caption" color="text.disabled">
                        of {card.maxValue}
                      </Typography>
                    )}
                  </Box>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: card.bgColor,
                      color: card.color,
                      flexShrink: 0,
                    }}
                  >
                    {card.icon}
                  </Box>
                </Box>
                {card.progress !== undefined && (
                  <LinearProgress
                    variant="determinate"
                    value={card.progress}
                    sx={{
                      mt: 1.5,
                      height: 6,
                      borderRadius: 3,
                      bgcolor: alpha(card.color, 0.12),
                      '& .MuiLinearProgress-bar': {
                        bgcolor: card.color,
                        borderRadius: 3,
                      },
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* All Reports Section */}
      <Card
        sx={{
          borderRadius: 3,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
          overflow: 'hidden',
        }}
      >
        {/* Toolbar */}
        <Box
          sx={{
            px: 2.5,
            py: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            flexWrap: 'wrap',
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600, flexShrink: 0 }}>
            All Reports
          </Typography>
          <TextField
            placeholder="Search reports..."
            size="small"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            sx={{
              flex: '1 1 240px',
              minWidth: 200,
              maxWidth: 360,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                bgcolor: 'grey.50',
                '& fieldset': { borderColor: 'transparent' },
                '&:hover fieldset': { borderColor: 'text.primary' },
                '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: 1.5 },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />
          <button
            onClick={() => setFilterOpen(true)}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl border px-3.5 py-1.5 text-sm font-semibold transition-all',
              'focus:outline-none focus:ring-2 focus:ring-accent-400/50',
              activeFilterCount > 0
                ? 'border-accent-300 bg-accent-50 text-accent-700 hover:bg-accent-100'
                : 'border-surface-200 text-surface-600 hover:border-surface-300 hover:bg-surface-50'
            )}
          >
            <FilterListIcon sx={{ fontSize: 16 }} />
            Filter
            {activeFilterCount > 0 && (
              <span className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent-500 text-[11px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
          <Button
            variant="text"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={fetchReports}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, flexShrink: 0 }}
          >
            Refresh
          </Button>
          <Box sx={{ flex: '1 1 0', display: { xs: 'none', md: 'block' } }} />
          <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0 }}>
            {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''}
          </Typography>
        </Box>

        {/* Filter Badges */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-surface-100 px-5 py-3">
            <span className="text-xs font-medium text-surface-400">
              Filters:
            </span>
            {filters.status !== 'all' && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-accent-50 px-2.5 py-1 text-xs font-medium text-accent-700">
                {STATUS_OPTIONS.find(o => o.value === filters.status)?.label}
                <button
                  onClick={() => setFilters(prev => ({ ...prev, status: 'all' }))}
                  className="text-accent-400 hover:text-accent-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filters.dateRange !== 'all' && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-accent-50 px-2.5 py-1 text-xs font-medium text-accent-700">
                {DATE_OPTIONS.find(o => o.value === filters.dateRange)?.label}
                <button
                  onClick={() => setFilters(prev => ({ ...prev, dateRange: 'all' }))}
                  className="text-accent-400 hover:text-accent-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filters.reportTypes.map(type => (
              <span
                key={type}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent-50 px-2.5 py-1 text-xs font-medium text-accent-700"
              >
                {REPORT_TYPE_OPTIONS.find(o => o.value === type)?.label}
                <button
                  onClick={() =>
                    setFilters(prev => ({
                      ...prev,
                      reportTypes: prev.reportTypes.filter(t => t !== type),
                    }))
                  }
                  className="text-accent-400 hover:text-accent-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <button
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="ml-1 text-xs font-medium text-surface-400 transition-colors hover:text-surface-600"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" sx={{ pl: 2.5 }}>
                  <Checkbox
                    indeterminate={selectedIds.length > 0 && selectedIds.length < filteredReports.length}
                    checked={filteredReports.length > 0 && selectedIds.length === filteredReports.length}
                    onChange={toggleSelectAll}
                    sx={{ '&.Mui-checked': { color: '#6366f1' }, '&.MuiCheckbox-indeterminate': { color: '#6366f1' } }}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem', letterSpacing: 0.5 }}>
                  Report Name
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem', letterSpacing: 0.5 }}>
                  Type
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem', letterSpacing: 0.5 }}>
                  Tests
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem', letterSpacing: 0.5 }}>
                  Status
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem', letterSpacing: 0.5 }}>
                  Date
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem', letterSpacing: 0.5, pr: 2.5 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredReports.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        bgcolor: 'grey.100',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 2,
                      }}
                    >
                      <ReportIcon sx={{ fontSize: 28, color: 'text.disabled' }} />
                    </Box>
                    <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600 }} gutterBottom>
                      {searchTerm ? 'No matching reports' : 'No reports found'}
                    </Typography>
                    <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
                      {searchTerm ? 'Try a different search term' : 'Generate your first report to get started'}
                    </Typography>
                    {!searchTerm && (
                      <Box sx={{ mt: 2, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.disabled">
                          No reports available
                        </Typography>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredReports.map((report) => (
                  <TableRow
                    key={report.id}
                    hover
                    selected={selectedIds.includes(report.id)}
                    sx={{
                      '&:hover': {
                        bgcolor: alpha('#6366f1', 0.04),
                      },
                      '&.Mui-selected': {
                        bgcolor: alpha('#6366f1', 0.08),
                      },
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <TableCell padding="checkbox" sx={{ pl: 2.5 }}>
                      <Checkbox
                        checked={selectedIds.includes(report.id)}
                        onChange={() => toggleSelect(report.id)}
                        sx={{ '&.Mui-checked': { color: '#6366f1' } }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 1.5,
                            bgcolor: alpha('#6366f1', 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <ReportIcon sx={{ fontSize: 18, color: '#6366f1' }} />
                        </Box>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                            {report.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {report.user?.name || 'System'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={report.type.replace('_', ' ')}
                        size="small"
                        variant="outlined"
                        sx={{ ...chipSx, borderColor: alpha('#6366f1', 0.3), color: '#6366f1' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {report.summary?.passed ?? 0}/{report.summary?.totalTests ?? 0}
                        </Typography>
                        {report.summary?.totalTests ? (
                          <Chip
                            label={`${Math.round(((report.summary?.passed ?? 0) / report.summary.totalTests) * 100)}%`}
                            size="small"
                            color={getPassRateColor(report.summary?.passed ?? 0, report.summary.totalTests)}
                            variant="outlined"
                            sx={{ ...chipSx, height: 20, fontSize: '0.65rem' }}
                          />
                        ) : null}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={report.summary?.status || 'N/A'}
                        size="small"
                        color={getStatusColor(report.summary?.status)}
                        sx={chipSx}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(report.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ pr: 2.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                        <Tooltip title="View details">
                          <IconButton size="small" onClick={() => handleView(report)} sx={{ color: 'text.secondary', '&:hover': { bgcolor: alpha('#6366f1', 0.1), color: '#6366f1' } }}>
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Share link">
                          <IconButton size="small" onClick={() => handleShare(report)} sx={{ color: 'text.secondary', '&:hover': { bgcolor: alpha('#10b981', 0.1), color: '#10b981' } }}>
                            <ShareIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete report">
                          <IconButton size="small" onClick={() => handleDeleteClick(report.id)} sx={{ color: 'text.secondary', '&:hover': { bgcolor: alpha('#ef4444', 0.1), color: '#ef4444' } }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* View Report Dialog */}
      <Dialog
        open={Boolean(viewReport)}
        onClose={() => setViewReport(null)}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 1.5, bgcolor: alpha('#6366f1', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ReportIcon sx={{ color: '#6366f1' }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>{viewReport?.name}</Typography>
              <Typography variant="caption" color="text.secondary">Report Details</Typography>
            </Box>
          </Box>
          <IconButton onClick={() => setViewReport(null)} sx={{ position: 'absolute', right: 12, top: 12, color: 'text.secondary' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ '&.MuiDialogContent-dividers': { borderColor: 'divider' } }}>
          <Box sx={{ py: 1 }}>
            <Grid container spacing={2.5}>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, letterSpacing: 0.5 }}>Report ID</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace', mt: 0.3 }}>{viewReport?.id}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, letterSpacing: 0.5 }}>Type</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.3, textTransform: 'capitalize' }}>{viewReport?.type?.replace('_', ' ')}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, letterSpacing: 0.5 }}>Generated By</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.3 }}>{viewReport?.user?.name || 'System'}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, letterSpacing: 0.5 }}>Project</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.3 }}>{viewReport?.project?.name || '—'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, letterSpacing: 0.5 }}>Generated At</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.3 }}>{new Date(viewReport?.createdAt || '').toLocaleString()}</Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Execution Summary</Typography>

            <Box sx={{ bgcolor: alpha('#6366f1', 0.03), p: 2.5, borderRadius: 2, border: '1px solid', borderColor: alpha('#6366f1', 0.1), mb: 3 }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 600, letterSpacing: 0.5, mb: 1.5 }}>
                TEST RESULTS SUMMARY
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">Total Tests</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{viewReport?.summary?.totalTests ?? 0}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">Passed</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#10b981' }}>{viewReport?.summary?.passed ?? 0}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">Failed</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#ef4444' }}>{viewReport?.summary?.failed ?? 0}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">Pass Rate</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {viewReport?.summary?.totalTests
                      ? `${Math.round(((viewReport.summary.passed ?? 0) / viewReport.summary.totalTests) * 100)}%`
                      : 'N/A'}
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Test Case Details</Typography>
            {viewReport?.data?.testResults && viewReport.data.testResults.length > 0 ? (
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400, borderRadius: 2 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem', letterSpacing: 0.5 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem', letterSpacing: 0.5 }}>Test Case ID</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem', letterSpacing: 0.5 }}>File / Test Name</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem', letterSpacing: 0.5 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem', letterSpacing: 0.5 }}>Duration</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem', letterSpacing: 0.5 }}>Error</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {viewReport.data.testResults.map((tr, idx) => (
                      <TableRow
                        key={tr.id}
                        sx={{
                          bgcolor: tr.status === 'FAILED' ? alpha('#ef4444', 0.04) : tr.status === 'PASSED' ? alpha('#10b981', 0.04) : undefined,
                          '&:hover': { bgcolor: alpha('#6366f1', 0.03) },
                        }}
                      >
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">{idx + 1}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', wordBreak: 'break-all' }}>
                            {tr.testId}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{tr.testName}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={tr.status}
                            size="small"
                            color={tr.status === 'PASSED' ? 'success' : tr.status === 'FAILED' ? 'error' : 'default'}
                            variant={tr.status === 'PASSED' ? 'filled' : 'outlined'}
                            sx={{ minWidth: 76, ...chipSx }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">{tr.duration ? `${tr.duration}ms` : '-'}</Typography>
                        </TableCell>
                        <TableCell>
                          {tr.error ? (
                            <Tooltip title={tr.error} arrow>
                              <Typography variant="caption" color="error" sx={{
                                maxWidth: 180,
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
              <Box sx={{ textAlign: 'center', py: 4, bgcolor: alpha('#6366f1', 0.02), borderRadius: 2, border: '1px dashed', borderColor: alpha('#6366f1', 0.15) }}>
                <Typography variant="body2" color="text.disabled">No individual test results available</Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button variant="outlined" startIcon={<LinkIcon />} onClick={async () => { if (viewReport) { try { await handleShare(viewReport); } catch { enqueueSnackbar('Failed to copy link', { variant: 'error' }); } } }} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
            Copy Link
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => setViewReport(null)} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>Close</Button>
          <Button variant="contained" startIcon={<DownloadIcon />} onClick={() => { if (viewReport) handleDownloadReport(viewReport); }} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
            Download Report
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog
        open={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, ids: [] })}
        PaperProps={{ sx: { borderRadius: 3, maxWidth: 420 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 1.5, bgcolor: alpha('#ef4444', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DeleteIcon sx={{ color: '#ef4444', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Confirm Delete</Typography>
              <Typography variant="caption" color="text.secondary">This action cannot be undone</Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {confirmDelete.ids.length === 1
              ? 'Are you sure you want to delete this report? All associated data will be permanently removed.'
              : `Are you sure you want to delete ${confirmDelete.ids.length} reports? All associated data will be permanently removed.`}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setConfirmDelete({ open: false, ids: [] })} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleConfirmDelete} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
            Delete {confirmDelete.ids.length > 1 ? `(${confirmDelete.ids.length})` : ''}
          </Button>
        </DialogActions>
      </Dialog>
      <ReportsFilter
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        activeFilterCount={activeFilterCount}
      />
    </Box>
  );
}
