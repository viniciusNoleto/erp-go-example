/*
 * Os tokens de design do GoMoney: a fonte única das cores, fontes, raios,
 * sombras, tamanhos de texto e pontos de quebra.
 *
 * Dois consumidores leem daqui:
 *  - o tema do Mantine (src/theme.ts), para os componentes;
 *  - o tailwind.config.mts, para as classes utilitárias (bg-surface, text-muted,
 *    rounded-md, max-sm:…).
 * Mudar um valor aqui muda os dois lados juntos.
 *
 * Este arquivo é lido também pelo Tailwind fora do Next: por isso só importa
 * caminhos relativos (nada de "@/").
 */

type Shades = readonly [string, string, string, string, string, string, string, string, string, string];

/** Paletas de dez tons, no formato do Mantine (0 é o mais claro). */
export const palettes = {
  /** A tinta: do papel ao quase preto. O 9 é o botão principal. */
  ink: ['#f5f5f3', '#ebeae6', '#dcdad5', '#c4c1ba', '#a19e96', '#7b7871', '#5c5a54', '#3e3c38', '#26251f', '#141414'],
  /** O ouro velho da moeda. O 6 (#9a7418) passa de 4:1 sobre o branco. */
  gold: ['#fbf7ec', '#f3ead0', '#e6d4a3', '#d8bd74', '#c9a24a', '#b48c33', '#9a7418', '#7d5f17', '#614912', '#45340d'],
  /** Cinzas levemente quentes, para as bordas e os textos secundários do Mantine. */
  gray: ['#fafaf9', '#f5f5f3', '#eeede9', '#e4e3df', '#d5d3ce', '#a9a7a0', '#6b6963', '#55534e', '#3a3935', '#1f1e1c'],
} as const satisfies Record<string, Shades>;

/**
 * As cores com nome de papel, não de tom. Viram classes do Tailwind
 * (bg-ground, border-line, text-muted, …).
 */
export const colors = {
  // O papel do razão e as superfícies.
  ground: '#f5f5f3',
  surface: '#ffffff',
  raised: '#f2f1ee',
  active: '#e9e8e4',
  line: '#e4e3df',
  rule: '#efeeea',
  control: '#d5d3ce',

  // A tinta, em dois tons que passam de 4,5:1 no papel.
  ink: '#111111',
  muted: '#66645e',

  // A cor única: o ouro velho da moeda, só no dado principal.
  data: '#9a7418',
  'data-soft': 'rgb(154 116 24 / 0.1)',

  positive: '#2e7d32',
  negative: '#c4242a',
  warning: '#92400e',

  // A apresentação (/): tinta clara sobre a gravação escura.
  night: {
    DEFAULT: '#0b0c0e',
    ink: '#ecebe6',
    soft: '#c2c0b9',
    gold: '#d6c193',
    ok: '#8fc79b',
  },
} as const;

export const fonts = {
  sans: ['IBM Plex Sans Variable', 'IBM Plex Sans', 'system-ui', 'sans-serif'],
  serif: ['Instrument Serif', 'Iowan Old Style', 'Georgia', 'serif'],
  mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
} as const;

/** Lista de fontes no formato do CSS (o Mantine quer uma string só). */
export const fontStack = (list: readonly string[]) => list.map((f) => (f.includes(' ') ? `'${f}'` : f)).join(', ');

/**
 * A escala de texto, em px, com o nome do próprio tamanho: text-13 é 13px.
 * Sem altura de linha embutida: o texto herda a do corpo, como no desenho.
 */
export const fontSizes = [11, 12, 13, 14, 15, 16, 17, 18, 20, 24, 26, 28, 30, 32, 40] as const;

// Raios apertados, escolhidos uma vez: 8 nos painéis, 6 nos controles, 4 nos selos.
export const radius = { xs: '4px', sm: '6px', md: '8px', lg: '12px', xl: '16px' } as const;

// Sombra só no que flutua de verdade: gaveta, menu, o cartão do lançamento.
export const shadows = {
  xs: '0 1px 2px rgb(17 17 17 / 0.06)',
  sm: '0 2px 8px rgb(17 17 17 / 0.06)',
  md: '0 8px 24px rgb(17 17 17 / 0.10)',
  lg: '0 16px 40px rgb(17 17 17 / 0.14)',
  xl: '0 24px 64px rgb(17 17 17 / 0.18)',
  /** O cartão do palco dos lançamentos, o único que flutua sobre a tela. */
  float: '0 12px 32px rgb(17 17 17 / 0.12)',
} as const;

/** A curva de toda transição do app: sai rápido e assenta devagar. */
export const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';

/**
 * Os pontos de quebra do Mantine, repetidos no Tailwind: `visibleFrom="md"` e
 * `md:` (ou `max-md:`) mudam exatamente na mesma largura.
 */
export const breakpoints = { xs: '36em', sm: '48em', md: '62em', lg: '75em', xl: '88em' } as const;
