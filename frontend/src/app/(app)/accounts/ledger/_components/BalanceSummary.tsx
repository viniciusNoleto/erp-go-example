import { UtilsIf } from '@/components/utils/If';
import { UtilsMoney } from '@/components/utils/Money';
import type { IAccount } from '@/resources/account/models/Account';
import { s } from '@/styles/screens';

/** Ao lado do gráfico: os totais de débito e crédito, o reservado e o saldo. */
export function LedgerBalanceSummary({ account, debitNormal }: { account: IAccount; debitNormal: boolean }) {
  return (
    <dl>
      <div className={s.kv}>
        <dt>
          Total de débitos
        </dt>

        <dd>
          <UtilsMoney cents={account.debitsCents} />
        </dd>
      </div>

      <div className={s.kv}>
        <dt>
          Total de créditos
        </dt>

        <dd>
          <UtilsMoney cents={account.creditsCents} />
        </dd>
      </div>

      <UtilsIf condition={account.reservedCents > 0}>
        {() => (
          <div className={s.kv}>
            <dt>
              Reservado para pagamentos
            </dt>

            <dd>
              <UtilsMoney cents={account.reservedCents} />
            </dd>
          </div>
        )}
      </UtilsIf>

      <div className={s.kvTotal}>
        <dt>
          Saldo

          <span className={s.kvSub}>
            {`cresce no ${debitNormal ? 'débito' : 'crédito'}`}
          </span>
        </dt>

        <dd>
          <UtilsMoney cents={account.balanceCents} />
        </dd>
      </div>
    </dl>
  );
}
