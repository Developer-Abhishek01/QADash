'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  ArrowBack,
  PlayArrow,
} from '@mui/icons-material';
import { importApi } from '@/lib/api/client';
import PageHeader from '@/components/common/PageHeader';
import Loading from '@/components/feedback/Loading';
import { useSnackbar } from 'notistack';

const FIELD_TYPES = [
  { value: 'string', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
  { value: 'phone', label: 'Phone' },
];

const TRANSFORMERS = [
  { value: '', label: 'None' },
  { value: 'uppercase', label: 'Uppercase' },
  { value: 'lowercase', label: 'Lowercase' },
  { value: 'trim', label: 'Trim' },
  { value: 'capitalize', label: 'Capitalize' },
  { value: 'title', label: 'Title Case' },
  { value: 'number', label: 'To Number' },
  { value: 'integer', label: 'To Integer' },
  { value: 'boolean', label: 'To Boolean' },
  { value: 'date', label: 'To Date' },
];

export default function ImportMappingPage() {
  const params = useParams();
  const router = useRouter();
  const importId = params.id as string;
  const { enqueueSnackbar } = useSnackbar();

  const [activeStep, setActiveStep] = useState(0);
  const [mappings, setMappings] = useState<Record<string, {
    targetField: string;
    fieldType: string;
    isRequired: boolean;
    defaultValue: string;
    transformer: string;
  }>>({});
  const [importData, setImportData] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const data = await importApi.get(importId);
      setImportData(data);
      
      const preview = await importApi.getPreview(importId, 0, 10);
      setPreviewData(preview);
    } catch (error) {
      console.error('Failed to fetch import data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [importId]);

  if (isLoading) return <Loading />;

  if (!importData) {
    return <Typography>Import not found</Typography>;
  }

  const schema = importData.schema as { name: string; type: string; nullable: boolean }[] || [];
  const existingMappings = importData.mappings || [];

  if (Object.keys(mappings).length === 0 && existingMappings.length > 0) {
    const initialMappings: Record<string, any> = {};
    existingMappings.forEach((m: any) => {
      initialMappings[m.sourceField] = {
        targetField: m.targetField,
        fieldType: m.fieldType,
        isRequired: m.isRequired,
        defaultValue: m.defaultValue || '',
        transformer: m.transformer || '',
      };
    });
    setMappings(initialMappings);
  }

  if (Object.keys(mappings).length === 0 && schema.length > 0) {
    const auto: Record<string, any> = {};
    schema.forEach((field) => {
      auto[field.name] = {
        targetField: field.name,
        fieldType: field.type,
        isRequired: !field.nullable,
        defaultValue: '',
        transformer: '',
      };
    });
    setMappings(auto);
  }

  const handleMappingChange = (sourceField: string, key: string, value: unknown) => {
    setMappings((prev) => ({
      ...prev,
      [sourceField]: { ...prev[sourceField], [key]: value },
    }));
  };

  const handleSaveAndProcess = async () => {
    try {
      setIsProcessing(true);
      const mappingData = Object.entries(mappings).map(([sourceField, config]) => ({
        sourceField,
        targetField: config.targetField,
        fieldType: config.fieldType,
        isRequired: config.isRequired,
        defaultValue: config.defaultValue || undefined,
        transformer: config.transformer || undefined,
      }));

      await importApi.saveMappings(importId, mappingData);
      await importApi.process(importId);
      enqueueSnackbar('Mapping saved and processing started', { variant: 'success' });
      router.push('/import');
    } catch (error) {
      console.error('Save & Process failed:', error);
      enqueueSnackbar('Operation failed', { variant: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const steps = ['Preview Data', 'Field Mapping', 'Process'];

  return (
    <Box>
      <PageHeader
        title={`Map: ${importData.name}`}
        subtitle="Map source fields to target fields and configure transformations"
        actions={
          <Button startIcon={<ArrowBack />} onClick={() => router.back()}>
            Back
          </Button>
        }
      />

      <Box sx={{ mb: 3 }}>
        <Stepper activeStep={activeStep}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {activeStep === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Data Preview
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {schema.slice(0, 8).map((field) => (
                      <TableCell key={field.name} sx={{ fontWeight: 'bold' }}>
                        {field.name}
                        <Typography variant="caption" display="block" color="text.secondary">
                          {field.type}
                        </Typography>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(previewData || []).slice(0, 5).map((row, idx) => (
                    <TableRow key={idx}>
                      {schema.slice(0, 8).map((field) => (
                        <TableCell key={field.name}>
                          {String(row[field.name] || '-').substring(0, 30)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box mt={2}>
              <Typography variant="body2" color="text.secondary">
                Total rows: {importData.totalRows}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {activeStep === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Field Mappings
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Source Field</TableCell>
                    <TableCell>Target Field</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Required</TableCell>
                    <TableCell>Default Value</TableCell>
                    <TableCell>Transformer</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {schema.map((field) => (
                    <TableRow key={field.name}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {field.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={mappings[field.name]?.targetField || ''}
                          onChange={(e) => handleMappingChange(field.name, 'targetField', e.target.value)}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <FormControl size="small">
                          <Select
                            value={mappings[field.name]?.fieldType || field.type}
                            onChange={(e) => handleMappingChange(field.name, 'fieldType', e.target.value)}
                          >
                            {FIELD_TYPES.map((t) => (
                              <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={mappings[field.name]?.isRequired || false}
                          onChange={(e) => handleMappingChange(field.name, 'isRequired', e.target.checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={mappings[field.name]?.defaultValue || ''}
                          onChange={(e) => handleMappingChange(field.name, 'defaultValue', e.target.value)}
                          placeholder="Optional"
                        />
                      </TableCell>
                      <TableCell>
                        <FormControl size="small">
                          <Select
                            value={mappings[field.name]?.transformer || ''}
                            onChange={(e) => handleMappingChange(field.name, 'transformer', e.target.value)}
                          >
                            {TRANSFORMERS.map((t) => (
                              <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {activeStep === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Ready to Process
            </Typography>
            <Box sx={{ p: 3, bgcolor: '#f9fafb', borderRadius: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Total Rows</Typography>
                  <Typography variant="h5">{importData.totalRows}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">File Type</Typography>
                  <Typography variant="h5">{importData.fileType}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Fields to Map</Typography>
                  <Typography variant="h5">{Object.keys(mappings).length}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Required Fields</Typography>
                  <Typography variant="h5">
                    {Object.values(mappings).filter((m) => m.isRequired).length}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
      )}

      <Box display="flex" justifyContent="space-between" mt={3}>
        <Button
          disabled={activeStep === 0}
          onClick={() => setActiveStep((prev) => prev - 1)}
        >
          Back
        </Button>
        {activeStep < steps.length - 1 ? (
          <Button
            variant="contained"
            onClick={() => setActiveStep((prev) => prev + 1)}
          >
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            startIcon={<PlayArrow />}
            onClick={handleSaveAndProcess}
            disabled={isProcessing}
          >
            Save & Process
          </Button>
        )}
      </Box>
    </Box>
  );
}