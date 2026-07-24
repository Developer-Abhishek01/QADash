import CheckCircle from '@mui/icons-material/CheckCircle';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import HourglassEmpty from '@mui/icons-material/HourglassEmpty';
import { Chip, type ChipProps } from '@mui/material';

const STATUS_CONFIG: Record<string, { color: ChipProps['color']; icon: typeof CheckCircle; label: string }> = {
  active: { color: 'success', icon: CheckCircle, label: 'Active' },
  idle: { color: 'default', icon: HourglassEmpty, label: 'Idle' },
  offline: { color: 'error', icon: ErrorOutline, label: 'Offline' },
};

interface Props {
  status: string;
}

export function WorkerStatusChip({ status }: Props) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.offline;
  const Icon = config.icon;
  return <Chip icon={<Icon />} label={config.label} color={config.color} size="small" variant="outlined" />;
}
