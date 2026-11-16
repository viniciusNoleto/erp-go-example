// O único CSS do app: Tailwind, o Mantine (em camada) e as fontes entram por ele.
import '@/styles/globals.css';

import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { colors } from '@/tokens';

import { Providers } from './providers';

export const metadata: Metadata = {
  title: { default: 'GoMoney', template: '%s | GoMoney' },
  description: 'ERP com livro-razão de partidas dobradas em Go e TigerBeetle.',
  icons: { icon: '/mark.svg' },
};

export const viewport: Viewport = { themeColor: colors.ground };

/*
 * O layout raiz é um Server Component: só monta o <html>. Tudo que precisa do
 * navegador (Mantine, React Query, o palco dos lançamentos) mora nos
 * Providers e nos layouts de cada parte.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="pt-BR"
      {...mantineHtmlProps}
    >
      <head>
        <ColorSchemeScript forceColorScheme="light" />
      </head>

      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
