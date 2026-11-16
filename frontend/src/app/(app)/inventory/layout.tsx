import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/** O título da aba ("Estoque | GoMoney"): a página é client component, então o metadata mora aqui. */
export const metadata: Metadata = { title: 'Estoque' };

export default function InventoryLayout({ children }: { children: ReactNode }) {
  return children;
}
