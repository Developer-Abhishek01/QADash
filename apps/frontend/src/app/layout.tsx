import type { Metadata } from 'next';
import '../styles/globals.css';
import { ClientProviders } from './providers';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'QA Dashboard',
  description: 'Enterprise QA Dashboard Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}