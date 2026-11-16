import { IconAlertTriangle, IconCircleCheck } from '@tabler/icons-react';
import type { ReactNode } from 'react';

import { UtilsIf } from './If';

/**
 * O ícone da prova de que os números fecham: o visto verde quando confere, o
 * alerta vermelho quando não. O texto ao lado fica com quem usa.
 */
export function UtilsProofIcon({ ok, className }: { ok: boolean; className?: string }) {
  return (
    <UtilsIf
      cases={[
        {
          condition: ok,
          content: () => (
            <IconCircleCheck
              size={16}
              stroke={1.6}
              className={`flex-none text-positive ${className ?? ''}`}
            />
          ),
        },
        {
          content: () => (
            <IconAlertTriangle
              size={16}
              stroke={1.6}
              className={`flex-none text-negative ${className ?? ''}`}
            />
          ),
        },
      ]}
    />
  );
}

/** O bloco cinza da prova, no pé de um painel: o ícone e uma frase. */
export function UtilsProof({ ok, className, children }: { ok: boolean; className: string; children: ReactNode }) {
  return (
    <p className={className}>
      <UtilsProofIcon ok={ok} />

      <span>
        {children}
      </span>
    </p>
  );
}
