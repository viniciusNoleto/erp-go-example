'use client';

import type { ReactNode } from 'react';

import { AppFrame } from '@/components/layout/AppFrame';
import { StageProvider } from '@/components/stage/StageProvider';

/** Todas as telas de trabalho: o palco dos lançamentos por fora, a casca por dentro. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <StageProvider>
      <AppFrame>
        {children}
      </AppFrame>
    </StageProvider>
  );
}
