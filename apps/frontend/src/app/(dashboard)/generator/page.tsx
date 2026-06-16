'use client';

import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Paper,
  Chip,
} from '@mui/material';
import { AutoFixHigh as AIIcon, ContentCopy as CopyIcon } from '@mui/icons-material';
import { PageHeader } from '@/components/common/PageHeader';
import { copyToClipboard } from '@/lib/utils';

export default function AIGeneratorPage() {
  const [prompt, setPrompt] = useState('');
  const [type, setType] = useState('test');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 2000));
    setResult(`// AI-generated ${type} for: ${prompt}\n\ntest('${prompt}', async ({ page }) => {\n  await page.goto('https://example.com');\n  await page.waitForLoadState('networkidle');\n  // Add your assertions here\n});`);
    setLoading(false);
  };

  const handleCopy = () => {
    if (result) copyToClipboard(result);
  };

  return (
    <Box>
      <PageHeader
        title="AI Generator"
        subtitle="Generate test cases, selectors, and assertions using AI"
      />
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Generate with AI</Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Type</InputLabel>
              <Select value={type} label="Type" onChange={(e) => setType(e.target.value)}>
                <MenuItem value="test">Test Case</MenuItem>
                <MenuItem value="selector">Selector</MenuItem>
                <MenuItem value="assertion">Assertion</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <TextField
            fullWidth
            multiline
            rows={4}
            placeholder="Describe what you want to test..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <AIIcon />}
            onClick={handleGenerate}
            disabled={loading || !prompt}
          >
            {loading ? 'Generating...' : 'Generate'}
          </Button>

          {result && (
            <Paper variant="outlined" sx={{ mt: 3, p: 2, position: 'relative' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Chip label="Generated" size="small" color="success" />
                <Button size="small" startIcon={<CopyIcon />} onClick={handleCopy}>
                  Copy
                </Button>
              </Box>
              <Typography component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'pre-wrap', overflow: 'auto' }}>
                {result}
              </Typography>
            </Paper>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
