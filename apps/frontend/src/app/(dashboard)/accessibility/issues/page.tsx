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
  Lightbulb,
  OpenInNew,
} from '@mui/icons-material';
import { useAccessibilityIssues, useResolveAccessibilityIssue } from '@/lib/accessibility/hooks';
import PageHeader from '@/components/common/PageHeader';
import Loading from '@/components/feedback/Loading';

const IMPACT_COLORS: Record<string, string> = {
  CRITICAL: '#dc2626',
  SERIOUS: '#ea580c',
  MODERATE: '#ca8a04',
  MINOR: '#65a30d',
};

const REMEDIATION_TIPS: Record<string, { fix: string; code: string; wcag: string[] }> = {
  'image-alt': { fix: 'Add alt attribute to images', code: '<img src="image.jpg" alt="Description">', wcag: ['1.1.1'] },
  'link-name': { fix: 'Add text or aria-label to links', code: '<a href="/page">Click here</a>', wcag: ['2.4.4'] },
  'label': { fix: 'Add label to form inputs', code: '<label for="input">Name</label><input id="input">', wcag: ['3.3.2'] },
  'heading-order': { fix: 'Use sequential heading levels', code: '<h1>Title</h1><h2>Subtitle</h2>', wcag: ['1.3.1'] },
  'color-contrast': { fix: 'Increase color contrast ratio', code: 'color: #333 (instead of #999)', wcag: ['1.4.3'] },
  'html-has-lang': { fix: 'Add lang attribute to html', code: '<html lang="en">', wcag: ['3.1.1'] },
};

export default function AccessibilityIssuesPage() {
  const [page, setPage] = useState(1);
  const [impactFilter, setImpactFilter] = useState('');
  const [testFilter, setTestFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolveNote, setResolveNote] = useState('');

  const { data, isLoading } = useAccessibilityIssues({
    testId: testFilter || undefined,
    impact: impactFilter || undefined,
    offset: (page - 1) * 50,
    limit: 50,
  });

  const resolveIssue = useResolveAccessibilityIssue();

  if (isLoading) return <Loading />;

  const issues = data || [];
  const total = issues.length;

  const handleResolve = async () => {
    if (selectedIssue) {
      await resolveIssue.mutateAsync({
        id: selectedIssue,
        data: { isResolved: true, resolutionNote: resolveNote },
      });
      setResolveDialogOpen(false);
      setResolveNote('');
      setSelectedIssue(null);
    }
  };

  const getRemediation = (ruleId: string) => REMEDIATION_TIPS[ruleId] || { fix: 'Review WCAG guidelines', code: '', wcag: ['General'] };

  return (
    <Box>
      <PageHeader
        title="Accessibility Issues"
        subtitle="Track and resolve accessibility violations with remediation guidance"
      />

      <Card>
        <Box p={2} display="flex" gap={2} flexWrap="wrap">
          <TextField
            size="small"
            placeholder="Search issues..."
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
            <InputLabel>Impact</InputLabel>
            <Select
              value={impactFilter}
              onChange={(e) => setImpactFilter(e.target.value)}
              label="Impact"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="CRITICAL">Critical</MenuItem>
              <MenuItem value="SERIOUS">Serious</MenuItem>
              <MenuItem value="MODERATE">Moderate</MenuItem>
              <MenuItem value="MINOR">Minor</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Test</InputLabel>
            <Select
              value={testFilter}
              onChange={(e) => setTestFilter(e.target.value)}
              label="Test"
            >
              <MenuItem value="">All Tests</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Issue</TableCell>
                <TableCell>Impact</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>WCAG</TableCell>
                <TableCell>Page</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {issues.map((issue) => (
                <TableRow key={issue.id} hover sx={{ opacity: issue.isResolved ? 0.6 : 1 }}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {issue.ruleId}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 300 }}>
                      {issue.description?.substring(0, 80)}...
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={issue.impact}
                      size="small"
                      sx={{
                        bgcolor: IMPACT_COLORS[issue.impact] || '#6b7280',
                        color: 'white',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{issue.category}</Typography>
                  </TableCell>
                  <TableCell>
                    {issue.wcagCriteria?.slice(0, 2).map((c) => (
                      <Chip key={c} label={c} size="small" variant="outlined" sx={{ mr: 0.5, fontSize: '0.7rem' }} />
                    ))}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                      {new URL(issue.pageUrl).pathname}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {issue.isResolved ? (
                      <Chip icon={<CheckCircle />} label="Resolved" size="small" color="success" variant="outlined" />
                    ) : (
                      <Chip label="Open" size="small" color="default" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      startIcon={<Lightbulb />}
                      onClick={() => {
                        setSelectedIssue(issue.id);
                      }}
                    >
                      Fix
                    </Button>
                    {!issue.isResolved && (
                      <Button
                        size="small"
                        onClick={() => {
                          setSelectedIssue(issue.id);
                          setResolveDialogOpen(true);
                        }}
                      >
                        Resolve
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box p={2} display="flex" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">
            Showing {issues.length} issues
          </Typography>
          <Pagination
            count={Math.ceil(total / 50)}
            page={page}
            onChange={(_, p) => setPage(p)}
          />
        </Box>
      </Card>

      <Dialog open={Boolean(selectedIssue && !resolveDialogOpen)} onClose={() => setSelectedIssue(null)} maxWidth="md" fullWidth>
        {selectedIssue && (
          <>
            <DialogTitle>Remediation Guide</DialogTitle>
            <DialogContent>
              {(() => {
                const issue = issues.find((i) => i.id === selectedIssue);
                const remediation = issue ? getRemediation(issue.ruleId) : null;
                return (
                  <Grid container spacing={3} mt={1}>
                    <Grid item xs={12}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        Issue: {issue?.ruleId}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {issue?.description}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>
                        Recommended Fix
                      </Typography>
                      <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 1 }}>
                        <Typography variant="body2">
                          {remediation?.fix}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>
                        Code Example
                      </Typography>
                      <Box sx={{ p: 2, bgcolor: '#1f2937', borderRadius: 1, fontFamily: 'monospace' }}>
                        <Typography variant="body2" sx={{ color: '#10b981', whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>
                          {remediation?.code || 'N/A'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" gutterBottom>
                        WCAG Criteria
                      </Typography>
                      <Box display="flex" gap={1} flexWrap="wrap">
                        {remediation?.wcag.map((w) => (
                          <Chip key={w} label={w} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </Grid>
                    {issue?.helpUrl && (
                      <Grid item xs={12}>
                        <Button
                          variant="outlined"
                          startIcon={<OpenInNew />}
                          href={issue.helpUrl}
                          target="_blank"
                        >
                          View Detailed Documentation
                        </Button>
                      </Grid>
                    )}
                  </Grid>
                );
              })()}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedIssue(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog open={resolveDialogOpen} onClose={() => setResolveDialogOpen(false)}>
        <DialogTitle>Resolve Issue</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Mark this accessibility issue as resolved
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Resolution Notes (optional)"
            value={resolveNote}
            onChange={(e) => setResolveNote(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResolveDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleResolve} disabled={resolveIssue.isPending}>
            {resolveIssue.isPending ? 'Resolving...' : 'Mark Resolved'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}