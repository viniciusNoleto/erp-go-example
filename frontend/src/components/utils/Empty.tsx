import type { ReactNode } from 'react';

/** Um bloco vazio mantém a moldura e diz, numa frase, o que vai aparecer ali. */
export function UtilsEmpty({ children }: { children: ReactNode }) {
  return (
    <p className="mx-6 mb-5 rounded-md border border-dashed border-control px-3.5 py-2.75 text-14 text-muted max-sm:mx-4 max-sm:mb-4">
      {children}
    </p>
  );
}
