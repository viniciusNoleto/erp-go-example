'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import type { IPosting } from '@/resources/posting/models/Posting';
import { ApiError } from '@/utils/appClient';

import { useStage } from './StageProvider';

type UsePostingMutationOptions<TIn, TOut> = {
  mutationFn: (input: TIn) => Promise<TOut>;
  /** Onde está o lançamento na resposta (a venda devolve { sale, posting }). */
  pickPosting: (out: TOut) => IPosting;
  /** Depois de gravar, ou de o razão recusar: fechar a gaveta, limpar o formulário. */
  onSettled?: () => void;
};

/**
 * Toda mutação que gera lançamento segue o mesmo roteiro:
 *  - deu certo: toca a cena no palco (que também recarrega as consultas);
 *  - o razão ou o estoque recusou: toca a cena de recusa;
 *  - dado inválido: guarda a mensagem em `postingError` para o formulário mostrar.
 *
 * Os logics de resources/{sale,purchase,entry} usam este hook no lugar do
 * useMutation puro; ele devolve o próprio objeto do useMutation.
 */
export function usePostingMutation<TIn = void, TOut = unknown>({ mutationFn, pickPosting, onSettled }: UsePostingMutationOptions<TIn, TOut>) {
  const { play, refuse } = useStage();
  const [postingError, setPostingError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn,
    onMutate: () => setPostingError(null),
    onSuccess: (out) => {
      play(pickPosting(out));
      onSettled?.();
    },
    onError: (err) => {
      if (err instanceof ApiError && err.refused) {
        refuse(err.message);
        onSettled?.();
        return;
      }

      setPostingError(err.message);
    },
  });

  return {
    ...mutation,
    postingError,
    clearPostingError: () => setPostingError(null),
  };
}
