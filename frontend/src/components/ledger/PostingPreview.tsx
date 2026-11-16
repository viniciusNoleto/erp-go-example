import { Text } from '@mantine/core';
import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

/** O bloco "o que será lançado no razão" dentro da gaveta: uma ou mais LedgerLegPreview. */
export function LedgerPostingPreview({ title, className, children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-md bg-raised px-4 pt-3 pb-1', className)}>
      <Text
        size="sm"
        fw={500}
        mb={6}
      >
        {title}
      </Text>

      {children}
    </div>
  );
}
