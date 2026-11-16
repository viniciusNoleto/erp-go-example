'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { useStage } from '@/components/stage/StageProvider';
import { UtilsClip } from '@/components/utils/Clip';
import { UtilsFail } from '@/components/utils/Fail';
import { nFor, UtilsFor } from '@/components/utils/For';
import { UtilsIf } from '@/components/utils/If';
import { UtilsMoney } from '@/components/utils/Money';
import { UtilsPanel } from '@/components/utils/Panel';
import { GET_ENTRIES_KEY, getEntriesService } from '@/resources/entry/services/getEntries';
import { ROUTES } from '@/shared/constants/routes';
import { s } from '@/styles/screens';
import { cn } from '@/utils/cn';
import { day } from '@/utils/format';

import { OVERVIEW_ROWS } from './DuesPanel';
import { OverviewSkeletonRow } from './SkeletonRow';

/** Os últimos lançamentos do razão, com o link para o diário completo. */
export function OverviewRecentEntriesPanel() {
  const { fresh } = useStage();

  const {
    data: entries,
    isLoading: entriesIsLoading,
    error: entriesError,
    refetch: entriesRefetch,
  } = useQuery({
    queryKey: GET_ENTRIES_KEY(OVERVIEW_ROWS),
    queryFn: ({ signal }) => getEntriesService({ signal, query: { limit: OVERVIEW_ROWS } }),
  });

  return (
    <UtilsPanel
      title="Últimos lançamentos"
      meta={
        <Link
          href={ROUTES.journal}
          className="font-medium text-ink underline"
        >
          Ver o diário
        </Link>
      }
      flush
      className={s.span6}
    >
      <UtilsIf
        cases={[
          {
            condition: !!entriesError,
            content: () => (
              <UtilsFail
                error={entriesError}
                retry={entriesRefetch}
              />
            ),
          },
          {
            content: () => (
              <ul className={s.rows}>
                <UtilsFor
                  each={(entries ?? []).slice(0, OVERVIEW_ROWS)}
                  eachKey={({ item }) => item.id}
                >
                  {({ item: entry }) => (
                    <li className={cn(s.row, fresh.has(entry.postingId) && s.fresh)}>
                      <div className={s.rowMain}>
                        <div className={s.rowTitle}>
                          <UtilsClip>
                            {entry.memo}
                          </UtilsClip>
                        </div>

                        <UtilsClip className={s.rowSub}>
                          {`D ${entry.debit.name} · C ${entry.credit.name}`}
                        </UtilsClip>
                      </div>

                      <span className={s.rowNum}>
                        <UtilsMoney cents={entry.amountCents} />

                        <span className={s.rowSub}>
                          {day(entry.timestamp)}
                        </span>
                      </span>
                    </li>
                  )}
                </UtilsFor>

                <UtilsIf condition={entriesIsLoading}>
                  {() => (
                    <UtilsFor each={nFor(OVERVIEW_ROWS)}>
                      {() => <OverviewSkeletonRow />}
                    </UtilsFor>
                  )}
                </UtilsIf>
              </ul>
            ),
          },
        ]}
      />
    </UtilsPanel>
  );
}
