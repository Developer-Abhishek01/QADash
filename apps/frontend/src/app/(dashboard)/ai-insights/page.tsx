'use client';

import { useState } from 'react';
import { Box, Grid, Card, CardContent, Typography, Button, TextField } from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Download,
  Activity,
  Target,
  Bug,
  Lightbulb,
  BrainCircuit,
  Sparkles,
  Code,
  FlaskConical,
  Wrench,
  FolderSearch,
  Zap,
  ArrowRight,
} from 'lucide-react';

const statCards = [
  {
    label: 'Health',
    value: 94,
    suffix: '%',
    icon: Activity,
    color: '#4F46E5',
    gradient: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
    lightBg: alpha('#4F46E5', 0.08),
  },
  {
    label: 'Test Coverage',
    value: 78,
    suffix: '%',
    icon: Target,
    color: '#059669',
    gradient: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
    lightBg: alpha('#059669', 0.08),
  },
  {
    label: 'Open Bugs',
    value: 23,
    suffix: '',
    icon: Bug,
    color: '#DC2626',
    gradient: 'linear-gradient(135deg, #DC2626 0%, #F43F5E 100%)',
    lightBg: alpha('#DC2626', 0.08),
  },
  {
    label: 'Recommendations',
    value: 12,
    suffix: '',
    icon: Lightbulb,
    color: '#D97706',
    gradient: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)',
    lightBg: alpha('#D97706', 0.08),
  },
];

const actionCards = [
  {
    title: 'Analyze Test Code',
    description: 'Get AI-powered suggestions for test improvements',
    icon: Code,
    placeholder: 'Paste your test code here...',
    buttonLabel: 'Analyze',
    color: '#4F46E5',
    gradient: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
    multiline: true,
  },
  {
    title: 'Generate Test Cases',
    description: 'Describe a feature and get AI-generated test cases',
    icon: FlaskConical,
    placeholder: 'Enter feature or functionality...',
    buttonLabel: 'Generate',
    color: '#059669',
    gradient: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
    multiline: false,
  },
  {
    title: 'Suggest Bug Fixes',
    description: 'Get AI-suggested fixes for error stacks',
    icon: Wrench,
    placeholder: 'Paste error or bug details...',
    buttonLabel: 'Suggest Fixes',
    color: '#DC2626',
    gradient: 'linear-gradient(135deg, #DC2626 0%, #F43F5E 100%)',
    multiline: true,
  },
  {
    title: 'Analyze Directory',
    description: 'Get deep insights from a test directory',
    icon: FolderSearch,
    placeholder: 'Enter directory path...',
    buttonLabel: 'Analyze Directory',
    color: '#0EA5E9',
    gradient: 'linear-gradient(135deg, #0EA5E9 0%, #06B6D4 100%)',
    multiline: false,
  },
];

function RobotIllustration() {
  return (
    <Box
      sx={{
        width: 120,
        height: 120,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {/* Main glow aura */}
      <Box
        sx={{
          position: 'absolute',
          width: 160,
          height: 160,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79,70,229,0.2) 0%, rgba(96,165,250,0.08) 30%, rgba(139,92,246,0.03) 55%, transparent 75%)',
          animation: 'pulse 3s ease-in-out infinite',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: 130,
          height: 130,
          borderRadius: '50%',
          border: '1.5px solid rgba(96,165,250,0.08)',
          animation: 'pulse 3s ease-in-out infinite',
          animationDelay: '0.5s',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: 150,
          height: 150,
          borderRadius: '50%',
          border: '1px solid rgba(139,92,246,0.06)',
          transform: 'rotateX(60deg)',
          animation: 'spin 8s linear infinite',
          '@keyframes spin': {
            '0%': { transform: 'rotateX(60deg) rotate(0deg)' },
            '100%': { transform: 'rotateX(60deg) rotate(360deg)' },
          },
        }}
      />

      {[
        { top: -10, left: -14, delay: '0s', size: 4.5, color: '#60A5FA' },
        { top: -6, right: -16, delay: '0.9s', size: 3.5, color: '#8B5CF6' },
        { bottom: -4, left: 6, delay: '1.8s', size: 3, color: '#4F46E5' },
        { top: 34, right: -8, delay: '0.5s', size: 2.5, color: '#60A5FA' },
        { bottom: 24, left: -12, delay: '1.3s', size: 2, color: '#8B5CF6' },
        { top: -2, left: 40, delay: '2.2s', size: 2.5, color: '#EC4899' },
      ].map((dot, i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            top: dot.top,
            left: dot.left,
            right: dot.right,
            bottom: dot.bottom,
            width: dot.size,
            height: dot.size,
            borderRadius: '50%',
            bgcolor: dot.color,
            opacity: 0.5,
            animation: `pulse ${2 + (i % 3) * 0.4}s ease-in-out ${dot.delay} infinite`,
            boxShadow: `0 0 8px ${dot.color}44`,
          }}
        />
      ))}

      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          width: 50,
          height: 10,
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.05)',
          filter: 'blur(6px)',
          animation: 'float 3s ease-in-out infinite',
        }}
      />

      <Box sx={{ animation: 'float 3s ease-in-out infinite' }}>
        <svg width="100" height="110" viewBox="0 0 200 220" fill="none" style={{ display: 'block' }}>
          <defs>
            <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#F1F5F9" />
            </linearGradient>
            <linearGradient id="glowGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#4F46E5" />
            </linearGradient>
            <linearGradient id="darkGlow" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#4F46E5" />
            </linearGradient>
            <linearGradient id="chestGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#60A5FA" stopOpacity="0" />
              <stop offset="50%" stopColor="#60A5FA" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#60A5FA" stopOpacity="0" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="softShadow">
              <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="rgba(79,70,229,0.12)" />
            </filter>
            <filter id="strongGlow">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g style={{ animation: 'bubbleFloat 3s ease-in-out infinite', transformOrigin: '148px 55px' }}>
            <rect x="128" y="22" width="56" height="30" rx="15" fill="white" fillOpacity="0.92" filter="url(#softShadow)" />
            <path d="M148 52 L141 63 L155 52" fill="white" fillOpacity="0.92" />
            <circle cx="144" cy="37" r="3" fill="url(#glowGrad)" opacity="0.6" />
            <circle cx="154" cy="37" r="3" fill="url(#glowGrad)" opacity="0.4" />
            <circle cx="164" cy="37" r="3" fill="url(#glowGrad)" opacity="0.2" />
          </g>

          <line x1="100" y1="38" x2="100" y2="16" stroke="url(#darkGlow)" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
          <circle cx="100" cy="13" r="6" fill="url(#darkGlow)" filter="url(#glow)">
            <animate attributeName="r" values="6;8;6" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="100" cy="13" r="14" fill="#8B5CF6" opacity="0.1" filter="url(#strongGlow)">
            <animate attributeName="r" values="14;20;14" dur="2s" repeatCount="indefinite" />
          </circle>

          <rect x="52" y="60" width="96" height="82" rx="24" fill="url(#bodyGrad)" filter="url(#softShadow)" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
          <rect x="62" y="70" width="76" height="12" rx="6" fill="url(#chestGrad)" />

          <rect x="48" y="36" width="104" height="56" rx="28" fill="url(#bodyGrad)" filter="url(#softShadow)" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
          <rect x="48" y="36" width="104" height="56" rx="28" fill="url(#glowGrad)" opacity="0.02" />

          <g>
            <ellipse cx="74" cy="60" rx="12" ry="13" fill="#0F172A" />
            <ellipse cx="74" cy="60" rx="9.5" ry="10.5" fill="url(#glowGrad)" opacity="0.9" />
            <ellipse cx="74" cy="60" rx="6.5" ry="7.5" fill="#60A5FA" opacity="0.4" />
            <circle cx="71" cy="56" r="4.5" fill="white" opacity="0.9" />
            <circle cx="76" cy="64" r="2.5" fill="white" opacity="0.3" />
            <ellipse cx="74" cy="60" rx="16" ry="17" fill="none" stroke="url(#glowGrad)" strokeWidth="1.5" opacity="0.12" filter="url(#glow)" />
          </g>

          <g>
            <ellipse cx="126" cy="60" rx="12" ry="13" fill="#0F172A" />
            <ellipse cx="126" cy="60" rx="9.5" ry="10.5" fill="url(#glowGrad)" opacity="0.9" />
            <ellipse cx="126" cy="60" rx="6.5" ry="7.5" fill="#60A5FA" opacity="0.4" />
            <circle cx="123" cy="56" r="4.5" fill="white" opacity="0.9" />
            <circle cx="128" cy="64" r="2.5" fill="white" opacity="0.3" />
            <ellipse cx="126" cy="60" rx="16" ry="17" fill="none" stroke="url(#glowGrad)" strokeWidth="1.5" opacity="0.12" filter="url(#glow)" />
          </g>

          <path d="M60 46 Q74 42 86 46" stroke="url(#glowGrad)" strokeWidth="1.5" strokeLinecap="round" opacity="0.08" />
          <path d="M114 46 Q126 42 140 46" stroke="url(#glowGrad)" strokeWidth="1.5" strokeLinecap="round" opacity="0.08" />

          <ellipse cx="58" cy="78" rx="7" ry="4" fill="url(#glowGrad)" opacity="0.08" />
          <ellipse cx="142" cy="78" rx="7" ry="4" fill="url(#glowGrad)" opacity="0.08" />

          <path d="M86 82 Q100 94 114 82" stroke="url(#glowGrad)" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.5" />
          <path d="M86 82 Q100 94 114 82" stroke="#60A5FA" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.12" filter="url(#glow)" />

          <rect x="90" y="90" width="20" height="12" rx="6" fill="#E2E8F0" />

          <rect x="82" y="108" width="36" height="22" rx="8" fill="#F8FAFC" stroke="rgba(79,70,229,0.06)" strokeWidth="1" filter="url(#softShadow)" />
          <circle cx="94" cy="119" r="3" fill="url(#glowGrad)" opacity="0.6" />
          <circle cx="106" cy="119" r="3" fill="url(#glowGrad)" opacity="0.3" />
          <circle cx="100" cy="114" r="1.5" fill="url(#glowGrad)" opacity="0.15" />

          <g>
            <rect x="28" y="70" width="24" height="12" rx="6" fill="url(#bodyGrad)" filter="url(#softShadow)" />
            <rect x="26" y="80" width="12" height="28" rx="6" fill="url(#bodyGrad)" filter="url(#softShadow)" />
            <circle cx="32" cy="110" r="9" fill="url(#bodyGrad)" filter="url(#softShadow)" />
            <line x1="32" y1="82" x2="32" y2="106" stroke="url(#glowGrad)" strokeWidth="1" opacity="0.06" />
          </g>

          <g style={{ animation: 'wave 2s ease-in-out infinite', transformOrigin: '150px 76px' }}>
            <rect x="148" y="70" width="24" height="12" rx="6" fill="url(#bodyGrad)" filter="url(#softShadow)" />
            <rect x="160" y="56" width="12" height="28" rx="6" fill="url(#bodyGrad)" filter="url(#softShadow)" />
            <circle cx="166" cy="54" r="9" fill="url(#bodyGrad)" filter="url(#softShadow)" />
            <circle cx="166" cy="46" r="4" fill="url(#bodyGrad)" />
            <circle cx="172" cy="50" r="4" fill="url(#bodyGrad)" />
            <circle cx="160" cy="50" r="4" fill="url(#bodyGrad)" />
            <circle cx="166" cy="55" r="3" fill="url(#bodyGrad)" />
            <line x1="166" y1="58" x2="166" y2="82" stroke="url(#glowGrad)" strokeWidth="1" opacity="0.06" />
          </g>

          <rect x="70" y="140" width="18" height="34" rx="7" fill="url(#bodyGrad)" filter="url(#softShadow)" />
          <rect x="66" y="170" width="26" height="10" rx="5" fill="url(#bodyGrad)" filter="url(#softShadow)" />
          <rect x="112" y="140" width="18" height="34" rx="7" fill="url(#bodyGrad)" filter="url(#softShadow)" />
          <rect x="108" y="170" width="26" height="10" rx="5" fill="url(#bodyGrad)" filter="url(#softShadow)" />

          <line x1="79" y1="144" x2="79" y2="168" stroke="url(#glowGrad)" strokeWidth="1" opacity="0.04" />
          <line x1="121" y1="144" x2="121" y2="168" stroke="url(#glowGrad)" strokeWidth="1" opacity="0.04" />
        </svg>
      </Box>
    </Box>
  );
}

export default function AIInsightsPage() {
  const [inputs, setInputs] = useState<Record<string, string>>({});

  const handleInputChange = (key: string, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const handleAction = (title: string) => {
    const key = title.toLowerCase().replace(/\s+/g, '-');
    console.log(`Action triggered: ${title}`, inputs[key]);
  };

  return (
    <Box sx={{ bgcolor: '#F8FAFC', minHeight: '100vh', pb: 6 }}>
      {/* Hero Banner */}
      <Card
        sx={{
          borderRadius: 2.5,
          background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #EC4899 100%)',
          height: 180,
          position: 'relative',
          overflow: 'hidden',
          mb: 3,
          boxShadow: '0 8px 32px rgba(79,70,229,0.25)',
        }}
      >
        <Box sx={{ position: 'absolute', top: '-40%', right: '-5%', width: '55%', height: '180%', background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 60%)', borderRadius: '50%' }} />
        <Box sx={{ position: 'absolute', bottom: '-30%', left: '30%', width: '40%', height: '100%', background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 60%)', borderRadius: '50%' }} />
        <Box sx={{ position: 'absolute', top: '10%', left: '15%', width: '20%', height: '80%', background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)', transform: 'skewX(-20deg)' }} />
        <Box sx={{ position: 'absolute', bottom: '20%', right: '25%', width: '15%', height: '60%', background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.03) 100%)', transform: 'skewX(15deg)' }} />

        <Box sx={{ position: 'absolute', top: '50%', left: '38%', width: 280, height: 280, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.06)', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', top: '50%', left: '38%', width: 220, height: 220, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.04)', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />

        <CardContent sx={{ p: '24px 28px', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 'auto' }}>
            <Button
              variant="contained"
              startIcon={<Download size={14} />}
              disableElevation
              sx={{
                borderRadius: 1.5, textTransform: 'none', fontWeight: 600, fontSize: '0.8rem', height: 34, px: 2.5,
                bgcolor: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(10px)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.25)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                transition: 'all 0.2s ease',
              }}
            >
              Export Report
            </Button>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, pb: 1 }}>
            <RobotIllustration />
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
                <Sparkles size={26} color="#FCD34D" />
                <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '2.625rem', letterSpacing: '-0.025em', lineHeight: 1.15 }}>
                  AI Insights
                </Typography>
              </Box>
              <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 400, fontSize: '1rem', lineHeight: 1.5, maxWidth: 480 }}>
                AI-powered test analysis, predictions, and recommendations
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Stats Cards Row */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {statCards.map((card) => (
          <Grid item xs={6} sm={3} key={card.label}>
            <Card
              sx={{
                borderRadius: 2.5,
                bgcolor: '#fff',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)',
                height: 112,
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'default',
                position: 'relative',
                overflow: 'visible',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0, left: 0, right: 0,
                  height: 3,
                  background: card.gradient,
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  opacity: 0,
                  transition: 'opacity 0.25s ease',
                },
                '&:hover': {
                  boxShadow: `0 4px 16px ${alpha(card.color, 0.12)}, 0 2px 8px rgba(0,0,0,0.04)`,
                  transform: 'translateY(-3px)',
                  '&::before': { opacity: 1 },
                },
              }}
            >
              <CardContent sx={{ p: '18px 20px', height: '100%', display: 'flex', flexDirection: 'column', '&:last-child': { pb: '18px' } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 'auto' }}>
                  <Typography sx={{ fontWeight: 500, color: '#94A3B8', fontSize: '0.7rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    {card.label}
                  </Typography>
                  <Box
                    sx={{
                      width: 34, height: 34, borderRadius: 1.5, bgcolor: card.lightBg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.color,
                      transition: 'all 0.25s ease',
                      '&:hover': { background: card.gradient, color: '#fff', transform: 'rotate(-8deg) scale(1.08)' },
                      '& svg': { width: 16, height: 16, strokeWidth: 2.2 },
                    }}
                  >
                    <card.icon />
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 1.5 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.75rem', color: '#0F172A', lineHeight: 1, letterSpacing: '-0.025em' }}>
                    {card.value}
                  </Typography>
                  {card.suffix && (
                    <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: card.color }}>
                      {card.suffix}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ height: 5, borderRadius: 3, bgcolor: alpha(card.color, 0.08), overflow: 'hidden' }}>
                  <Box
                    sx={{
                      width: `${card.value}%`, height: '100%', borderRadius: 3,
                      background: card.gradient,
                      transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Insights Section */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          {
            icon: BrainCircuit, color: '#4F46E5', accent: '#7C3AED',
            title: 'AI Insights', desc: 'No insights available',
            hint: 'Run tests to generate AI-powered insights',
            bgGrad: 'linear-gradient(135deg, rgba(79,70,229,0.03) 0%, rgba(124,58,237,0.01) 100%)',
            glowGrad: 'radial-gradient(circle at 50% 50%, rgba(79,70,229,0.08) 0%, transparent 70%)',
          },
          {
            icon: Lightbulb, color: '#D97706', accent: '#F59E0B',
            title: 'AI Recommendations', desc: 'No recommendations yet',
            hint: 'Analyze your tests to receive intelligent suggestions',
            bgGrad: 'linear-gradient(135deg, rgba(217,119,6,0.03) 0%, rgba(245,158,11,0.01) 100%)',
            glowGrad: 'radial-gradient(circle at 50% 50%, rgba(217,119,6,0.08) 0%, transparent 70%)',
          },
        ].map((item) => (
          <Grid item xs={12} md={6} key={item.title}>
            <Card
              sx={{
                borderRadius: 2.5,
                bgcolor: '#fff',
                background: item.bgGrad,
                boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)',
                height: 185,
                transition: 'all 0.25s ease',
                border: '1px solid',
                borderColor: alpha(item.color, 0.06),
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: '-50%', left: '-25%',
                  width: '80%', height: '200%',
                  background: item.glowGrad,
                  opacity: 0,
                  transition: 'opacity 0.4s ease',
                  pointerEvents: 'none',
                },
                '&:hover': {
                  boxShadow: `0 4px 16px ${alpha(item.color, 0.08)}, 0 2px 8px rgba(0,0,0,0.04)`,
                  transform: 'translateY(-2px)',
                  borderColor: alpha(item.color, 0.15),
                  '&::before': { opacity: 1 },
                },
              }}
            >
              <CardContent sx={{ p: '28px', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', '&:last-child': { pb: '28px' }, position: 'relative', zIndex: 1 }}>
                <Box
                  sx={{
                    width: 60, height: 60, borderRadius: 2.5,
                    background: `linear-gradient(135deg, ${alpha(item.color, 0.08)} 0%, ${alpha(item.accent, 0.04)} 100%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: alpha(item.color, 0.4), mb: 2, position: 'relative',
                    '&::after': {
                      content: '""',
                      position: 'absolute', inset: -3,
                      borderRadius: 3,
                      border: '1.5px dashed',
                      borderColor: alpha(item.color, 0.1),
                    },
                    '& svg': { width: 28, height: 28 },
                  }}
                >
                  <item.icon />
                </Box>
                <Typography sx={{ fontWeight: 600, color: '#1E293B', fontSize: '0.95rem', mb: 0.5 }}>
                  {item.title}
                </Typography>
                <Typography sx={{ color: alpha('#64748B', 0.6), fontWeight: 400, fontSize: '0.8rem', textAlign: 'center', mb: 0.25 }}>
                  {item.desc}
                </Typography>
                <Typography sx={{ color: alpha('#94A3B8', 0.5), fontWeight: 400, fontSize: '0.7rem', textAlign: 'center', maxWidth: 220 }}>
                  {item.hint}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* AI Actions Section */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Box
          sx={{
            width: 30, height: 30, borderRadius: 1.5,
            background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            '& svg': { width: 16, height: 16 },
          }}
        >
          <Zap />
        </Box>
        <Typography sx={{ fontWeight: 700, color: '#0F172A', fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
          AI Actions
        </Typography>
        <Box sx={{ flex: 1, height: 1, bgcolor: alpha('#E2E8F0', 0.6), ml: 1 }} />
      </Box>

      <Grid container spacing={2.5}>
        {actionCards.map((card) => {
          const key = card.title.toLowerCase().replace(/\s+/g, '-');
          const IconComp = card.icon;
          return (
            <Grid item xs={12} sm={6} key={key}>
              <Card
                sx={{
                  borderRadius: 2.5,
                  bgcolor: '#fff',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'visible',
                  border: '1px solid',
                  borderColor: alpha(card.color, 0.04),
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0, left: 20, right: 20,
                    height: 3,
                    background: card.gradient,
                    borderBottomLeftRadius: 4,
                    borderBottomRightRadius: 4,
                    opacity: 0,
                    transition: 'opacity 0.25s ease, left 0.25s ease, right 0.25s ease',
                  },
                  '&:hover': {
                    boxShadow: `0 4px 20px ${alpha(card.color, 0.1)}, 0 2px 8px rgba(0,0,0,0.04)`,
                    transform: 'translateY(-3px)',
                    borderColor: alpha(card.color, 0.12),
                    '&::before': { opacity: 1, left: 0, right: 0 },
                  },
                }}
              >
                <CardContent sx={{ p: '24px', '&:last-child': { pb: '24px' } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Box
                      sx={{
                        width: 40, height: 40, borderRadius: 2, bgcolor: alpha(card.color, 0.08),
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.color,
                        flexShrink: 0, '& svg': { width: 20, height: 20 },
                      }}
                    >
                      <IconComp />
                    </Box>
                    <Box>
                      <Typography sx={{ fontWeight: 600, color: '#0F172A', fontSize: '0.92rem' }}>
                        {card.title}
                      </Typography>
                      <Typography sx={{ color: '#94A3B8', fontWeight: 400, fontSize: '0.78rem', mt: 0.15 }}>
                        {card.description}
                      </Typography>
                    </Box>
                  </Box>

                  <TextField
                    fullWidth
                    multiline={card.multiline}
                    rows={card.multiline ? 2 : 1}
                    size="small"
                    placeholder={card.placeholder}
                    value={inputs[key] || ''}
                    onChange={(e) => handleInputChange(key, e.target.value)}
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        bgcolor: card.multiline ? alpha(card.color, 0.015) : '#fff',
                        fontSize: '0.82rem',
                        height: card.multiline ? 'auto' : 44,
                        fontFamily: card.multiline ? '"Cascadia Code", "Fira Code", monospace' : undefined,
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: alpha('#E2E8F0', 0.8),
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(card.color, 0.3) },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: card.color, borderWidth: '1.5px' },
                      },
                    }}
                  />

                  <Button
                    variant="contained"
                    disableElevation
                    endIcon={<ArrowRight size={14} />}
                    onClick={() => handleAction(card.title)}
                    disabled={!(inputs[key] || '').trim()}
                    fullWidth
                    sx={{
                      borderRadius: 2, textTransform: 'none', fontWeight: 600, fontSize: '0.82rem', height: 44,
                      bgcolor: card.color, color: '#fff',
                      '&:hover': { bgcolor: alpha(card.color, 0.88) },
                      '&:disabled': { bgcolor: alpha('#94A3B8', 0.1), color: alpha('#94A3B8', 0.4) },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {card.buttonLabel}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
