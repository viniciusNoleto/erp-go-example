import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/** O título da aba ("Compras | GoMoney"): a página é client component, então o metadata mora aqui. */
export const metadata: Metadata = { title: 'Compras' };

export default function PurchasesLayout({ children }: { children: ReactNode }) {
  return children;
}
