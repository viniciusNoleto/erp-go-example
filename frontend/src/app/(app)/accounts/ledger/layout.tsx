import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/** O título da aba ("Razonete | GoMoney"): a página é client component, então o metadata mora aqui. */
export const metadata: Metadata = { title: 'Razonete' };

export default function AccountLedgerLayout({ children }: { children: ReactNode }) {
  return children;
}
