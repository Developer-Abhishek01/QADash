'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  Typography,
  Button,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import {
  CloudUpload,
  Description,
  Delete,
  Visibility,
  PlayArrow,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { importApi } from '@/lib/api/client';
import { useSnackbar } from 'notistack';
import { PageHeader } from '@/components/common/PageHeader';

export default function ImportPage() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [projectId] = useState('demo-project');
  const [imports, setImports] = useState<any[]>([]);
  const [_total, setTotal] = useState(0);
  const [_isLoading, setIsLoading] = useState(true);
  const { enqueueSnackbar } = useSnackbar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const deleteImport = { mutate: (id: string) => importApi.delete(id) };
  const uploadFile = { isPending: false };
  const FILE_TYPE_LABELS: Record<string, string> = { CSV: 'CSV', EXCEL: 'Excel', JSON: 'JSON', YAML: 'YAML' };

  const fetchImports = async () => {
    try {
      setIsLoading(true);
      const data = await importApi.list({ projectId });
      setImports(data.imports || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch imports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchImports();
  }, [projectId]);

  const handleFileSelect = async () => {
    if (!selectedFile || !projectId) return;

    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('projectId', projectId);
      
      await importApi.upload(formData);
      enqueueSnackbar('File uploaded successfully', { variant: 'success' });
      setUploadDialogOpen(false);
      setSelectedFile(null);
      fetchImports();
    } catch (error) {
      console.error('Upload failed:', error);
      enqueueSnackbar('Upload failed', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle sx={{ color: '#10b981' }} />;
      case 'FAILED':
        return <ErrorIcon sx={{ color: '#dc2626' }} />;
      case 'PROCESSING':
        return <LinearProgress sx={{ width: 20 }} />;
      default:
        return <Description sx={{ color: '#6b7280' }} />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Box>
      <PageHeader
        title="Data Import"
        subtitle="Upload and parse Excel, CSV, JSON, and YAML files"
        actions={
          <Button
            variant="contained"
            startIcon={<CloudUpload />}
            onClick={() => setUploadDialogOpen(true)}
          >
            Upload File
          </Button>
        }
      />

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>File</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Progress</TableCell>
                    <TableCell>Results</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {imports.map((imp) => (
                    <TableRow key={imp.id} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Description />
                          <Typography variant="body2">
                            {imp.originalFilename}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={FILE_TYPE_LABELS[imp.fileType] || imp.fileType} size="small" />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {getStatusIcon(imp.status)}
                          <Typography variant="body2">{imp.status}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {imp.status === 'PROCESSING' ? (
                          <Box sx={{ minWidth: 100 }}>
                            <LinearProgress variant="determinate" value={(imp.processedRows / imp.totalRows) * 100} />
                            <Typography variant="caption">
                              {imp.processedRows}/{imp.totalRows}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2">-</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Chip
                            label={`${imp.successRows} success`}
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                          {imp.errorRows > 0 && (
                            <Chip
                              label={`${imp.errorRows} errors`}
                              size="small"
                              color="error"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatFileSize(imp.fileSize)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(imp.createdAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {imp.status === 'PENDING' && (
                          <>
                            <Button
                              size="small"
                              startIcon={<PlayArrow />}
                              href={`/import/${imp.id}/map`}
                            >
                              Map & Process
                            </Button>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => deleteImport.mutate(imp.id)}
                            >
                              <Delete />
                            </IconButton>
                          </>
                        )}
                        {imp.status === 'COMPLETED' && (
                          <Button size="small" startIcon={<Visibility />}>
                            View
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {imports.length === 0 && (
              <Box p={4} textAlign="center">
                <CloudUpload sx={{ fontSize: 48, color: '#9ca3af', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No files uploaded yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Upload Excel, CSV, JSON, or YAML files to get started
                </Typography>
              </Box>
            )}
          </Card>
        </Grid>
      </Grid>

      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload File</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              border: '2px dashed #d1d5db',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              '&:hover': { borderColor: '#3b82f6', bgcolor: '#f9fafb' },
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <CloudUpload sx={{ fontSize: 48, color: '#9ca3af', mb: 2 }} />
            <Typography variant="body1" gutterBottom>
              {selectedFile ? selectedFile.name : 'Click to select a file'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Supported: Excel (.xlsx, .xls), CSV, JSON, YAML
            </Typography>
            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept=".xlsx,.xls,.csv,.json,.yaml,.yml"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
          </Box>

          {selectedFile && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleFileSelect}
            disabled={!selectedFile || uploadFile.isPending}
          >
            {uploadFile.isPending ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}