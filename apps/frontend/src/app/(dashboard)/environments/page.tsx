'use client';

import {
  Box,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Language as LanguageIcon,
  CheckCircle as ActiveIcon,
  Error as DownIcon,
} from '@mui/icons-material';
import { PageHeader } from '@/components/common/PageHeader';
import { useState } from 'react';

interface Environment {
  id: string;
  name: string;
  url: string;
  type: 'STAGING' | 'PRODUCTION' | 'DEVELOPMENT';
  status: 'UP' | 'DOWN';
  lastChecked: string;
}

const initialEnvironments: Environment[] = [
  { id: '1', name: 'Main Website', url: 'https://example.com', type: 'PRODUCTION', status: 'UP', lastChecked: new Date().toLocaleString() },
  { id: '2', name: 'Staging App', url: 'https://staging.example.com', type: 'STAGING', status: 'UP', lastChecked: new Date().toLocaleString() },
];

export default function EnvironmentsPage() {
  const [environments, setEnvironments] = useState<Environment[]>(initialEnvironments);
  const [open, setOpen] = useState(false);
  const [newEnv, setNewEnv] = useState({ name: '', url: '', type: 'DEVELOPMENT' });

  const handleAdd = () => {
    const env: Environment = {
      id: Date.now().toString(),
      name: newEnv.name,
      url: newEnv.url,
      type: newEnv.type as any,
      status: 'UP',
      lastChecked: new Date().toLocaleString(),
    };
    setEnvironments([...environments, env]);
    setOpen(false);
    setNewEnv({ name: '', url: '', type: 'DEVELOPMENT' });
  };

  const handleDelete = (id: string) => {
    setEnvironments(environments.filter(e => e.id !== id));
  };

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
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {environments.map((env) => (
                  <TableRow key={env.id}>
                    <TableCell sx={{ fontWeight: 600 }}>{env.name}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LanguageIcon fontSize="small" color="action" />
                        <Typography variant="body2">{env.url}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={env.type} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {env.status === 'UP' ? <ActiveIcon color="success" fontSize="small" /> : <DownIcon color="error" fontSize="small" />}
                        <Typography variant="body2" color={env.status === 'UP' ? 'success.main' : 'error.main'}>
                          {env.status}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{env.lastChecked}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" color="primary">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(env.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Add New Environment</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Environment Name"
              fullWidth
              value={newEnv.name}
              onChange={(e) => setNewEnv({ ...newEnv, name: e.target.value })}
              placeholder="e.g. My Website"
            />
            <TextField
              label="URL"
              fullWidth
              value={newEnv.url}
              onChange={(e) => setNewEnv({ ...newEnv, url: e.target.value })}
              placeholder="https://your-website.com"
            />
            <TextField
              select
              label="Type"
              fullWidth
              value={newEnv.type}
              onChange={(e) => setNewEnv({ ...newEnv, type: e.target.value })}
              SelectProps={{ native: true }}
            >
              <option value="DEVELOPMENT">Development</option>
              <option value="STAGING">Staging</option>
              <option value="PRODUCTION">Production</option>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd}>Add Environment</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}