'use client';

import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { resolver, theme } from '@/theme';

/**
 * O que o app inteiro compartilha no navegador: o tema do Mantine (sempre
 * claro; a página de apresentação pinta o próprio fundo escuro) e o cache do
 * React Query, para toda tela usar as mesmas consultas.
 */
export function Providers({ children }: { children: ReactNode }) {
  // useState: um QueryClient por aba, criado uma vez (e não a cada render).
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 5_000, refetchOnWindowFocus: false, retry: 1 } } }));

  return (
    <MantineProvider
      theme={theme}
      cssVariablesResolver={resolver}
      forceColorScheme="light"
    >
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </MantineProvider>
  );
}
