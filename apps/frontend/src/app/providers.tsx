'use client';

import { Providers } from '@/components/providers/Providers';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>;
}