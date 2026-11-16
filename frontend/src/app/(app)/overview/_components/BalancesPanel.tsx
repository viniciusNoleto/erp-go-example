'use client';

import { Skeleton } from '@mantine/core';
import { useState } from 'react';

import { ChartLine } from '@/components/chart/Line';
import { UtilsClip } from '@/components/utils/Clip';
import { UtilsFail } from '@/components/utils/Fail';
import { UtilsFor } from '@/components/utils/For';
import { UtilsIf } from '@/components/utils/If';
import { UtilsMoney } from '@/components/utils/Money';
import { UtilsPanel } from '@/components/utils/Panel';
import { EAccountId } from '@/resources/account/enums/AccountId';
import type { IOverview } from '@/resources/overview/models/Overview';
import { s } from '@/styles/screens';

export type OverviewBalanceTab = {
  id: EAccountId;
  label: string;
  /** A nota embaixo do saldo (reservado, vendas em aberto…). */
  note: string;
};

/**
 * O bloco maior da visão geral: os saldos das quatro contas que giram o
 * negócio, cada um uma aba do gráfico da evolução do saldo.
 */
export function OverviewBalancesPanel({
  overview,
  error,
  retry,
  tabs,
}: {
  overview?: IOverview;
  error: unknown;
  retry: () => void;
  tabs: OverviewBalanceTab[];
}) {
  const [tab, setTab] = useState(EAccountId.CASH);

  const selected = tabs.find((item) => item.id === tab)!;
  const series = overview?.series[String(tab)]?.map((point) => ({ t: new Date(point.at).getTime(), v: point.cents })) ?? [];
  const accountOf = (id: EAccountId) => overview?.accounts.find((account) => account.id === id);

  return (
    <UtilsPanel
      flush
      className={s.span8}
      label="Saldos e evolução"
    >
      <UtilsIf
        cases={[
          {
            condition: !!error,
            content: () => (
              <div className="pt-5">
                <UtilsFail
                  error={error}
                  retry={retry}
                />
              </div>
            ),
          },
          {
            content: () => (
              <>
                <div
                  className={s.tabs}
                  role="tablist"
                  aria-label="Conta mostrada no gráfico"
                >
                  <UtilsFor
                    each={tabs}
                    eachKey={({ item }) => item.id}
                  >
                    {({ item }) => (
                      <button
                        role="tab"
                        aria-selected={tab === item.id}
                        className={s.tab}
                        onClick={() => setTab(item.id)}
                      >
                        <span className={s.tabLabel}>
                          {item.label}
                        </span>

                        <UtilsClip className={s.tabValue}>
                          <UtilsIf
                            cases={[
                              {
                                condition: !!accountOf(item.id),
                                content: () => <UtilsMoney cents={accountOf(item.id)!.balanceCents} />,
                              },
                              {
                                content: () => (
                                  <Skeleton
                                    height={24}
                                    width="80%"
                                    mt={4}
                                    radius={4}
                                  />
                                ),
                              },
                            ]}
                          />
                        </UtilsClip>

                        <UtilsClip className={s.tabNote}>
                          {overview ? item.note : ' '}
                        </UtilsClip>
                      </button>
                    )}
                  </UtilsFor>
                </div>

                <div className={s.chartWrap}>
                  <UtilsIf
                    cases={[
                      {
                        condition: !!overview,
                        content: () => (
                          <ChartLine
                            points={series}
                            height={272}
                            label={`Saldo de ${selected.label} após cada lançamento`}
                          />
                        ),
                      },
                      {
                        content: () => (
                          <Skeleton
                            height={272}
                            radius={4}
                          />
                        ),
                      },
                    ]}
                  />
                </div>
              </>
            ),
          },
        ]}
      />
    </UtilsPanel>
  );
}
