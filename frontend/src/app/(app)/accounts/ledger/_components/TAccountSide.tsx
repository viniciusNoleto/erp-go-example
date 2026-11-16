'use client';

import { Skeleton } from '@mantine/core';

import { useStage } from '@/components/stage/StageProvider';
import { UtilsClip } from '@/components/utils/Clip';
import { nFor, UtilsFor } from '@/components/utils/For';
import { UtilsIf } from '@/components/utils/If';
import { UtilsMoney } from '@/components/utils/Money';
import { EEntryPhase } from '@/resources/entry/enums/EntryPhase';
import type { IEntry } from '@/resources/entry/models/Entry';
import { s } from '@/styles/screens';
import { cn } from '@/utils/cn';
import { day, plural } from '@/utils/format';

/** Quantos lançamentos cada lado do razonete mostra. */
const SIDE_ROWS = 9;

const ROW = 'grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-b border-rule py-2.25 text-14 max-sm:grid-cols-1';
const MORE = 'pt-2.5 text-12 text-muted';

/**
 * Um lado do razonete (a conta em T): os débitos à esquerda ou os créditos à
 * direita, depois do filete. Cada linha diz de onde (ou para onde) o valor foi.
 */
export function LedgerTAccountSide({
  entries,
  counterpart,
  label,
  className,
  loading,
  loaded,
}: {
  entries: IEntry[];
  /** A outra conta da partida: "de Caixa" ou "para Estoque". */
  counterpart: (entry: IEntry) => string;
  label: string;
  className: string;
  loading: boolean;
  loaded: boolean;
}) {
  const { fresh } = useStage();

  return (
    <div
      className={cn('min-w-0 pt-1 pb-2', className)}
      aria-label={label}
    >
      <UtilsFor
        each={entries.slice(0, SIDE_ROWS)}
        eachKey={({ item }) => item.id}
      >
        {({ item: entry }) => (
          <div className={cn(ROW, entry.phase === EEntryPhase.PENDING && 'text-muted', fresh.has(entry.postingId) && s.fresh)}>
            <UtilsClip>
              {entry.memo}
            </UtilsClip>

            <span className="text-right whitespace-nowrap tabular-nums max-sm:text-left">
              <UtilsMoney cents={entry.amountCents} />
            </span>

            <UtilsClip className="col-span-full mt-0.5 text-13 text-muted">
              {`${day(entry.timestamp)} · ${counterpart(entry)}${entry.phase === EEntryPhase.PENDING ? ' · reservado' : ''}`}
            </UtilsClip>
          </div>
        )}
      </UtilsFor>

      <UtilsIf condition={loading}>
        {() => (
          <UtilsFor each={nFor(4)}>
            {() => (
              <Skeleton
                height={12}
                radius={4}
                my={18}
                width="80%"
              />
            )}
          </UtilsFor>
        )}
      </UtilsIf>

      <UtilsIf condition={loaded && entries.length === 0}>
        {() => (
          <p className={MORE}>
            Nenhum lançamento deste lado.
          </p>
        )}
      </UtilsIf>

      <UtilsIf condition={entries.length > SIDE_ROWS}>
        {() => (
          <p className={MORE}>
            {`e mais ${plural(entries.length - SIDE_ROWS, 'lançamento anterior', 'lançamentos anteriores')}`}
          </p>
        )}
      </UtilsIf>
    </div>
  );
}
