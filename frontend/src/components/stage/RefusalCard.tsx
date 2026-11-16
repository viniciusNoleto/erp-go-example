'use client';

import { CloseButton } from '@mantine/core';
import { motion } from 'motion/react';

import { UtilsFor } from '@/components/utils/For';
import { cn } from '@/utils/cn';
import { colors } from '@/tokens';

import { stageClasses as c } from './classes';
import { SCENES } from './scenes';
import { STAGE_INK, StageDraw } from './Strokes';

const DUST = [0, 1, 2, 3, 4, 5, 6, 7];

/** "insufficient funds: R$ 10" → "Insufficient funds: R$ 10." com o espaço inseparável depois do R$. */
const sentence = (message: string) => `${(message.charAt(0).toUpperCase() + message.slice(1)).replace(/R\$ /g, 'R$ ')}.`;

/** A recusa: o traço começa, para no meio, ganha um X e se parte em fragmentos. */
export function StageRefusalCard({ message, onClose }: { message: string; onClose: () => void }) {
  const red = colors.negative;

  return (
    <>
      <div className={c.head}>
        <div>
          <div className={cn(c.title, 'text-negative')}>
            {SCENES.refused.title}
          </div>

          <div className={c.memo}>
            Nada foi gravado.
          </div>
        </div>

        <CloseButton
          size="sm"
          onClick={onClose}
          aria-label="Fechar"
        />
      </div>

      <div className={cn(c.middle, 'mt-1.5')}>
        <svg
          viewBox="0 0 388 58"
          fill="none"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <motion.path
            d="M8 30 H214"
            stroke={STAGE_INK}
            strokeWidth={1.4}
            initial={{ pathLength: 0, opacity: 1 }}
            animate={{ pathLength: [0, 1, 1], opacity: [1, 1, 0.2] }}
            transition={{ delay: 0.3, duration: 1.5, times: [0, 0.55, 1] }}
          />

          <StageDraw
            d="M206 21 L224 39"
            delay={1.1}
            duration={0.15}
            color={red}
            width={1.8}
          />

          <StageDraw
            d="M224 21 L206 39"
            delay={1.25}
            duration={0.15}
            color={red}
            width={1.8}
          />

          <UtilsFor each={DUST}>
            {({ item: i }) => (
              <motion.rect
                x={60 + i * 22}
                y={29.2}
                width={4 + (i % 3) * 2}
                height={1.6}
                fill={STAGE_INK}
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: [0, 0.8, 0], y: 22 + (i % 4) * 5, x: (i % 2 ? 1 : -1) * 4 }}
                transition={{ delay: 1.3 + i * 0.04, duration: 0.9, ease: 'easeIn' }}
              />
            )}
          </UtilsFor>
        </svg>
      </div>

      <p className={c.note}>
        <strong>
          {sentence(message)}
        </strong>
      </p>
    </>
  );
}
