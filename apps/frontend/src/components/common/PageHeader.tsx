'use client';

import { Box, Typography, Breadcrumbs, Link } from '@mui/material';
import { Home as HomeIcon, NavigateNext } from '@mui/icons-material';
import { useAppSelector } from '@/lib/hooks/useRedux';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function PageHeader({ title, subtitle, breadcrumbs, actions, children }: PageHeaderProps) {
  const uiBreadcrumbs = useAppSelector((state) => state.ui.breadcrumbs);

  const displayBreadcrumbs = breadcrumbs || uiBreadcrumbs;

  return (
    <Box sx={{ mb: 3 }}>
      {displayBreadcrumbs && displayBreadcrumbs.length > 0 && (
        <Breadcrumbs separator={<NavigateNext fontSize="small" />} sx={{ mb: 1 }}>
          <Link
            underline="hover"
            color="inherit"
            href="/"
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <HomeIcon sx={{ mr: 0.5, fontSize: 20 }} />
            Home
          </Link>
          {displayBreadcrumbs.map((item, index) => (
            <Link
              key={index}
              underline="hover"
              color={index === displayBreadcrumbs.length - 1 ? 'text.primary' : 'inherit'}
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </Breadcrumbs>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight={600}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>

        {actions && <Box>{actions}</Box>}
      </Box>

      {children && <Box sx={{ mt: 2 }}>{children}</Box>}
    </Box>
  );
}

export default PageHeader;