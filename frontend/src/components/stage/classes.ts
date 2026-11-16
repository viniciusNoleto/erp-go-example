// As partes que o cartão do lançamento e o da recusa repetem.
export const stageClasses = {
  head: 'flex items-start justify-between gap-3',
  title: 'text-14 font-semibold',
  memo: 'mt-0.5 text-13 text-muted',
  note: 'mt-3 border-t border-rule pt-2.5 text-13 leading-[1.45] text-muted [&_strong]:font-semibold [&_strong]:text-ink',
  /** Uma conta da partida: o lado (débito ou crédito) em cima, pequeno, e o nome. */
  account: 'text-13 leading-[1.35] [&_small]:block [&_small]:text-12 [&_small]:text-muted',
  /** O miolo da partida: o valor e, embaixo, o traço desenhado. */
  middle: 'relative text-center [&_svg]:block [&_svg]:h-11 [&_svg]:w-full [&_svg]:overflow-visible',
} as const;
