import { Box, Typography, LinearProgress } from '@mui/material';

interface Props {
  label: string;
  value: number;
  subtitle?: string;
  errorThreshold?: number;
  warningThreshold?: number;
}

export function ResourceGauge({ label, value, subtitle, errorThreshold = 90, warningThreshold = 75 }: Props) {
  const color = value >= errorThreshold ? 'error' : value >= warningThreshold ? 'warning' : 'primary';
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="body2" fontWeight={600}>{label}</Typography>
        <Typography variant="body2" fontWeight={600}>{value}%</Typography>
      </Box>
      <LinearProgress variant="determinate" value={Math.min(value, 100)} color={color} sx={{ height: 10, borderRadius: 5 }} />
      {subtitle && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>{subtitle}</Typography>
      )}
    </Box>
  );
}
