'use client';

import { CloseButton } from '@mantine/core';
import { IconLink } from '@tabler/icons-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';

import { UtilsFor } from '@/components/utils/For';
import { UtilsIf } from '@/components/utils/If';
import type { IEntry } from '@/resources/entry/models/Entry';
import { EPostingScene } from '@/resources/posting/enums/PostingScene';
import type { IPosting } from '@/resources/posting/models/Posting';
import { cn } from '@/utils/cn';
import { money } from '@/utils/format';

import { stageClasses as c } from './classes';
import { SCENES, type StageMark } from './scenes';
import { StageStrokes } from './Strokes';

/** A nota no pé do cartão: o que a operação fez com o dinheiro, numa frase. */
const NOTES: Record<EPostingScene, ReactNode> = {
  [EPostingScene.SALE]: (
    <>
      <strong>
        Duas partidas encadeadas.
      </strong>

      {' O TigerBeetle grava as duas ou nenhuma: não existe receita sem a baixa do estoque.'}
    </>
  ),
  [EPostingScene.RECEIPT]: (
    <>
      <strong>
        O cliente pagou.
      </strong>

      {' O valor saiu de clientes a receber e entrou no caixa.'}
    </>
  ),
  [EPostingScene.PURCHASE]: (
    <>
      <strong>
        Mercadoria no estoque,
      </strong>

      {' dívida com o fornecedor. O caixa ainda não se mexeu.'}
    </>
  ),
  [EPostingScene.PAYMENT_SCHEDULED]: (
    <>
      <strong>
        Primeira fase.
      </strong>

      {' O valor fica reservado no caixa até você confirmar ou cancelar.'}
    </>
  ),
  [EPostingScene.PAYMENT_CONFIRMED]: (
    <>
      <strong>
        Segunda fase.
      </strong>

      {' A reserva foi efetivada: agora o dinheiro saiu do caixa.'}
    </>
  ),
  [EPostingScene.PAYMENT_CANCELLED]: (
    <>
      <strong>
        Reserva liberada.
      </strong>

      {' O registro continua no livro-razão: nada é apagado.'}
    </>
  ),
  [EPostingScene.EXPENSE]: (
    <>
      <strong>
        Despesa paga.
      </strong>

      {' Menos caixa, menos resultado.'}
    </>
  ),
  [EPostingScene.CAPITAL]: (
    <>
      <strong>
        Dinheiro dos sócios.
      </strong>

      {' Aumenta o caixa e o patrimônio líquido.'}
    </>
  ),
  [EPostingScene.MANUAL]: (
    <>
      <strong>
        Lançamento manual.
      </strong>

      {' Um débito e um crédito de mesmo valor.'}
    </>
  ),
};

export function StagePostingCard({ posting, onClose }: { posting: IPosting; onClose: () => void }) {
  const style = SCENES[posting.scene] ?? SCENES.manual;

  return (
    <>
      <div className={c.head}>
        <div>
          <div className={c.title}>
            {style.title}
          </div>

          <div className={c.memo}>
            {posting.memo}
          </div>
        </div>

        <CloseButton
          size="sm"
          onClick={onClose}
          aria-label="Fechar"
        />
      </div>

      <UtilsFor
        each={posting.entries}
        eachKey={({ item }) => item.id}
      >
        {({ item: entry, index }) => (
          <div>
            <UtilsIf condition={index > 0}>
              {() => (
                <motion.div
                  className="mt-2 flex items-center justify-center gap-1.5 text-12 text-muted"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.15, type: 'spring', stiffness: 320, damping: 18 }}
                >
                  <IconLink
                    size={14}
                    stroke={1.6}
                  />

                  encadeadas
                </motion.div>
              )}
            </UtilsIf>

            <StageLeg
              entry={entry}
              mark={style.mark}
              delay={0.25 + index * 1.05}
            />
          </div>
        )}
      </UtilsFor>

      <motion.p
        className={c.note}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 + posting.entries.length * 0.9 }}
      >
        {NOTES[posting.scene]}
      </motion.p>
    </>
  );
}

/** Uma partida no cartão: débito à esquerda, o valor e o traço no meio, crédito à direita. */
function StageLeg({ entry, mark, delay }: { entry: IEntry; mark: StageMark; delay: number }) {
  const wiped = mark === 'wipe';

  return (
    <div className="mt-3.5 grid grid-cols-[1fr_132px_1fr] items-end gap-2">
      <motion.div
        className={c.account}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay, duration: 0.35 }}
      >
        <small>
          {`Débito · ${entry.debit.id}`}
        </small>

        {entry.debit.name}
      </motion.div>

      <div className={c.middle}>
        <motion.div
          className={cn('relative -mb-4.5 text-15 font-semibold whitespace-nowrap tabular-nums', wiped && 'line-through')}
          initial={{ opacity: 0, y: 6 }}
          animate={wiped ? { opacity: [0, 1, 1, 0.45], y: 0 } : { opacity: 1, y: 0 }}
          transition={wiped ? { delay: delay + 0.3, duration: 1.6, times: [0, 0.25, 0.7, 1] } : { delay: delay + 0.3, duration: 0.4 }}
        >
          <span className="mr-[0.22em] text-[0.8em] font-normal text-muted">
            R$
          </span>

          {money(entry.amountCents)}
        </motion.div>

        <svg
          viewBox="0 0 132 58"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <StageStrokes
            mark={mark}
            delay={delay + 0.15}
          />
        </svg>
      </div>

      <motion.div
        className={cn(c.account, 'text-right')}
        initial={{ opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: delay + 0.55, duration: 0.35 }}
      >
        <small>
          {`Crédito · ${entry.credit.id}`}
        </small>

        {entry.credit.name}
      </motion.div>
    </div>
  );
}
