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
  Stepper,
  Step,
  StepLabel,
  Tabs,
  Tab,
} from '@mui/material';
import { PlayArrow, ArrowBack, Save } from '@mui/icons-material';
import { useCreatePerformanceTest, useRunPerformanceTest } from '@/lib/performance/hooks';
import PageHeader from '@/components/common/PageHeader';
import _Loading from '@/components/feedback/Loading';

const TEST_TYPES = [
  { value: 'LOAD', label: 'Load Test', description: 'Normal expected load' },
  { value: 'STRESS', label: 'Stress Test', description: 'Beyond normal capacity' },
  { value: 'SPIKE', label: 'Spike Test', description: 'Sudden dramatic load changes' },
  { value: 'SOAK', label: 'Soak Test', description: 'Extended period at sustained load' },
  { value: 'SMOKE', label: 'Smoke Test', description: 'Basic sanity test' },
];

const DEFAULT_SCRIPT = `import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const baseUrl = __BASE_URL__ || 'http://localhost:3000';
  
  const res = http.get(baseUrl + '/api/health');
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}`;

export default function NewPerformanceTest() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    projectId: '',
    environmentId: '',
    testType: 'LOAD',
    script: DEFAULT_SCRIPT,
    isScheduled: false,
    schedule: '',
  });
  const [config, setConfig] = useState({
    vus: 10,
    duration: 30,
    iterations: 0,
    rps: 0,
    rampUpDuration: 0,
    rampDownDuration: 0,
  });
  const [thresholds, setThresholds] = useState({
    http_req_duration: 'p(95)<500',
    http_req_failed: 'rate<0.01',
    http_reqs: 'rate>10',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createTest = useCreatePerformanceTest();
  const runTest = useRunPerformanceTest();

  const handleChange = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleConfigChange = (field: string, value: number) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleThresholdChange = (field: string, value: string) => {
    setThresholds((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (runAfterCreate = false) => {
    setIsSubmitting(true);
    try {
      const testData = {
        ...formData,
        config: config,
        thresholds: thresholds,
      };

      const result = await createTest.mutateAsync(testData as any);

      if (runAfterCreate) {
        await runTest.mutateAsync(result.id);
      }

      router.push('/performance/tests');
    } catch (error) {
      console.error('Failed to create test:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = ['Basic Info', 'Test Type', 'Script & Config', 'Thresholds'];

  return (
    <Box>
      <PageHeader
        title="Create Performance Test"
        subtitle="Configure and launch k6 load tests"
        actions={
          <Button startIcon={<ArrowBack />} onClick={() => router.back()}>
            Back
          </Button>
        }
      />

      <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
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
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Test Name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="e.g., API Load Test"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Project</InputLabel>
                    <Select
                      value={formData.projectId}
                      onChange={(e) => handleChange('projectId', e.target.value)}
                      label="Project"
                    >
                      <MenuItem value="demo">Demo Project</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
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
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                  />
                </Grid>
              </Grid>
            )}

            {activeStep === 1 && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Test Type
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Choose the type of performance test to run
                  </Typography>
                </Grid>
                {TEST_TYPES.map((type) => (
                  <Grid item xs={12} sm={6} md={4} key={type.value}>
                    <Card
                      sx={{
                        cursor: 'pointer',
                        border: formData.testType === type.value ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                        '&:hover': { bgcolor: '#f9fafb' },
                      }}
                      onClick={() => handleChange('testType', type.value)}
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
              </Grid>
            )}

            {activeStep === 2 && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    K6 Script & Configuration
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
                    <Tab label="Script" />
                    <Tab label="Configuration" />
                  </Tabs>
                </Grid>
                {activeTab === 0 && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={15}
                      value={formData.script}
                      onChange={(e) => handleChange('script', e.target.value)}
                      placeholder="Enter k6 JavaScript code..."
                      sx={{ fontFamily: 'monospace' }}
                    />
                  </Grid>
                )}
                {activeTab === 1 && (
                  <Grid item xs={12}>
                    <Grid container spacing={2}>
                      <Grid item xs={6} md={3}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Virtual Users"
                          value={config.vus}
                          onChange={(e) => handleConfigChange('vus', parseInt(e.target.value) || 0)}
                        />
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Duration (seconds)"
                          value={config.duration}
                          onChange={(e) => handleConfigChange('duration', parseInt(e.target.value) || 0)}
                        />
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <TextField
                          fullWidth
                          type="number"
                          label="RPS (0 = auto)"
                          value={config.rps}
                          onChange={(e) => handleConfigChange('rps', parseInt(e.target.value) || 0)}
                        />
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Iterations"
                          value={config.iterations}
                          onChange={(e) => handleConfigChange('iterations', parseInt(e.target.value) || 0)}
                        />
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Ramp Up (seconds)"
                          value={config.rampUpDuration}
                          onChange={(e) => handleConfigChange('rampUpDuration', parseInt(e.target.value) || 0)}
                        />
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Ramp Down (seconds)"
                          value={config.rampDownDuration}
                          onChange={(e) => handleConfigChange('rampDownDuration', parseInt(e.target.value) || 0)}
                        />
                      </Grid>
                    </Grid>
                  </Grid>
                )}
              </Grid>
            )}

            {activeStep === 3 && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Thresholds
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Define pass/fail criteria for your test
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Response Time (p95)"
                    value={thresholds.http_req_duration}
                    onChange={(e) => handleThresholdChange('http_req_duration', e.target.value)}
                    placeholder="p(95)<500"
                    helperText="e.g., p(95)<500 means 95% requests must be under 500ms"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Error Rate"
                    value={thresholds.http_req_failed}
                    onChange={(e) => handleThresholdChange('http_req_failed', e.target.value)}
                    placeholder="rate<0.01"
                    helperText="e.g., rate<0.01 means error rate must be under 1%"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Throughput"
                    value={thresholds.http_reqs}
                    onChange={(e) => handleThresholdChange('http_reqs', e.target.value)}
                    placeholder="rate>10"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Alert severity="info">
                    <Typography variant="body2">
                      Thresholds define when your test is considered a PASS or FAIL.
                      If any threshold is exceeded, the test will fail.
                    </Typography>
                  </Alert>
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.isScheduled}
                        onChange={(e) => handleChange('isScheduled', e.target.checked)}
                      />
                    }
                    label="Enable scheduled execution"
                  />
                </Grid>
                {formData.isScheduled && (
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Cron Expression"
                      value={formData.schedule}
                      onChange={(e) => handleChange('schedule', e.target.value)}
                      placeholder="0 0 * * * (daily)"
                    />
                  </Grid>
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
                <Box display="flex" gap={1}>
                  <Button
                    variant="outlined"
                    startIcon={<Save />}
                    onClick={() => handleSubmit(false)}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<PlayArrow />}
                    onClick={() => handleSubmit(true)}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Creating...' : 'Save & Run'}
                  </Button>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}