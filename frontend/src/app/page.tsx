import type { Metadata } from 'next';

import { Presentation } from './_components/Presentation';

export const metadata: Metadata = {
  // O template do layout raiz não vale para a página do mesmo segmento: o título vai completo.
  title: { absolute: 'Apresentação | GoMoney' },
};

export default function Home() {
  return <Presentation />;
}
