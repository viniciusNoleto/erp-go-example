'use client';

import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { UtilsIf } from '@/components/utils/If';
import type { IPosting } from '@/resources/posting/models/Posting';

import { StagePostingCard } from './PostingCard';
import { StageRefusalCard } from './RefusalCard';

/**
 * O palco é onde cada lançamento "acontece" na tela: um cartão no canto em que
 * o débito e o crédito são ligados por um traço de pena, com o sinal próprio
 * do tipo de lançamento desenhado em ouro no fim.
 *
 * Um lançamento chega aqui por dois caminhos:
 *  - a resposta da mutação que o próprio usuário disparou (play);
 *  - o Server-Sent Events da API, quando outra aba ou outra pessoa lançou.
 * O mesmo id chegando pelos dois caminhos é tocado uma vez só.
 */

type StageItem = {
  key: string;
  posting?: IPosting;
  refusal?: string;
};

type StageApi = {
  /** Toca a animação de um lançamento gravado. */
  play: (posting: IPosting) => void;
  /** Toca a animação de recusa (o razão ou o estoque disseram não). */
  refuse: (message: string) => void;
  /** Lançamentos recém-gravados: as tabelas destacam essas linhas. */
  fresh: ReadonlySet<string>;
  /** A conexão ao vivo com a API está aberta? */
  live: boolean;
};

const StageContext = createContext<StageApi | null>(null);

export function useStage(): StageApi {
  const ctx = useContext(StageContext);

  if (!ctx) throw new Error('useStage fora do StageProvider');

  return ctx;
}

const EASE = [0.22, 1, 0.36, 1] as const;

export function StageProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<StageItem[]>([]);
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());
  const [live, setLive] = useState(false);
  const seen = useRef(new Set<string>());

  const dismiss = useCallback((key: string) => setItems((list) => list.filter((item) => item.key !== key)), []);

  const push = useCallback(
    (item: StageItem, ms: number) => {
      setItems((list) => [...list.slice(-2), item]);
      window.setTimeout(() => dismiss(item.key), ms);
    },
    [dismiss],
  );

  const play = useCallback(
    (posting: IPosting) => {
      if (seen.current.has(posting.id)) return;

      seen.current.add(posting.id);
      // Qualquer lançamento muda saldos, listas e gráficos: tudo é recarregado.
      queryClient.invalidateQueries();

      const postingIds = posting.entries.map((entry) => entry.postingId);
      setFresh((set) => new Set([...set, ...postingIds]));
      window.setTimeout(() => setFresh((set) => new Set([...set].filter((id) => !postingIds.includes(id)))), 4000);

      push({ key: posting.id, posting }, posting.entries.length > 1 ? 8500 : 7000);
    },
    [push, queryClient],
  );

  const refuse = useCallback((message: string) => push({ key: `refusal-${Date.now()}`, refusal: message }, 7500), [push]);

  useEffect(() => {
    const source = new EventSource('/api/events');
    source.onopen = () => setLive(true);
    // O EventSource reconecta sozinho.
    source.onerror = () => setLive(false);
    source.addEventListener('posting', (event) => play(JSON.parse((event as MessageEvent).data) as IPosting));

    return () => source.close();
  }, [play]);

  const value = useMemo(() => ({ play, refuse, fresh, live }), [play, refuse, fresh, live]);

  return (
    <StageContext.Provider value={value}>
      {children}

      {/* O palco: os cartões dos lançamentos, empilhados no canto inferior direito. */}
      <div
        className="pointer-events-none fixed right-6 bottom-6 z-300 flex w-[min(420px,calc(100vw-32px))] flex-col gap-3 max-sm:right-4 max-sm:bottom-4"
        aria-live="polite"
      >
        {/* Aqui é .map() e não UtilsFor: o AnimatePresence precisa dos motion.div com key como filhos diretos para animar a saída. */}
        <AnimatePresence>
          {items.map((item) => (
            <motion.div
              key={item.key}
              layout
              // Flutua de verdade, por cima da tela: é o único cartão com sombra.
              className="pointer-events-auto rounded-md border border-line bg-surface px-4.5 pt-4 pb-3.5 shadow-float"
              initial={{ opacity: 0, y: 24 }}
              animate={item.refusal ? { opacity: 1, y: 0, x: [0, 0, -6, 6, -4, 4, 0] } : { opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12, transition: { duration: 0.2 } }}
              transition={item.refusal ? { duration: 0.45, ease: EASE, x: { delay: 1.15, duration: 0.45 } } : { duration: 0.45, ease: EASE }}
            >
              <UtilsIf
                cases={[
                  {
                    condition: !!item.posting,
                    content: () => (
                      <StagePostingCard
                        posting={item.posting!}
                        onClose={() => dismiss(item.key)}
                      />
                    ),
                  },
                  {
                    content: () => (
                      <StageRefusalCard
                        message={item.refusal!}
                        onClose={() => dismiss(item.key)}
                      />
                    ),
                  },
                ]}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </StageContext.Provider>
  );
}
