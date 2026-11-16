'use client';

import { IconCircleCheck } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import type { CSSProperties, ReactNode } from 'react';

import { UtilsIf } from '@/components/utils/If';
import { EAccountId } from '@/resources/account/enums/AccountId';
import { GET_ENTRIES_KEY, getEntriesService } from '@/resources/entry/services/getEntries';
import { GET_OVERVIEW_KEY, getOverviewService } from '@/resources/overview/services/getOverview';
import { cn } from '@/utils/cn';
import { day, moneyFull } from '@/utils/format';

import { presentationClasses as c } from './classes';

/** O quadro de vidro do topo: o razão da loja de demonstração, ao vivo. */
export function LiveLedger({ style }: { style?: CSSProperties }) {
  const { data: overview, isError: overviewIsError } = useQuery({ queryKey: GET_OVERVIEW_KEY, queryFn: getOverviewService });
  const { data: lastEntries } = useQuery({
    queryKey: GET_ENTRIES_KEY(1),
    queryFn: ({ signal }) => getEntriesService({ signal, query: { limit: 1 } }),
  });

  const cash = overview?.accounts.find((account) => account.id === EAccountId.CASH);
  const last = lastEntries?.[0];
  const balanced = overview ? overview.totalDebitsCents === overview.totalCreditsCents : false;

  return (
    <aside
      className="glass px-7.5 pt-7 pb-6.5 max-sm:px-5 max-sm:py-5.5 motion-safe:animate-rise"
      style={style}
      aria-label="O razão da loja de demonstração, agora"
    >
      <div className="flex items-baseline justify-between gap-3 text-14 text-night-soft">
        <span>
          <span className="mr-2 inline-block size-1.75 rounded-full bg-night-ok align-[1px]" />

          Agora, no razão
        </span>

        <span>
          TigerBeetle
        </span>
      </div>

      <UtilsIf
        cases={[
          {
            condition: overviewIsError,
            content: () => (
              <p className={c.company}>
                O razão está fora do ar agora. Suba a API com make up.
              </p>
            ),
          },
          {
            content: () => (
              <>
                <p className={c.company}>
                  {overview?.company ?? 'Lendo o razão…'}
                </p>

                <Figure
                  label="Caixa e bancos"
                  lead
                >
                  {cash ? moneyFull(cash.balanceCents) : '—'}
                </Figure>

                <Figure label="Reservado para fornecedores">
                  {cash ? moneyFull(cash.reservedCents) : '—'}
                </Figure>

                <Figure label="Resultado desde a abertura">
                  {overview ? moneyFull(overview.netCents) : '—'}
                </Figure>

                <Figure label="Débitos = créditos">
                  <UtilsIf condition={balanced}>
                    {() => (
                      <IconCircleCheck
                        size={18}
                        stroke={1.6}
                        className="mr-1.5 inline align-[-3px] text-night-ok"
                      />
                    )}
                  </UtilsIf>

                  {overview ? moneyFull(overview.totalDebitsCents) : '—'}
                </Figure>

                <UtilsIf condition={last}>
                  {() => (
                    <p className="mt-3.5 border-t border-white/12 pt-3.5 text-14 text-night-soft">
                      {`Último lançamento, ${day(last!.timestamp).toLowerCase()}`}

                      <b className="mt-0.5 block text-15 font-medium text-night-ink">
                        {`${last!.memo} · ${moneyFull(last!.amountCents)}`}
                      </b>
                    </p>
                  )}
                </UtilsIf>
              </>
            ),
          },
        ]}
      />
    </aside>
  );
}

/** Uma linha do quadro ao vivo: o rótulo à esquerda, o número à direita. A primeira, em ouro, é a que se lê. */
function Figure({ label, lead, children }: { label: string; lead?: boolean; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-white/12 py-2.75 text-15 text-night-soft">
      <span>
        {label}
      </span>

      <strong className={cn('text-20 font-medium whitespace-nowrap text-night-ink tabular-nums', lead && 'text-30 font-semibold text-night-gold')}>
        {children}
      </strong>
    </div>
  );
}
