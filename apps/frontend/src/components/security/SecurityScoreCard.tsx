'use client';

import { Shield } from '@mui/icons-material';
import { Box, Card, CardContent, Typography, LinearProgress, Tooltip } from '@mui/material';

function calculateScore(stats: { critical: number; high: number; medium: number; low: number; info: number }): { score: number; label: string; color: string } {
  const total = stats.critical + stats.high + stats.medium + stats.low + stats.info;
  if (total === 0) return { score: 100, label: 'Excellent', color: '#10b981' };

  const weightedScore = Math.max(0, 100 - (
    stats.critical * 15 +
    stats.high * 8 +
    stats.medium * 4 +
    stats.low * 2 +
    stats.info * 0.5
  ));

  if (weightedScore >= 90) return { score: weightedScore, label: 'Excellent', color: '#10b981' };
  if (weightedScore >= 70) return { score: weightedScore, label: 'Good', color: '#3b82f6' };
  if (weightedScore >= 50) return { score: weightedScore, label: 'Fair', color: '#f59e0b' };
  if (weightedScore >= 30) return { score: weightedScore, label: 'Poor', color: '#ea580c' };
  return { score: weightedScore, label: 'Critical', color: '#dc2626' };
}

interface SecurityScoreCardProps {
  vulnerabilitiesBySeverity?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
}

export function SecurityScoreCard({ vulnerabilitiesBySeverity }: SecurityScoreCardProps) {
  if (!vulnerabilitiesBySeverity) return null;

  const { score, label, color } = calculateScore(vulnerabilitiesBySeverity);

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Shield sx={{ fontSize: 40, color }} />
          <Box>
            <Typography variant="h3" fontWeight="bold" color={color}>
              {Math.round(score)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Security Score - {label}
            </Typography>
          </Box>
        </Box>
        <Tooltip title={`${Math.round(score)}/100`}>
          <LinearProgress
            variant="determinate"
            value={score}
            sx={{
              height: 10,
              borderRadius: 5,
              bgcolor: '#e5e7eb',
              '& .MuiLinearProgress-bar': {
                bgcolor: color,
              },
            }}
          />
        </Tooltip>
        <Box display="flex" justifyContent="space-between" mt={1}>
          <Typography variant="caption" color="text.secondary">0</Typography>
          <Typography variant="caption" color="text.secondary">100</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default SecurityScoreCard;
