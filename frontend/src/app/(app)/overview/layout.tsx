import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/** O título da aba ("Visão geral | GoMoney"): a página é client component, então o metadata mora aqui. */
export const metadata: Metadata = { title: 'Visão geral' };

export default function OverviewLayout({ children }: { children: ReactNode }) {
  return children;
}
