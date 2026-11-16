import { Paper } from '@mantine/core';
import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

import { UtilsIf } from './If';

type UtilsPanelProps = {
  title?: string;
  /** A nota à direita do título: período, contagem ou link. */
  meta?: ReactNode;
  children: ReactNode;
  /** Sem o recuo interno: tabelas e listas que vão de borda a borda. */
  flush?: boolean;
  className?: string;
  /** Nome acessível quando o painel não tem título visível. */
  label?: string;
};

/** Um bloco da tela: título, uma nota à direita e o conteúdo. */
export function UtilsPanel({ title, meta, children, flush, className, label }: UtilsPanelProps) {
  return (
    <Paper
      component="section"
      className={cn('flex min-w-0 flex-col bg-surface', className)}
      aria-label={title ? undefined : label}
    >
      <UtilsIf condition={title || meta}>
        {() => (
          <div className="flex items-baseline justify-between gap-4 px-6 pt-4.5 pb-3.5 max-sm:px-4 max-sm:pt-4 max-sm:pb-3">
            <UtilsIf condition={title}>
              {() => (
                <h2 className="text-16 leading-[1.4] font-semibold">
                  {title}
                </h2>
              )}
            </UtilsIf>

            <UtilsIf condition={meta}>
              {() => (
                <div className="text-13 whitespace-nowrap text-muted">
                  {meta}
                </div>
              )}
            </UtilsIf>
          </div>
        )}
      </UtilsIf>

      <UtilsIf
        cases={[
          {
            condition: !!flush,
            content: () => children,
          },
          {
            content: () => (
              <div className="flex flex-1 flex-col px-6 pb-5 max-sm:px-4 max-sm:pb-4">
                {children}
              </div>
            ),
          },
        ]}
      />
    </Paper>
  );
}
