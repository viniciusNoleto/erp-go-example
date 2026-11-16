import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

import { fontSizes } from '../tokens';

/*
 * O tailwind-merge precisa saber que text-13, text-24… são tamanhos de texto
 * (a escala do GoMoney, em tailwind.config.mts). Sem isso ele os confunde com
 * cores e, ao juntar "text-13 text-muted", jogaria um dos dois fora.
 */
const merge = extendTailwindMerge({
  extend: { theme: { text: fontSizes.map(String) } },
});

/** Junta classes condicionais (clsx) e resolve os conflitos do Tailwind (a última vence). */
export function cn(...inputs: ClassValue[]): string {
  return merge(clsx(inputs));
}
