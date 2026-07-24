import CheckCircle from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import Warning from '@mui/icons-material/Warning';
import { Chip } from '@mui/material';

const STATUS_CONFIG: Record<string, { color: 'success' | 'warning' | 'error'; icon: typeof CheckCircle; label: string }> = {
  healthy: { color: 'success', icon: CheckCircle, label: 'Healthy' },
  degraded: { color: 'warning', icon: Warning, label: 'Degraded' },
  unhealthy: { color: 'error', icon: ErrorIcon, label: 'Unhealthy' },
};

interface Props {
  status: string;
}

export function HealthStatusChip({ status }: Props) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.unhealthy;
  const Icon = config.icon;
  return <Chip icon={<Icon />} label={config.label} color={config.color} size="small" variant="outlined" />;
}
