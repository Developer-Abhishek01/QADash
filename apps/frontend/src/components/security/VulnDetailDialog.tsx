'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Chip,
  Divider,
} from '@mui/material';

import type { Vulnerability } from '@/lib/security/types';

import { SeverityChip } from './SeverityChip';

interface VulnDetailDialogProps {
  vulnerability: Vulnerability | null;
  open: boolean;
  onClose: () => void;
}

export function VulnDetailDialog({ vulnerability, open, onClose }: VulnDetailDialogProps) {
  if (!vulnerability) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h6">{vulnerability.title}</Typography>
          <SeverityChip severity={vulnerability.severity} />
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          {vulnerability.description && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom color="text.secondary">Description</Typography>
              <Typography variant="body2">{vulnerability.description}</Typography>
            </Grid>
          )}

          <Grid item xs={12}>
            <Divider />
          </Grid>

          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">Status</Typography>
            <Typography variant="body2" fontWeight={500}>{vulnerability.status}</Typography>
          </Grid>
          {vulnerability.cweId && (
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">CWE ID</Typography>
              <Typography variant="body2" fontWeight={500}>
                <Chip label={vulnerability.cweId} size="small" />
              </Typography>
            </Grid>
          )}
          {vulnerability.cveId && (
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">CVE ID</Typography>
              <Typography variant="body2" fontWeight={500}>
                <Chip label={vulnerability.cveId} size="small" />
              </Typography>
            </Grid>
          )}
          {vulnerability.owaspCategory && (
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">OWASP Category</Typography>
              <Typography variant="body2" fontWeight={500}>{vulnerability.owaspCategory.replace(/_/g, ' ')}</Typography>
            </Grid>
          )}

          {vulnerability.affectedUrl && (
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">Affected URL</Typography>
              <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{vulnerability.affectedUrl}</Typography>
            </Grid>
          )}
          {vulnerability.affectedParam && (
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">Affected Parameter</Typography>
              <Typography variant="body2">{vulnerability.affectedParam}</Typography>
            </Grid>
          )}

          {vulnerability.remediation && (
            <Grid item xs={12}>
              <Divider />
            </Grid>
          )}
          {vulnerability.remediation && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom color="success.main">Remediation</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{vulnerability.remediation}</Typography>
              {vulnerability.remediationUrl && (
                <Button
                  size="small"
                  href={vulnerability.remediationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ mt: 1 }}
                >
                  View Remediation Guide
                </Button>
              )}
            </Grid>
          )}

          {vulnerability.evidence && Object.keys(vulnerability.evidence).length > 0 && (
            <Grid item xs={12}>
              <Divider />
            </Grid>
          )}
          {vulnerability.evidence && Object.keys(vulnerability.evidence).length > 0 && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom color="text.secondary">Evidence</Typography>
              <Box
                component="pre"
                sx={{
                  bgcolor: '#f5f5f5',
                  p: 2,
                  borderRadius: 1,
                  overflow: 'auto',
                  fontSize: '0.75rem',
                  maxHeight: 200,
                }}
              >
                {JSON.stringify(vulnerability.evidence, null, 2)}
              </Box>
            </Grid>
          )}

          <Grid item xs={12}>
            <Divider />
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">Found</Typography>
            <Typography variant="body2">{new Date(vulnerability.createdAt).toLocaleString()}</Typography>
          </Grid>
          {vulnerability.resolvedAt && (
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">Resolved</Typography>
              <Typography variant="body2">{new Date(vulnerability.resolvedAt).toLocaleString()}</Typography>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default VulnDetailDialog;
