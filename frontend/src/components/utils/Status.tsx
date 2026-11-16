import { Badge } from '@mantine/core';
import type { ReactNode } from 'react';

/**
 * Selos de situação: fundo pálido e texto escuro da mesma cor. Quatro estados
 * só, e um selo por linha:
 *  - wait: pede uma ação (a receber, a pagar, reservado)
 *  - ok:   resolvido (recebida, paga, efetivado)
 *  - off:  neutro (cancelado, reserva já resolvida)
 *  - bad:  recusa, esgotado
 */
const TONES = {
  wait: { bg: '#fdf3dc', fg: '#6b4a06' },
  ok: { bg: '#e3f4e6', fg: '#14451b' },
  off: { bg: '#eeede9', fg: '#3e3c38' },
  bad: { bg: '#fdeceb', fg: '#831c1e' },
} as const;

export type StatusTone = keyof typeof TONES;

export function UtilsStatus({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  const colors = TONES[tone];

  return (
    <Badge
      styles={{ root: { background: colors.bg, color: colors.fg } }}
      size="md"
    >
      {children}
    </Badge>
  );
}
