import {
  Badge,
  Button,
  createTheme,
  Drawer,
  Input,
  NavLink,
  Paper,
  SegmentedControl,
  Select,
  Table,
  Tooltip,
  type CSSVariablesResolver,
} from '@mantine/core';

import { breakpoints, colors, fonts, fontStack, palettes, radius, shadows } from './tokens';

/*
 * O tema do GoMoney (Mantine).
 *
 * A ideia: um livro-razão encadernado. Papel levemente quente, tinta quase
 * preta, e uma cor só, o ouro velho da moeda, guardada para o dado principal
 * de cada tela (a linha do gráfico, o saldo que está sendo lido). O resto é
 * tinta: botões, menu, abas e tabelas não levam cor nenhuma.
 *
 * O "luxo" vem da tipografia, não de efeito: o título de cada tela num serifado
 * de alto contraste (Instrument Serif), o texto e os números num grotesco sério
 * com algarismos tabulares (IBM Plex Sans), e muito alinhamento.
 *
 * Os valores vêm de src/tokens.ts, o mesmo arquivo que o Tailwind lê: um
 * className como "bg-surface" ou "rounded-md" bate com o Mantine.
 */

const { ink, gold, gray } = palettes;

export const theme = createTheme({
  primaryColor: 'ink',
  primaryShade: 9,
  colors: { ink: [...ink], gold: [...gold], gray: [...gray] },
  black: colors.ink,
  white: colors.surface,
  breakpoints,
  fontFamily: fontStack(fonts.sans),
  fontFamilyMonospace: fontStack(fonts.mono),
  headings: {
    fontFamily: fontStack(fonts.sans),
    fontWeight: '600',
    sizes: {
      h1: { fontSize: '32px', lineHeight: '1.1' },
      h2: { fontSize: '16px', lineHeight: '1.4' },
      h3: { fontSize: '14px', lineHeight: '1.4' },
    },
  },
  fontSizes: { xs: '12px', sm: '14px', md: '14px', lg: '16px', xl: '20px' },
  lineHeights: { xs: '1.4', sm: '1.45', md: '1.45', lg: '1.5', xl: '1.4' },
  radius,
  defaultRadius: 'sm',
  spacing: { xs: '8px', sm: '12px', md: '16px', lg: '24px', xl: '32px' },
  shadows,
  cursorType: 'pointer',
  focusRing: 'auto',
  respectReducedMotion: true,
  components: {
    Button: Button.extend({ defaultProps: { size: 'sm', radius: 'sm' } }),
    Paper: Paper.extend({ defaultProps: { radius: 'md', withBorder: true } }),
    Badge: Badge.extend({
      defaultProps: { variant: 'light', radius: 'sm', size: 'md' },
      styles: { root: { textTransform: 'none', fontWeight: 500, letterSpacing: 0, flex: 'none' } },
    }),
    Input: Input.extend({ defaultProps: { size: 'sm', radius: 'sm' } }),
    Select: Select.extend({ defaultProps: { size: 'sm', radius: 'sm', allowDeselect: false, checkIconPosition: 'right' } }),
    SegmentedControl: SegmentedControl.extend({ defaultProps: { radius: 'sm', size: 'sm' } }),
    NavLink: NavLink.extend({ defaultProps: { variant: 'subtle' } }),
    Drawer: Drawer.extend({
      defaultProps: { position: 'right', size: 480, overlayProps: { backgroundOpacity: 0.32, blur: 0 }, padding: 'lg' },
    }),
    Tooltip: Tooltip.extend({ defaultProps: { withArrow: false, openDelay: 250 } }),
    /*
     * Tabelas: filetes e alinhamento. Cabeçalho em cinza, 12px, sem faixa de
     * fundo (o fundo é o do painel, inclusive no cabeçalho fixo); sem listras.
     * No celular as células entram 16px, e as do meio quase encostam.
     */
    Table: Table.extend({
      defaultProps: { verticalSpacing: 10, horizontalSpacing: 'lg', highlightOnHover: true },
      classNames: {
        table: 'text-14',
        thead: 'bg-surface',
        th: 'h-10 border-b border-line bg-surface text-12 font-normal whitespace-nowrap text-muted max-sm:px-4 max-sm:[th+&]:pl-1',
        td: 'h-14 border-rule max-sm:px-4 max-sm:[td+&]:pl-1',
        tr: '[&:last-child>td]:border-b-0',
      },
    }),
  },
});

/** As variáveis que o Mantine usa para fundo, texto e bordas, no papel do razão. */
export const resolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    '--mantine-color-body': colors.ground,
    '--mantine-color-text': colors.ink,
    '--mantine-color-dimmed': colors.muted,
    '--mantine-color-default-border': colors.line,
    '--mantine-color-default-hover': colors.raised,
    '--mantine-color-placeholder': ink[5],
  },
  dark: {},
});
