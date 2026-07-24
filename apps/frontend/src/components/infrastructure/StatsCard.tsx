import { Card, CardContent, Typography, Box } from '@mui/material';

interface StatItem {
  label: string;
  value: string | number;
  color?: string;
}

interface Props {
  title: string;
  icon: React.ReactNode;
  stats: StatItem[];
}

export function StatsCard({ title, icon, stats }: Props) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          {icon}
          <Typography variant="h6">{title}</Typography>
        </Box>
        {stats.map((stat) => (
          <Box key={stat.label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">{stat.label}</Typography>
            <Typography variant="body2" fontWeight={600} color={stat.color}>{stat.value}</Typography>
          </Box>
        ))}
      </CardContent>
    </Card>
  );
}
