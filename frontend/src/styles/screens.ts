import { cn } from '@/utils/cn';

/*
 * As peças das telas de trabalho, em classes do Tailwind. São constantes (e
 * não componentes) porque cada tela as combina do seu jeito no próprio JSX.
 */

const row = 'grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-rule px-6 py-2 max-sm:px-4';
const kv = 'flex items-baseline justify-between gap-4 py-1.75 text-14 [&>dt]:text-muted [&>dd]:whitespace-nowrap [&>dd]:tabular-nums';
const equation =
  'grid grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)_40px_minmax(0,1fr)_40px_minmax(0,1fr)] items-end px-6 pt-4.5 pb-4 max-md:grid-cols-[24px_minmax(0,1fr)] max-md:items-baseline max-md:gap-y-2.5 max-md:p-4';

export const s = {
  /*
   * As grades das telas. Uma régua só: 12 colunas, 16px entre tudo.
   * A 1440px: conteúdo 1128 = 12 × 80,67 + 11 × 16. Abaixo de lg, tudo empilha.
   */
  grid: 'grid grid-cols-12 items-stretch gap-4',
  span12: 'col-span-12',
  span8: 'col-span-8 max-lg:col-span-12',
  span6: 'col-span-6 max-lg:col-span-12',
  span4: 'col-span-4 max-lg:col-span-12',

  // ---------- saldos como abas do gráfico ----------
  tabs: 'mx-6 grid grid-cols-4 border-b border-line max-sm:mx-3 max-sm:grid-cols-2 max-sm:gap-1 max-sm:border-b-0',
  /** Uma aba. No celular vira um botão cinza quando escolhida. */
  tab: [
    'group -mb-px min-w-0 cursor-pointer border-b-2 border-transparent pt-4.5 pr-4 pb-3.5 text-left',
    '[&+&]:border-l [&+&]:border-l-rule [&+&]:pl-4',
    'focus-visible:rounded-xs focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink',
    'aria-selected:border-b-ink',
    'max-sm:m-0 max-sm:rounded-sm max-sm:border-0 max-sm:px-3 max-sm:py-2.5 max-sm:[&+&]:border-0 max-sm:[&+&]:pl-3 max-sm:aria-selected:bg-active',
  ].join(' '),
  tabLabel: 'block text-13 text-muted group-aria-selected:font-medium group-aria-selected:text-ink',
  tabValue: 'mt-1 text-24 leading-[1.2] font-medium group-aria-selected:font-semibold max-sm:text-18',
  tabNote: 'mt-0.5 text-13 text-muted',
  chartWrap: 'px-6 pt-5 pb-4 max-sm:p-3',

  // ---------- chave e valor (resultado, saldos da conta) ----------
  kv,
  /** A linha do total: filete em cima e o valor em negrito. Já inclui o kv. */
  kvTotal: cn(kv, 'mt-1 border-t border-line pt-2.75 [&>dt]:font-medium [&>dt]:text-ink [&>dd]:text-16 [&>dd]:font-bold'),
  kvSub: 'block text-12 font-normal text-muted',
  /** A prova de que os números fecham, no pé do painel. */
  proof:
    'mt-auto flex items-start gap-2.5 rounded-md bg-raised px-3.5 py-3 text-13 leading-[1.45] text-muted [&_strong]:font-semibold [&_strong]:text-ink [&>svg]:mt-px [&>svg]:flex-none',

  // ---------- linhas de lista (pendências, últimos lançamentos) ----------
  rows: 'pb-2',
  row,
  /** Linha com botão de ação na terceira coluna. Já inclui o row. */
  rowAct: cn(row, 'grid-cols-[minmax(0,1fr)_auto_92px] max-sm:grid-cols-[minmax(0,1fr)_auto_auto] max-sm:gap-3'),
  rowMain: 'min-w-0',
  rowTitle: 'flex min-w-0 items-center gap-2 text-14',
  rowSub: 'mt-0.5 block truncate text-13 text-muted',
  rowNum: 'text-right text-14 whitespace-nowrap tabular-nums',
  /** Lançamento recém-chegado: a linha acende em ouro e se apaga. */
  fresh: 'animate-fresh motion-reduce:animate-none motion-reduce:bg-data-soft',

  // ---------- a equação patrimonial em uma linha (empilhada abaixo de md) ----------
  equation,
  /** A faixa do caixa (compras): três células da conta e uma à parte. Já inclui o equation. */
  equation4: cn(
    equation,
    'grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)_40px_minmax(0,1fr)_32px_minmax(0,1fr)] max-md:grid-cols-[24px_minmax(0,1fr)] max-md:[&>:first-child]:col-start-2',
  ),
  eqCell: 'min-w-0 max-md:flex max-md:items-baseline max-md:justify-between max-md:gap-3',
  /** A célula que a equação responde: rótulo em tinta, valor em negrito. */
  eqLead: '[&>:first-child]:font-medium [&>:first-child]:text-ink [&>:last-child]:font-semibold max-md:col-start-2',
  eqLabel: 'block text-13 text-muted',
  eqValue: 'mt-1 block text-24 leading-[1.2] font-medium whitespace-nowrap tabular-nums max-md:m-0 max-md:text-16',
  /** Os sinais da equação, no serifado da marca, como num livro. */
  eqOp: 'pb-0.5 text-center font-serif text-30 leading-none text-muted max-md:text-left max-md:text-20',
  eqSpacer: 'max-md:hidden',
  /** Uma célula separada das outras por um filete: não faz parte da conta. */
  eqAside: 'border-l border-rule pl-6 max-md:col-start-2 max-md:border-t max-md:border-l-0 max-md:pt-2.5 max-md:pl-0',
  eqProof:
    'flex items-center gap-2 border-t border-rule px-6 py-3 text-13 text-muted [&_strong]:font-semibold [&_strong]:text-ink max-md:items-start max-md:px-4',

  // ---------- gráfico com o resumo ao lado (razonete) ----------
  chartSplit: 'grid grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] items-start gap-8 max-md:grid-cols-1 max-md:gap-4',
} as const;
