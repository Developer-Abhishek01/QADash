'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  FormControlLabel,
  Switch,
  Alert,
  Chip,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import { PlayArrow, ArrowBack, Schedule } from '@mui/icons-material';
import { useCreateSecurityScan, useStartSecurityScan } from '@/lib/security/hooks';
import PageHeader from '@/components/common/PageHeader';
import _Loading from '@/components/feedback/Loading';

const SCAN_TYPES = [
  { value: 'QUICK', label: 'Quick Scan', description: 'Fast scan covering common vulnerabilities' },
  { value: 'FULL', label: 'Full Scan', description: 'Comprehensive scan including all tests' },
  { value: 'AUTHENTICATION', label: 'Authentication Scan', description: 'Focus on auth and session security' },
  { value: 'API', label: 'API Security Scan', description: 'Test API endpoints for vulnerabilities' },
];

export default function NewSecurityScan() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    projectId: '',
    environmentId: '',
    scanType: 'QUICK',
    isScheduled: false,
    schedule: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createScan = useCreateSecurityScan();
  const startScan = useStartSecurityScan();

  const handleChange = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await createScan.mutateAsync(formData as any);
      if (!formData.isScheduled) {
        await startScan.mutateAsync((result as any).data.id);
      }
      router.push('/security/scans');
    } catch (error) {
      console.error('Failed to create scan:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = ['Basic Info', 'Scan Type', 'Schedule'];

  return (
    <Box>
      <PageHeader
        title="Create Security Scan"
        subtitle="Configure and launch a new security scan"
        actions={
          <Button startIcon={<ArrowBack />} onClick={() => router.back()}>
            Back
          </Button>
        }
      />

      <Box sx={{ maxWidth: 800, mx: 'auto' }}>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Card>
          <CardContent>
            {activeStep === 0 && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Basic Information
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Scan Name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="e.g., Production Security Scan"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Project</InputLabel>
                    <Select
                      value={formData.projectId}
                      onChange={(e) => handleChange('projectId', e.target.value)}
                      label="Project"
                    >
                      <MenuItem value="demo-project">Demo Project</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Environment</InputLabel>
                    <Select
                      value={formData.environmentId}
                      onChange={(e) => handleChange('environmentId', e.target.value)}
                      label="Environment"
                    >
                      <MenuItem value="staging">Staging</MenuItem>
                      <MenuItem value="production">Production</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            )}

            {activeStep === 1 && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Scan Type
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Choose the type of security scan you want to run
                  </Typography>
                </Grid>
                {SCAN_TYPES.map((type) => (
                  <Grid item xs={12} sm={6} key={type.value}>
                    <Card
                      sx={{
                        cursor: 'pointer',
                        border: formData.scanType === type.value ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                        '&:hover': { bgcolor: '#f9fafb' },
                      }}
                      onClick={() => handleChange('scanType', type.value)}
                    >
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight="medium">
                          {type.label}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {type.description}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
                <Grid item xs={12}>
                  <Alert severity="info">
                    <Typography variant="body2">
                      <strong>Scanner Coverage:</strong> Full scan includes OWASP ZAP, SQL injection, XSS,
                      authentication testing, header analysis, JWT validation, and API security.
                    </Typography>
                  </Alert>
                </Grid>
              </Grid>
            )}

            {activeStep === 2 && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Schedule (Optional)
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.isScheduled}
                        onChange={(e) => handleChange('isScheduled', e.target.checked)}
                      />
                    }
                    label="Enable scheduled scanning"
                  />
                </Grid>
                {formData.isScheduled && (
                  <>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Enter a cron expression for the schedule
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Cron Expression"
                        value={formData.schedule}
                        onChange={(e) => handleChange('schedule', e.target.value)}
                        placeholder="0 0 * * * (daily at midnight)"
                        helperText="Format: minute hour day month weekday"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                          Common presets:
                        </Typography>
                        <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
                          <Chip label="Daily (0 0 * * *)" onClick={() => handleChange('schedule', '0 0 * * *')} />
                          <Chip label="Weekly (0 0 * * 0)" onClick={() => handleChange('schedule', '0 0 * * 0')} />
                          <Chip label="Monthly (0 0 1 * *)" onClick={() => handleChange('schedule', '0 0 1 * *')} />
                        </Box>
                      </Box>
                    </Grid>
                  </>
                )}
              </Grid>
            )}

            <Box display="flex" justifyContent="space-between" mt={4}>
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
                  disabled={
                    (activeStep === 0 && (!formData.name || !formData.projectId || !formData.environmentId))
                  }
                >
                  Next
                </Button>
              ) : (
                <Button
                  variant="contained"
                  startIcon={formData.isScheduled ? <Schedule /> : <PlayArrow />}
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : formData.isScheduled ? 'Create Scheduled Scan' : 'Create & Start Scan'}
                </Button>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}