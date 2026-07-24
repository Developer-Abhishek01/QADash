'use client';

import { PlayArrow, ArrowBack } from '@mui/icons-material';
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
  Stepper,
  Step,
  StepLabel,
  Chip,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import PageHeader from '@/components/common/PageHeader';
import { useCreateAccessibilityTest, useRunAccessibilityTest } from '@/lib/accessibility/hooks';
import { projectsApi } from '@/lib/api/client';

export default function NewAccessibilityTest() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [urlInput, setUrlInput] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    projectId: '',
    environmentId: '',
    urls: [] as string[],
    wcagLevel: 'AA',
    isScheduled: false,
    schedule: '',
  });
  const [projects, setProjects] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    projectsApi.list().then(data => setProjects(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  const createTest = useCreateAccessibilityTest();
  const runTest = useRunAccessibilityTest();

  const handleChange = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddUrl = () => {
    if (urlInput && !formData.urls.includes(urlInput)) {
      handleChange('urls', [...formData.urls, urlInput]);
      setUrlInput('');
    }
  };

  const handleRemoveUrl = (url: string) => {
    handleChange('urls', formData.urls.filter((u) => u !== url));
  };

  const handleSubmit = async (runAfterCreate = false) => {
    setIsSubmitting(true);
    try {
      const result = await createTest.mutateAsync(formData as any);
      if (runAfterCreate) {
        await runTest.mutateAsync(result.id);
      }
      router.push('/accessibility/tests');
    } catch (error) {
      console.error('Failed to create test:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = ['Basic Info', 'URLs & Level', 'Schedule'];

  return (
    <Box>
      <PageHeader
        title="Create Accessibility Test"
        subtitle="Scan web pages for WCAG compliance and accessibility issues"
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
                  <Typography variant="h6" gutterBottom>Basic Information</Typography>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Test Name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="e.g., Homepage Accessibility Audit"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Project</InputLabel>
                    <Select value={formData.projectId} onChange={(e) => handleChange('projectId', e.target.value)} label="Project">
                      {projects.map((p: any) => (
                        <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Environment</InputLabel>
                    <Select value={formData.environmentId} onChange={(e) => handleChange('environmentId', e.target.value)} label="Environment">
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
                  <Typography variant="h6" gutterBottom>URLs to Scan</Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Add one or more URLs to scan for accessibility issues
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Box display="flex" gap={1}>
                    <TextField
                      fullWidth
                      size="small"
                      label="URL"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddUrl())}
                    />
                    <Button variant="outlined" onClick={handleAddUrl} disabled={!urlInput}>Add</Button>
                  </Box>
                </Grid>
                {formData.urls.length > 0 && (
                  <Grid item xs={12}>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {formData.urls.map((url) => (
                        <Chip key={url} label={url} onDelete={() => handleRemoveUrl(url)} />
                      ))}
                    </Box>
                  </Grid>
                )}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>WCAG Level</InputLabel>
                    <Select value={formData.wcagLevel} onChange={(e) => handleChange('wcagLevel', e.target.value)} label="WCAG Level">
                      <MenuItem value="A">Level A (Minimum)</MenuItem>
                      <MenuItem value="AA">Level AA (Standard)</MenuItem>
                      <MenuItem value="AAA">Level AAA (Highest)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            )}

            {activeStep === 2 && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Schedule (Optional)</Typography>
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch checked={formData.isScheduled} onChange={(e) => handleChange('isScheduled', e.target.checked)} />
                    }
                    label="Enable scheduled scanning"
                  />
                </Grid>
                {formData.isScheduled && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Cron Expression"
                      value={formData.schedule}
                      onChange={(e) => handleChange('schedule', e.target.value)}
                      placeholder="0 0 * * * (daily)"
                      helperText="Format: minute hour day month weekday"
                    />
                  </Grid>
                )}
              </Grid>
            )}

            <Box display="flex" justifyContent="space-between" mt={4}>
              <Button disabled={activeStep === 0} onClick={() => setActiveStep((p) => p - 1)}>
                Back
              </Button>
              {activeStep < steps.length - 1 ? (
                <Button
                  variant="contained"
                  onClick={() => setActiveStep((p) => p + 1)}
                  disabled={activeStep === 0 && (!formData.name || !formData.projectId || !formData.environmentId)}
                >
                  Next
                </Button>
              ) : (
                <Box display="flex" gap={1}>
                  <Button
                    variant="outlined"
                    onClick={() => handleSubmit(false)}
                    disabled={isSubmitting || formData.urls.length === 0}
                  >
                    {isSubmitting ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<PlayArrow />}
                    onClick={() => handleSubmit(true)}
                    disabled={isSubmitting || formData.urls.length === 0}
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
