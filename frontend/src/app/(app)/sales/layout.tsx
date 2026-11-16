import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/** O título da aba ("Vendas | GoMoney"): a página é client component, então o metadata mora aqui. */
export const metadata: Metadata = { title: 'Vendas' };

export default function SalesLayout({ children }: { children: ReactNode }) {
  return children;
}
