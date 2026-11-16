import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/** O título da aba ("Lançamentos | GoMoney"): a página é client component, então o metadata mora aqui. */
export const metadata: Metadata = { title: 'Lançamentos' };

export default function JournalLayout({ children }: { children: ReactNode }) {
  return children;
}
