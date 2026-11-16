'use client';

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

import { cn } from '@/utils/cn';

import { UtilsIf } from './If';

type Props = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Texto completo do title; por padrão, o texto que está dentro. */
  title?: string;
};

/**
 * Texto de uma linha que termina em reticências quando não cabe. Quando é
 * cortado, o conteúdo passa a ficar dentro de um <abbr title="…"> com o texto
 * inteiro, para que passar o mouse mostre o que ficou escondido.
 *
 * O <span> de fora é sempre o mesmo: é ele que corta e é ele que é medido.
 * Trocar o próprio elemento medido (span ↔ abbr) recriava o nó a cada troca e
 * podia fazer a medida oscilar sem fim.
 */
export function UtilsClip({ children, className, style, title }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [full, setFull] = useState<string | null>(null);
  // A medida mais recente, para o ResizeObserver chamar sem recriar o observer.
  const measure = useRef(() => {});

  measure.current = () => {
    const el = ref.current;
    if (!el) return;
    const cut = el.scrollWidth > el.clientWidth;
    const text = (title ?? el.textContent ?? '').replace(/\s+/g, ' ').trim();
    const next = cut && text ? text : null;
    setFull((prev) => (prev === next ? prev : next));
  };

  // A cada render: o texto pode mudar sem o tamanho mudar.
  useLayoutEffect(() => measure.current());

  // A cada mudança de tamanho: janela, colunas da tabela.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => measure.current());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    // Uma linha só; o que não couber vira reticências.
    <span
      ref={ref}
      className={cn('block min-w-0 truncate', className)}
      style={style}
    >
      <UtilsIf
        cases={[
          {
            condition: !!full,
            // Cortado: sem o pontilhado padrão do <abbr>, mas o cursor avisa que há mais.
            content: () => (
              <abbr
                className="cursor-help no-underline"
                title={full!}
              >
                {children}
              </abbr>
            ),
          },
          {
            content: () => children,
          },
        ]}
      />
    </span>
  );
}
