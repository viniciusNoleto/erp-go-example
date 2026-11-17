'use client';

import { Skeleton } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { ChartLine } from '@/components/chart/Line';
import { AppPageHeader } from '@/components/layout/PageHeader';
import { UtilsEmpty } from '@/components/utils/Empty';
import { UtilsFail } from '@/components/utils/Fail';
import { UtilsIf } from '@/components/utils/If';
import { UtilsMoney } from '@/components/utils/Money';
import { UtilsPanel } from '@/components/utils/Panel';
import { ACCOUNT_TYPE_LABEL, EAccountType } from '@/resources/account/enums/AccountType';
import { GET_ACCOUNT_KEY, getAccountService } from '@/resources/account/services/getAccount';
import { EEntryPhase } from '@/resources/entry/enums/EntryPhase';
import { ROUTES } from '@/shared/constants/routes';
import { s } from '@/styles/screens';
import { cn } from '@/utils/cn';
import { moneyFull, plural } from '@/utils/format';
import { useDocumentTitle } from '@/utils/hooks';

import { LedgerBalanceSummary } from './_components/BalanceSummary';
import { LedgerTAccountSide } from './_components/TAccountSide';

/** O parâmetro da query string com o número da conta (/accounts/ledger?account=1101). */
const ACCOUNT_PARAM = 'account';

const BACK = { href: ROUTES.accounts, label: 'Plano de contas' };

/** Uma metade do total: no celular, o rótulo em cima do valor. */
const TOTAL = 'flex justify-between gap-3 max-sm:flex-col max-sm:gap-0';

export default function AccountLedgerPage() {
  return (
    <Suspense>
      <AccountLedger />
    </Suspense>
  );
}

/**
 * O razonete de uma conta. A pergunta: por que o saldo é este?
 * À esquerda, os débitos; à direita, os créditos; embaixo, os totais. Ao
 * lado, a evolução do saldo depois de cada lançamento.
 */
function AccountLedger() {
  const accountId = Number(useSearchParams().get(ACCOUNT_PARAM)) || 0;

  const {
    data: detail,
    isLoading: detailIsLoading,
    error: detailError,
    refetch: detailRefetch,
  } = useQuery({
    queryKey: GET_ACCOUNT_KEY(accountId),
    queryFn: ({ signal }) => getAccountService({ signal, accountId }),
    enabled: accountId > 0,
  });

  useDocumentTitle(detail ? `${detail.account.id} ${detail.account.name}` : undefined);

  if (detailError || accountId === 0) {
    return (
      <>
        <AppPageHeader
          title="Conta"
          back={BACK}
        />

        <UtilsPanel title="Razonete">
          <UtilsIf
            cases={[
              {
                condition: accountId === 0,
                content: () => (
                  <UtilsEmpty>
                    Escolha uma conta no plano de contas.
                  </UtilsEmpty>
                ),
              },
              {
                content: () => (
                  <UtilsFail
                    error={detailError}
                    retry={detailRefetch}
                  />
                ),
              },
            ]}
          />
        </UtilsPanel>
      </>
    );
  }

  const account = detail?.account;
  const entries = detail?.entries ?? [];

  // No razonete entram os lançamentos efetivados e as reservas ainda abertas.
  // Reserva já resolvida não entra: a confirmação conta no lugar dela, e a
  // cancelada nunca chegou a mexer no saldo.
  const shown = entries.filter(
    (entry) => entry.phase === EEntryPhase.SINGLE || entry.phase === EEntryPhase.POST || (entry.phase === EEntryPhase.PENDING && !entry.resolved),
  );
  const debits = shown.filter((entry) => entry.debit.id === accountId);
  const credits = shown.filter((entry) => entry.credit.id === accountId);
  const debitNormal = account?.type === EAccountType.ASSET || account?.type === EAccountType.EXPENSE;
  const series = (detail?.series ?? []).map((point) => ({ t: new Date(point.at).getTime(), v: point.cents }));

  return (
    <>
      <AppPageHeader
        title={account ? account.name : 'Conta'}
        back={BACK}
      >
        <UtilsIf
          cases={[
            {
              condition: !!account,
              content: () => (
                <>
                  {`Conta ${account!.id}. `}

                  <strong>
                    {`Saldo de ${moneyFull(account!.balanceCents)}`}
                  </strong>

                  {account!.reservedCents > 0 ? `, com ${moneyFull(account!.reservedCents)} reservados` : ''}

                  {`. Conta de ${ACCOUNT_TYPE_LABEL[account!.type].toLowerCase()}: cresce no ${debitNormal ? 'débito' : 'crédito'}.`}
                </>
              ),
            },
            {
              content: () => 'Lendo a conta no livro-razão…',
            },
          ]}
        />
      </AppPageHeader>

      <UtilsPanel
        title="Evolução do saldo"
        meta={detail ? plural(series.length, 'lançamento', 'lançamentos') : null}
        className="mb-4"
      >
        <div className={s.chartSplit}>
          <UtilsIf
            cases={[
              {
                condition: detailIsLoading,
                content: () => (
                  <Skeleton
                    height={200}
                    radius={4}
                  />
                ),
              },
              {
                condition: series.length > 0,
                content: () => (
                  <ChartLine
                    points={series}
                    height={200}
                    label={`Saldo de ${account?.name ?? 'conta'} após cada lançamento`}
                  />
                ),
              },
              {
                content: () => (
                  <UtilsEmpty>
                    Esta conta ainda não teve lançamentos. O gráfico começa no primeiro.
                  </UtilsEmpty>
                ),
              },
            ]}
          />

          <UtilsIf condition={account}>
            {() => (
              <LedgerBalanceSummary
                account={account!}
                debitNormal={debitNormal}
              />
            )}
          </UtilsIf>
        </div>
      </UtilsPanel>

      <UtilsPanel
        title="Razonete"
        meta="os mais recentes primeiro"
      >
        <div className="grid grid-cols-2">
          <div className="col-span-full grid grid-cols-2 border-b-2 border-ink pb-2 text-13 font-semibold">
            <span>
              Débito
            </span>

            <span className="text-right">
              Crédito
            </span>
          </div>

          <LedgerTAccountSide
            entries={debits}
            counterpart={(entry) => `de ${entry.credit.name}`}
            label="Débitos"
            className="pr-5 max-sm:pr-2.5"
            loading={detailIsLoading}
            loaded={!!detail}
          />

          <LedgerTAccountSide
            entries={credits}
            counterpart={(entry) => `para ${entry.debit.name}`}
            label="Créditos"
            className="border-l border-ink pl-5 max-sm:pl-2.5"
            loading={detailIsLoading}
            loaded={!!detail}
          />

          <UtilsIf condition={account}>
            {() => (
              <div className="col-span-full grid grid-cols-2 border-t border-ink pt-2.5 text-14 [&_strong]:font-bold [&_strong]:tabular-nums">
                <div className={cn(TOTAL, 'pr-5 max-sm:pr-2.5')}>
                  <span className="text-muted">
                    Total
                  </span>

                  <strong>
                    <UtilsMoney cents={account!.debitsCents} />
                  </strong>
                </div>

                <div className={cn(TOTAL, 'pl-5 max-sm:pl-2.5')}>
                  <span className="text-muted">
                    Total
                  </span>

                  <strong>
                    <UtilsMoney cents={account!.creditsCents} />
                  </strong>
                </div>
              </div>
            )}
          </UtilsIf>
        </div>
      </UtilsPanel>
    </>
  );
}
