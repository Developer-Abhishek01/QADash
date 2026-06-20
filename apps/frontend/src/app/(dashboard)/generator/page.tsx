'use client';

import { useState } from 'react';
import { Box, Grid, Card, CardContent, Typography, Button, TextField, Chip, Paper } from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Sparkles,
  TestTube,
  Crosshair,
  CheckCheck,
  FileCode,
  Copy,
  Wand2,
  Loader2,
} from 'lucide-react';

const generatorModes = [
  {
    id: 'test',
    label: 'Test Case',
    icon: TestTube,
    placeholder: 'Describe what you want to test...',
    hint: 'e.g., "Test the login flow with valid and invalid credentials"',
    color: '#4F46E5',
    gradient: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
  },
  {
    id: 'selector',
    label: 'Selector',
    icon: Crosshair,
    placeholder: 'Describe the element you need a selector for...',
    hint: 'e.g., "The submit button on the checkout page"',
    color: '#059669',
    gradient: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
  },
  {
    id: 'assertion',
    label: 'Assertion',
    icon: CheckCheck,
    placeholder: 'Describe what you want to assert...',
    hint: 'e.g., "Verify the success message appears after form submission"',
    color: '#D97706',
    gradient: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)',
  },
];

const quickTemplates: Record<string, string[]> = {
  test: ['Test login with valid credentials', 'Test form validation errors', 'Test API endpoint responds 200', 'Test file upload flow'],
  selector: ['Submit button on checkout', 'Navigation menu links', 'Search input field', 'Error toast message'],
  assertion: ['Success message is visible', 'Form is disabled while submitting', 'URL contains /dashboard', 'Error count is zero'],
};

export default function AIGeneratorPage() {
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState('test');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [copied, setCopied] = useState(false);

  const activeMode = generatorModes.find((m) => m.id === mode)!;

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    setResult('');
    await new Promise((r) => setTimeout(r, 2000));
    const mockResults: Record<string, string> = {
      test: `// AI-generated test case for: ${prompt}\n\nimport { test, expect } from '@playwright/test';\n\ntest('${prompt}', async ({ page }) => {\n  await page.goto('https://example.com');\n  await page.waitForLoadState('networkidle');\n  // Add your test logic here\n  await expect(page.locator('h1')).toBeVisible();\n});`,
      selector: `// AI-generated selector for: ${prompt}\n\n// Recommended selector:\nconst element = page.locator('[data-testid="submit-button"]');\n\n// Fallback options:\n// const element = page.getByRole('button', { name: 'Submit' });\n// const element = page.locator('button:has-text("Submit")');`,
      assertion: `// AI-generated assertion for: ${prompt}\n\nawait expect(page.locator('.success-message')).toContainText('Success');\nawait expect(page.locator('.error-toast')).not.toBeVisible();\nawait expect(page).toHaveURL(/.*\\/thank-you/);`,
    };
    setResult(mockResults[mode] || mockResults.test);
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && prompt.trim() && !loading) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard?.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const applyTemplate = (tpl: string) => {
    setPrompt(tpl);
    setResult('');
  };

  const IconComp = activeMode.icon;

  return (
    <Box sx={{ bgcolor: '#F8FAFC', minHeight: '100vh', pb: 6 }}>
      {/* Hero */}
      <Card
        sx={{
          borderRadius: 2.5,
          background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #EC4899 100%)',
          height: 160,
          position: 'relative',
          overflow: 'hidden',
          mb: 3,
          boxShadow: '0 8px 32px rgba(79,70,229,0.25)',
        }}
      >
        <Box sx={{ position: 'absolute', top: '-40%', right: '-5%', width: '55%', height: '180%', background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 60%)', borderRadius: '50%' }} />
        <Box sx={{ position: 'absolute', bottom: '-30%', left: '30%', width: '40%', height: '100%', background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 60%)', borderRadius: '50%' }} />
        <Box sx={{ position: 'absolute', top: '50%', left: '38%', width: 280, height: 280, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.06)', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />

        <CardContent sx={{ p: '24px 28px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
            <Wand2 size={24} color="#FCD34D" />
            <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '2rem', letterSpacing: '-0.025em', lineHeight: 1.15 }}>
              AI Generator
            </Typography>
          </Box>
          <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 400, fontSize: '0.95rem', maxWidth: 480 }}>
            Generate test cases, selectors, and assertions using AI
          </Typography>
        </CardContent>
      </Card>

      {/* Stats */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { icon: Sparkles, label: 'Total Generated', value: '128', color: '#4F46E5' },
          { icon: TestTube, label: 'Test Cases', value: '67', color: '#4F46E5' },
          { icon: Crosshair, label: 'Selectors', value: '34', color: '#059669' },
          { icon: CheckCheck, label: 'Assertions', value: '27', color: '#D97706' },
        ].map((stat) => (
          <Grid item xs={6} sm={3} key={stat.label}>
            <Card sx={{ borderRadius: 2, bgcolor: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)', height: 72, transition: 'all 0.2s ease', '&:hover': { boxShadow: `0 4px 12px ${alpha(stat.color, 0.08)}, 0 2px 8px rgba(0,0,0,0.04)`, transform: 'translateY(-2px)' } }}>
              <CardContent sx={{ p: '14px 18px', height: '100%', display: 'flex', alignItems: 'center', gap: 2, '&:last-child': { pb: '14px' } }}>
                <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: alpha(stat.color, 0.08), display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color, flexShrink: 0, '& svg': { width: 15, height: 15 } }}>
                  <stat.icon />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 700, color: '#0F172A', fontSize: '1.1rem', lineHeight: 1.2 }}>{stat.value}</Typography>
                  <Typography sx={{ fontWeight: 500, color: '#94A3B8', fontSize: '0.68rem', letterSpacing: '0.01em' }}>{stat.label}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Mode Selector */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {generatorModes.map((m) => {
          const ItemIcon = m.icon;
          const isActive = mode === m.id;
          return (
            <Grid item xs={4} key={m.id}>
              <Card
                onClick={() => { setMode(m.id); setResult(''); setPrompt(''); }}
                sx={{
                  borderRadius: 2.5,
                  bgcolor: '#fff',
                  boxShadow: isActive
                    ? `0 4px 16px ${alpha(m.color, 0.12)}, 0 2px 8px rgba(0,0,0,0.04)`
                    : '0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)',
                  height: 100,
                  cursor: 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  border: '1px solid',
                  borderColor: isActive ? alpha(m.color, 0.2) : 'transparent',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': isActive ? {
                    content: '""',
                    position: 'absolute',
                    top: 0, left: 0, right: 0,
                    height: 3,
                    background: m.gradient,
                  } : {},
                  '&:hover': {
                    boxShadow: `0 4px 16px ${alpha(m.color, 0.1)}, 0 2px 8px rgba(0,0,0,0.04)`,
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <CardContent sx={{ p: '16px 20px', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', '&:last-child': { pb: '16px' } }}>
                  <Box
                    sx={{
                      width: 32, height: 32, borderRadius: 1.5,
                      bgcolor: isActive ? alpha(m.color, 0.1) : alpha('#94A3B8', 0.08),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: isActive ? m.color : '#94A3B8',
                      mb: 1,
                      '& svg': { width: 16, height: 16 },
                    }}
                  >
                    <ItemIcon />
                  </Box>
                  <Typography sx={{ fontWeight: 600, color: isActive ? '#0F172A' : '#64748B', fontSize: '0.78rem' }}>
                    {m.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Quick Templates */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <Typography sx={{ color: '#94A3B8', fontWeight: 500, fontSize: '0.72rem', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
          Quick Templates
        </Typography>
        <Box sx={{ flex: 1, height: 1, bgcolor: alpha('#E2E8F0', 0.6) }} />
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {quickTemplates[mode]?.slice(0, 4).map((tpl) => (
            <Chip
              key={tpl}
              label={tpl}
              size="small"
              onClick={() => applyTemplate(tpl)}
              sx={{
                borderRadius: 1.5, height: 28, fontSize: '0.7rem', fontWeight: 500,
                bgcolor: alpha(activeMode.color, 0.06), color: alpha(activeMode.color, 0.7),
                border: '1px solid',
                borderColor: alpha(activeMode.color, 0.1),
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': { bgcolor: alpha(activeMode.color, 0.12), borderColor: alpha(activeMode.color, 0.2) },
              }}
            />
          ))}
        </Box>
      </Box>
      <Card
        sx={{
          borderRadius: 2.5,
          bgcolor: '#fff',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)',
          mb: 3,
          border: '1px solid',
          borderColor: alpha(activeMode.color, 0.06),
          transition: 'all 0.25s ease',
        }}
      >
        <CardContent sx={{ p: '24px', '&:last-child': { pb: '24px' } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
            <Box
              sx={{
                width: 40, height: 40, borderRadius: 2, bgcolor: alpha(activeMode.color, 0.08),
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: activeMode.color,
                '& svg': { width: 20, height: 20 },
              }}
            >
              <IconComp />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 600, color: '#0F172A', fontSize: '0.95rem' }}>
                Generate {activeMode.label}
              </Typography>
              <Typography sx={{ color: '#94A3B8', fontWeight: 400, fontSize: '0.78rem', mt: 0.15 }}>
                {activeMode.hint}
              </Typography>
            </Box>
          </Box>

          <TextField
            fullWidth
            multiline
            rows={4}
            placeholder={activeMode.placeholder}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            sx={{
              mb: 2.5,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                bgcolor: alpha(activeMode.color, 0.015),
                fontSize: '0.85rem',
                fontFamily: '"Cascadia Code", "Fira Code", monospace',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha('#E2E8F0', 0.8) },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(activeMode.color, 0.3) },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: activeMode.color, borderWidth: '1.5px' },
              },
            }}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="contained"
              disableElevation
              endIcon={loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={16} />}
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              sx={{
                borderRadius: 2, textTransform: 'none', fontWeight: 700, fontSize: '0.85rem', height: 46, px: 5,
                background: activeMode.gradient,
                color: '#fff',
                letterSpacing: '0.01em',
                boxShadow: `0 4px 14px ${alpha(activeMode.color, 0.25)}`,
                '&:hover': {
                  background: activeMode.gradient,
                  boxShadow: `0 6px 24px ${alpha(activeMode.color, 0.35)}`,
                  transform: 'translateY(-1.5px)',
                },
                '&:active': {
                  transform: 'translateY(0)',
                  boxShadow: `0 2px 8px ${alpha(activeMode.color, 0.2)}`,
                },
                '&:disabled': {
                  background: alpha('#E2E8F0', 0.6),
                  color: alpha('#94A3B8', 0.5),
                  boxShadow: 'none',
                },
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {loading ? 'Generating...' : 'Generate'}
            </Button>
            {prompt.trim() && !loading && (
              <Typography sx={{ color: alpha('#94A3B8', 0.5), fontSize: '0.7rem', fontWeight: 500 }}>
                Press Enter to generate
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Result */}
      {loading && (
        <Card sx={{ borderRadius: 2.5, bgcolor: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)' }}>
          <CardContent sx={{ p: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, py: 6 }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} color="#4F46E5" />
            <Typography sx={{ color: '#64748B', fontWeight: 500, fontSize: '0.85rem' }}>
              AI is generating your {activeMode.label.toLowerCase()}...
            </Typography>
          </CardContent>
        </Card>
      )}

      {result && !loading && (
        <Card
          sx={{
            borderRadius: 2.5,
            bgcolor: '#fff',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)',
            border: '1px solid',
            borderColor: alpha(activeMode.color, 0.08),
          }}
        >
          <CardContent sx={{ p: '24px', '&:last-child': { pb: '24px' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FileCode size={16} color={activeMode.color} />
                <Typography sx={{ fontWeight: 600, color: '#0F172A', fontSize: '0.85rem' }}>
                  Generated Output
                </Typography>
                <Chip
                  label={activeMode.label}
                  size="small"
                  sx={{
                    height: 22, fontSize: '0.65rem', fontWeight: 600,
                    bgcolor: alpha(activeMode.color, 0.1), color: activeMode.color,
                  }}
                />
              </Box>
              <Button
                size="small"
                disableElevation
                startIcon={copied ? <CheckCheck size={14} /> : <Copy size={14} />}
                onClick={handleCopy}
                sx={{
                  borderRadius: 1.5, textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', height: 32, px: 2,
                  color: copied ? '#059669' : '#64748B',
                  bgcolor: copied ? alpha('#059669', 0.08) : alpha('#94A3B8', 0.08),
                  '&:hover': { bgcolor: copied ? alpha('#059669', 0.12) : alpha('#94A3B8', 0.15) },
                  transition: 'all 0.2s ease',
                }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </Box>
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 2,
                bgcolor: alpha('#F8FAFC', 0.8),
                borderColor: alpha('#E2E8F0', 0.6),
                p: 2.5,
                maxHeight: 300,
                overflow: 'auto',
              }}
            >
              <Typography
                component="pre"
                sx={{
                  fontFamily: '"Cascadia Code", "Fira Code", monospace',
                  fontSize: '0.78rem',
                  lineHeight: 1.7,
                  color: '#1E293B',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  m: 0,
                }}
              >
                {result}
              </Typography>
            </Paper>
          </CardContent>
        </Card>
      )}

      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </Box>
  );
}
