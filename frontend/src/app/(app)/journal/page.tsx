'use client';

import { SegmentedControl, Table } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Suspense, useMemo, useState } from 'react';

import { FormButton } from '@/components/form/Button';
import { AppPageHeader } from '@/components/layout/PageHeader';
import { useStage } from '@/components/stage/StageProvider';
import { UtilsClip } from '@/components/utils/Clip';
import { UtilsEmpty } from '@/components/utils/Empty';
import { UtilsFail } from '@/components/utils/Fail';
import { UtilsFor } from '@/components/utils/For';
import { UtilsIf } from '@/components/utils/If';
import { UtilsMoney } from '@/components/utils/Money';
import { UtilsPanel } from '@/components/utils/Panel';
import { ENTRY_KIND_LABEL } from '@/resources/entry/enums/EntryKind';
import { EEntryPhase } from '@/resources/entry/enums/EntryPhase';
import { CreateEntryLogicComponent, useCreateEntryLogicData } from '@/resources/entry/logics/CreateEntry';
import { GET_ENTRIES_KEY, getEntriesService } from '@/resources/entry/services/getEntries';
import { OPEN_CREATE_PARAM } from '@/shared/constants/routes';
import { t } from '@/styles/table';
import { cn } from '@/utils/cn';
import { day, hour, moneyFull, plural } from '@/utils/format';
import { useOpenFromQuery } from '@/utils/hooks';

import { JOURNAL_FILTERS } from './_components/filters';
import { JournalPhaseStatus } from './_components/PhaseStatus';
import { JournalSkeletonRows } from './_components/SkeletonRows';

/** Quantas partidas o diário lê do razão. */
const JOURNAL_LIMIT = 200;

export default function JournalPage() {
  return (
    <Suspense>
      <Journal />
    </Suspense>
  );
}

/**
 * O livro diário. A pergunta: o que entrou no razão, e de onde para onde?
 * Cada linha é uma partida: um débito e um crédito de mesmo valor.
 */
function Journal() {
  const { fresh } = useStage();
  const [filter, setFilter] = useState('all');
  const [createEntryOpened, setCreateEntryOpened] = useOpenFromQuery(OPEN_CREATE_PARAM);

  const {
    data: entriesData,
    isLoading: entriesIsLoading,
    error: entriesError,
    refetch: entriesRefetch,
  } = useQuery({
    queryKey: GET_ENTRIES_KEY(JOURNAL_LIMIT),
    queryFn: ({ signal }) => getEntriesService({ signal, query: { limit: JOURNAL_LIMIT } }),
  });

  const createEntryLogicData = useCreateEntryLogicData({ onSuccess: () => setCreateEntryOpened(false) });

  const all = useMemo(() => entriesData ?? [], [entriesData]);
  const entries = useMemo(() => all.filter(JOURNAL_FILTERS.find((item) => item.value === filter)!.match), [all, filter]);
  const reserved = all.filter((entry) => entry.phase === EEntryPhase.PENDING && !entry.resolved);
  const reservedTotal = reserved.reduce((sum, entry) => sum + entry.amountCents, 0);

  function openCreateEntry() {
    createEntryLogicData.createEntryReset();
    setCreateEntryOpened(true);
  }

  return (
    <>
      <AppPageHeader
        title="Lançamentos"
        actions={
          <FormButton
            leftIcon={<IconPlus size={16} />}
            onClick={openCreateEntry}
          >
            Novo lançamento
          </FormButton>
        }
      >
        <UtilsIf
          cases={[
            {
              condition: !!entriesData,
              content: () => (
                <>
                  <strong>
                    {`${plural(all.length, 'partida', 'partidas')} no diário`}
                  </strong>

                  {', cada uma com débito e crédito de mesmo valor, lidas direto do TigerBeetle.'}

                  <UtilsIf condition={reserved.length > 0}>
                    {() => ` ${plural(reserved.length, 'reserva', 'reservas')} de ${moneyFull(reservedTotal)} aguardando confirmação.`}
                  </UtilsIf>
                </>
              ),
            },
            {
              content: () => 'Lendo o diário no razão…',
            },
          ]}
        />
      </AppPageHeader>

      <UtilsPanel
        flush
        label="Diário"
      >
        <div className={t.toolbar}>
          <SegmentedControl
            aria-label="Filtrar por origem"
            value={filter}
            onChange={setFilter}
            data={JOURNAL_FILTERS.map(({ value, label }) => ({ value, label }))}
          />

          <span className="text-13 text-muted">
            {entriesData ? plural(entries.length, 'partida', 'partidas') : ''}
          </span>
        </div>

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
                <Table
                  stickyHeader
                  stickyHeaderOffset={0}
                  layout="fixed"
                >
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th w={112}>
                        Data
                      </Table.Th>

                      <Table.Th>
                        Histórico
                      </Table.Th>

                      <Table.Th
                        w="22%"
                        visibleFrom="md"
                      >
                        Débito
                      </Table.Th>

                      <Table.Th
                        w="22%"
                        visibleFrom="md"
                      >
                        Crédito
                      </Table.Th>

                      <Table.Th
                        w={136}
                        className={t.num}
                      >
                        Valor
                      </Table.Th>
                    </Table.Tr>
                  </Table.Thead>

                  <Table.Tbody>
                    <UtilsIf condition={entriesIsLoading}>
                      {() => <JournalSkeletonRows />}
                    </UtilsIf>

                    <UtilsFor
                      each={entries}
                      eachKey={({ item }) => item.id}
                    >
                      {({ item: entry }) => (
                        <Table.Tr className={fresh.has(entry.postingId) ? t.fresh : undefined}>
                          <Table.Td className="whitespace-nowrap">
                            {day(entry.timestamp)}

                            <span className={cn(t.sub, 'tabular-nums')}>
                              {hour(entry.timestamp)}
                            </span>
                          </Table.Td>

                          <Table.Td className={t.clip}>
                            <span className={t.memo}>
                              <UtilsClip>
                                {entry.memo}
                              </UtilsClip>

                              <JournalPhaseStatus entry={entry} />
                            </span>

                            <UtilsClip className={t.sub}>
                              {ENTRY_KIND_LABEL[entry.kind]}

                              <span className="sr-only">
                                :
                              </span>

                              <span className={t.legs}>
                                {` · D ${entry.debit.name} · C ${entry.credit.name}`}
                              </span>
                            </UtilsClip>
                          </Table.Td>

                          <Table.Td
                            className={t.clip}
                            visibleFrom="md"
                          >
                            <UtilsClip>
                              {entry.debit.name}
                            </UtilsClip>

                            <span className={cn(t.sub, 'tabular-nums')}>
                              {entry.debit.id}
                            </span>
                          </Table.Td>

                          <Table.Td
                            className={t.clip}
                            visibleFrom="md"
                          >
                            <UtilsClip>
                              {entry.credit.name}
                            </UtilsClip>

                            <span className={cn(t.sub, 'tabular-nums')}>
                              {entry.credit.id}
                            </span>
                          </Table.Td>

                          <Table.Td className={t.num}>
                            <UtilsMoney cents={entry.amountCents} />
                          </Table.Td>
                        </Table.Tr>
                      )}
                    </UtilsFor>
                  </Table.Tbody>
                </Table>
              ),
            },
          ]}
        />

        <UtilsIf condition={entriesData && entries.length === 0}>
          {() => (
            <UtilsEmpty>
              Nenhuma partida desta origem ainda.
            </UtilsEmpty>
          )}
        </UtilsIf>
      </UtilsPanel>

      <CreateEntryLogicComponent
        logicData={createEntryLogicData}
        opened={createEntryOpened}
        onClose={() => setCreateEntryOpened(false)}
      />
    </>
  );
}
