import type { Config } from 'tailwindcss';

import { breakpoints, colors, ease, fonts, fontSizes, radius, shadows } from './src/tokens';

/*
 * A configuração do Tailwind (v4), ligada ao CSS por `@config` em
 * src/styles/globals.css. Os valores vêm de src/tokens.ts, os mesmos que o
 * tema do Mantine usa.
 *
 * O que substitui o padrão do Tailwind (fora do `extend`):
 *  - screens: os pontos de quebra do Mantine;
 *  - fontSize: a escala do GoMoney, em px (text-13, text-24…).
 * O resto só acrescenta ao padrão.
 */
export default {
  theme: {
    screens: breakpoints,
    fontSize: Object.fromEntries(fontSizes.map((size) => [size, `${size}px`])),
    extend: {
      colors,
      fontFamily: {
        sans: [...fonts.sans],
        serif: [...fonts.serif],
        mono: [...fonts.mono],
      },
      borderRadius: radius,
      boxShadow: shadows,
      transitionTimingFunction: { book: ease },
      maxWidth: { canvas: '1192px', wrap: '1264px' },
    },
  },
} satisfies Config;
