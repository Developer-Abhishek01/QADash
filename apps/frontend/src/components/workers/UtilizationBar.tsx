import { Box, Typography, LinearProgress } from '@mui/material';

interface Props {
  label: string;
  value: number;
  errorThreshold?: number;
  warningThreshold?: number;
}

export function UtilizationBar({ label, value, errorThreshold = 80, warningThreshold = 60 }: Props) {
  const color = value >= errorThreshold ? 'error' : value >= warningThreshold ? 'warning' : 'primary';
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption">{label}</Typography>
        <Typography variant="caption">{value}%</Typography>
      </Box>
      <LinearProgress variant="determinate" value={Math.min(value, 100)} color={color} />
    </Box>
  );
}
