import { Skeleton } from '@mantine/core';

import { UtilsIf } from '@/components/utils/If';
import { UtilsMoney } from '@/components/utils/Money';
import { UtilsPanel } from '@/components/utils/Panel';
import { UtilsProof } from '@/components/utils/Proof';
import { EAccountType } from '@/resources/account/enums/AccountType';
import type { IOverview } from '@/resources/overview/models/Overview';
import { s } from '@/styles/screens';
import { moneyFull, percent } from '@/utils/format';

const sumType = (overview: IOverview, type: EAccountType) =>
  overview.accounts.filter((account) => account.type === type).reduce((sum, account) => sum + account.balanceCents, 0);

/** O resultado desde a abertura e a prova de que o balancete fecha. */
export function OverviewResultPanel({ overview }: { overview?: IOverview }) {
  return (
    <UtilsPanel
      title="Resultado"
      meta="desde a abertura"
      className={s.span4}
    >
      <UtilsIf
        cases={[
          {
            condition: !!overview,
            content: () => <ResultBody overview={overview!} />,
          },
          {
            content: () => (
              <Skeleton
                height={260}
                radius={4}
              />
            ),
          },
        ]}
      />
    </UtilsPanel>
  );
}

function ResultBody({ overview: o }: { overview: IOverview }) {
  // A equação patrimonial, com os valores como aparecem na tela.
  const assets = sumType(o, EAccountType.ASSET);
  const claims = sumType(o, EAccountType.LIABILITY) + sumType(o, EAccountType.EQUITY) + o.netCents;
  const balanced = o.totalDebitsCents === o.totalCreditsCents && assets === claims;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <dl>
        <div className={s.kv}>
          <dt>
            Receita de vendas
          </dt>

          <dd>
            <UtilsMoney cents={o.revenueCents} />
          </dd>
        </div>

        <div className={s.kv}>
          <dt>
            Custo das mercadorias
          </dt>

          <dd>
            <UtilsMoney cents={-o.cogsCents} />
          </dd>
        </div>

        <div className={s.kv}>
          <dt>
            Lucro bruto
          </dt>

          <dd>
            <UtilsMoney cents={o.revenueCents - o.cogsCents} />
          </dd>
        </div>

        <div className={s.kv}>
          <dt>
            Despesas operacionais
          </dt>

          <dd>
            <UtilsMoney cents={-o.expensesCents} />
          </dd>
        </div>

        <div className={s.kvTotal}>
          <dt>
            Resultado

            <UtilsIf condition={o.revenueCents > 0}>
              {() => (
                <span className={s.kvSub}>
                  {`${percent(o.netCents / o.revenueCents)} da receita`}
                </span>
              )}
            </UtilsIf>
          </dt>

          <dd className={o.netCents < 0 ? 'text-negative' : undefined}>
            <UtilsMoney cents={o.netCents} />
          </dd>
        </div>
      </dl>

      <UtilsProof
        ok={balanced}
        className={s.proof}
      >
        <strong>
          {balanced ? 'O balancete fecha.' : 'O balancete não fecha.'}
        </strong>

        {` Débitos e créditos somam ${moneyFull(o.totalDebitsCents)}; o ativo de ${moneyFull(assets)} é igual a passivo, patrimônio e resultado.`}
      </UtilsProof>
    </div>
  );
}
