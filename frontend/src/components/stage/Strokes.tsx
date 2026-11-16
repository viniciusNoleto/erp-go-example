'use client';

import { motion } from 'motion/react';
import type { SVGProps } from 'react';

import { colors, palettes } from '@/tokens';

import type { StageMark } from './scenes';

/** O traço principal: uma régua reta sob o valor, como no livro. */
export const STAGE_STROKE = 'M8 40 H124';

export const STAGE_INK = palettes.ink[9];
export const STAGE_GOLD = colors.data;

type StageDrawProps = { d: string; delay: number; duration?: number; color?: string; width?: number } & SVGProps<SVGPathElement>;

/** Desenha um caminho como se fosse riscado à mão: do início ao fim. */
export function StageDraw({ d, delay, duration = 0.6, color = STAGE_GOLD, width = 1.4, ...rest }: StageDrawProps) {
  return (
    <motion.path
      d={d}
      stroke={color}
      strokeWidth={width}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ pathLength: { delay, duration, ease: [0.4, 0, 0.2, 1] }, opacity: { delay, duration: 0.01 } }}
      {...(rest as object)}
    />
  );
}

/** O traço principal em tinta e o sinal próprio de cada cena em ouro. */
export function StageStrokes({ mark, delay }: { mark: StageMark; delay: number }) {
  const after = delay + 0.65;
  const rule = (
    <StageDraw
      d={STAGE_STROKE}
      delay={delay}
      color={STAGE_INK}
      width={1.2}
    />
  );

  switch (mark) {
    // Total fechado: duplo sublinhado.
    case 'double':
      return (
        <>
          {rule}

          <StageDraw
            d="M8 45 H124"
            delay={after}
            duration={0.4}
          />
        </>
      );

    // Dinheiro que entrou: o valor circulado.
    case 'ring':
      return (
        <>
          {rule}

          <StageDraw
            d="M66 -2 C 104 -2, 124 5, 124 13 C 124 21, 104 28, 66 28 C 28 28, 8 21, 8 13 C 8 5, 28 -2, 66 -2"
            delay={after}
            duration={0.7}
          />
        </>
      );

    // Mercadoria que chegou: o valor numa caixa.
    case 'box':
      return (
        <>
          {rule}

          <StageDraw
            d="M8 -1 H124 V27 H8 Z"
            delay={after}
            duration={0.7}
          />
        </>
      );

    // Reserva em aberto: o tracejado fica andando.
    case 'dashed':
      return (
        <motion.path
          d={STAGE_STROKE}
          stroke={STAGE_GOLD}
          strokeWidth={1.4}
          strokeDasharray="5 6"
          initial={{ opacity: 0, strokeDashoffset: 0 }}
          animate={{ opacity: 1, strokeDashoffset: -22 }}
          transition={{ opacity: { delay, duration: 0.5 }, strokeDashoffset: { delay, duration: 1.4, repeat: Infinity, ease: 'linear' } }}
        />
      );

    // A reserva vira traço cheio e ganha um visto.
    case 'check':
      return (
        <>
          <motion.path
            d={STAGE_STROKE}
            stroke={STAGE_GOLD}
            strokeWidth={1.4}
            strokeDasharray="5 6"
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 0 }}
            transition={{ delay: delay + 0.5, duration: 0.3 }}
          />

          <StageDraw
            d={STAGE_STROKE}
            delay={delay + 0.1}
            color={STAGE_INK}
            width={1.2}
          />

          <StageDraw
            d="M104 47 L110 53 L124 31"
            delay={after + 0.1}
            duration={0.35}
          />
        </>
      );

    // A reserva se desfaz: o tracejado esmaece até quase sumir.
    case 'wipe':
      return (
        <motion.path
          d={STAGE_STROKE}
          stroke={STAGE_GOLD}
          strokeWidth={1.4}
          strokeDasharray="5 6"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0.2 }}
          transition={{ delay: delay + 0.9, duration: 0.8 }}
        />
      );

    // Dinheiro consumido: uma onda sob o traço.
    case 'strike':
      return (
        <>
          {rule}

          <StageDraw
            d="M20 48 q 8 -5 16 0 t 16 0 t 16 0 t 16 0 t 16 0 t 16 0"
            delay={after}
            duration={0.55}
          />
        </>
      );

    // Capital que entra: três riscos abrindo.
    case 'rays':
      return (
        <>
          {rule}

          <StageDraw
            d="M114 32 L111 22"
            delay={after}
            duration={0.2}
          />

          <StageDraw
            d="M121 33 L124 23"
            delay={after + 0.12}
            duration={0.2}
          />

          <StageDraw
            d="M127 38 L136 33"
            delay={after + 0.24}
            duration={0.2}
          />
        </>
      );

    default:
      return rule;
  }
}
