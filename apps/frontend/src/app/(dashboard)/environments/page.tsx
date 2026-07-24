'use client';

import {
  Add as AddIcon,
  Language as LanguageIcon,
  CheckCircle as ActiveIcon,
  Error as DownIcon,
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Button,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Snackbar,
  Alert,
  MenuItem,
} from '@mui/material';
import { useState } from 'react';

import { PageHeader } from '@/components/common/PageHeader';
import { Loading } from '@/components/feedback/Loading';
import { useEnvironments, useCreateEnvironment } from '@/lib/environments/hooks';
import type { Environment } from '@/lib/environments/types';

export default function EnvironmentsPage() {
  const { data: environments, isLoading } = useEnvironments();
  const createEnv = useCreateEnvironment();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', type: 'DEVELOPMENT' as Environment['type'] });
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  if (isLoading) return <Loading />;

  const handleSave = async () => {
    try {
      await createEnv.mutateAsync(form);
      setSnackbar({ message: 'Environment created', severity: 'success' });
      setOpen(false);
      setForm({ name: '', url: '', type: 'DEVELOPMENT' });
    } catch {
      setSnackbar({ message: 'Failed to create environment', severity: 'error' });
    }
  };

  const envs = environments ?? [];

  return (
    <Box>
      <PageHeader
        title="Environments"
        subtitle="Manage and monitor your test environments"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            Add Environment
          </Button>
        }
      />

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>URL</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Checked</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {envs.map((env: Environment) => (
                  <TableRow key={env.id}>
                    <TableCell sx={{ fontWeight: 600 }}>{env.name}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LanguageIcon fontSize="small" color="action" />
                        <Typography variant="body2">{env.url}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell><Chip label={env.type} size="small" variant="outlined" /></TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {env.status === 'UP' ? <ActiveIcon color="success" fontSize="small" /> : <DownIcon color="error" fontSize="small" />}
                        <Typography variant="body2" color={env.status === 'UP' ? 'success.main' : 'error.main'}>{env.status}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{env.lastChecked}</TableCell>
                  </TableRow>
                ))}
                {envs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center"><Typography py={2} color="text.secondary">No environments found</Typography></TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Add New Environment</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Environment Name" fullWidth value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. My Website" />
            <TextField label="URL" fullWidth value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://your-website.com" />
            <TextField select label="Type" fullWidth value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Environment['type'] })}>
              <MenuItem value="DEVELOPMENT">Development</MenuItem>
              <MenuItem value="STAGING">Staging</MenuItem>
              <MenuItem value="PRODUCTION">Production</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={createEnv.isPending}>Add</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snackbar} autoHideDuration={3000} onClose={() => setSnackbar(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {snackbar ? <Alert severity={snackbar.severity}>{snackbar.message}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
