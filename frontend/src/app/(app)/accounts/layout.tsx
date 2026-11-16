import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/**
 * O título da aba ("Plano de contas | GoMoney"): a página é client component, então o metadata mora aqui.
 * Um título em texto puro cortaria o template do layout raiz para o razonete (filho desta rota); por isso
 * o template é repetido.
 */
export const metadata: Metadata = { title: { default: 'Plano de contas', template: '%s | GoMoney' } };

export default function AccountsLayout({ children }: { children: ReactNode }) {
  return children;
}
