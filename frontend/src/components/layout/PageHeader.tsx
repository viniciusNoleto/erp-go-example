import { IconArrowLeft } from '@tabler/icons-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { UtilsIf } from '@/components/utils/If';

type AppPageHeaderProps = {
  title: string;
  /** A frase sobre os dados, com o fato que mais importa em <strong>. */
  children?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
};

/**
 * O cabeçalho de cada tela: o nome da tela (h1, no serifado da marca) e uma
 * frase sobre os dados, com o fato que mais importa em negrito. À direita, só
 * ações de verdade: a principal em tinta, as outras em cinza.
 *
 * O título, os títulos dos painéis e os números começam na mesma linha: o
 * cabeçalho entra o mesmo tanto (24px) que o conteúdo dos painéis.
 */
export function AppPageHeader({ title, children, actions, back }: AppPageHeaderProps) {
  return (
    <header className="mb-6 flex items-end justify-between gap-6 px-6 max-sm:mb-4 max-sm:flex-col max-sm:items-stretch max-sm:gap-4 max-sm:px-0">
      <div>
        <UtilsIf condition={back}>
          {() => (
            <Link
              className="mb-2 inline-flex items-center gap-1 text-13 text-muted hover:text-ink"
              href={back!.href}
            >
              <IconArrowLeft
                size={14}
                stroke={1.6}
              />

              {back!.label}
            </Link>
          )}
        </UtilsIf>

        <h1 className="font-serif text-32 leading-[1.1] font-normal tracking-[-0.01em] max-sm:text-28">
          {title}
        </h1>

        <UtilsIf condition={children}>
          {() => (
            <p className="mt-2 max-w-[68ch] text-15 leading-normal text-muted [&_strong]:font-semibold [&_strong]:text-ink">
              {children}
            </p>
          )}
        </UtilsIf>
      </div>

      <UtilsIf condition={actions}>
        {() => (
          <div className="flex flex-none gap-2 max-sm:*:flex-1">
            {actions}
          </div>
        )}
      </UtilsIf>
    </header>
  );
}
