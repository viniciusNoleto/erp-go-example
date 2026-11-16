/*
 * As peças das tabelas, em classes do Tailwind. O estilo da tabela em si
 * (cabeçalho, filetes, alturas) está no tema do Mantine (src/theme.ts, em
 * Table.classNames) e vale para toda <Table>; aqui fica o que cada célula
 * escolhe usar.
 */
export const t = {
  /** Números: à direita, numa linha, em algarismos tabulares. */
  num: 'text-right whitespace-nowrap tabular-nums',
  /** A segunda linha de uma célula, menor e em cinza. */
  sub: 'mt-0.5 block overflow-hidden text-13 text-ellipsis text-muted',
  /** O nome que identifica a linha (cliente, fornecedor, produto). */
  ident: 'font-medium',
  /** Célula de texto que corta em reticências em vez de alargar a coluna. */
  clip: 'max-w-0 truncate',
  /** O histórico e, ao lado, o selo da fase. */
  memo: 'flex min-w-0 items-center gap-2 [&>span:first-child]:overflow-hidden [&>span:first-child]:text-ellipsis',
  /** Linha inteira clicável: o link dentro dela sublinha ao passar o mouse. */
  rowLink: 'cursor-pointer [&:hover_a]:underline [&:hover_a]:underline-offset-3',
  /** A linha de título de um grupo (Ativo, Passivo…). */
  group: '[&>td]:h-12 [&>td]:pb-2 [&>td]:align-bottom [&>td]:font-semibold',
  /** A barra acima da tabela (filtros à esquerda, contagem à direita). */
  toolbar: 'flex items-center justify-between gap-4 px-6 pt-4 pb-3.5 max-sm:flex-wrap max-sm:px-4 max-sm:py-3',
  /** Lançamento recém-chegado: a linha acende em ouro e se apaga. */
  fresh: '[&>td]:animate-fresh motion-reduce:[&>td]:animate-none motion-reduce:[&>td]:bg-data-soft',

  // Larguras de coluna que mudam no celular.
  colMoney: 'w-34 max-sm:w-27',
  colAct: 'w-35 max-sm:w-24',
  colActWide: 'w-59 max-sm:w-36',

  // O que só aparece no desktop ou só no celular, dentro de uma célula.
  desk: 'max-sm:hidden',
  deskCell: 'max-sm:hidden',
  mob: 'hidden max-sm:inline',
  /** Sem as colunas de débito e crédito (abaixo de md), as contas descem para a segunda linha. */
  legs: 'hidden max-md:inline',

  /** Linha 1 de uma célula de identidade: o nome e, só no celular, o valor à direita. */
  line1: 'flex min-w-0 items-baseline justify-between gap-2 [&>:first-child]:overflow-hidden [&>:first-child]:text-ellipsis [&>:last-child]:flex-none',
} as const;
