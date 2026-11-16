import { Paper, Skeleton } from '@mantine/core';

import { UtilsIf } from '@/components/utils/If';
import { UtilsMoney } from '@/components/utils/Money';
import { UtilsProofIcon } from '@/components/utils/Proof';
import { s } from '@/styles/screens';
import { cn } from '@/utils/cn';
import { moneyFull } from '@/utils/format';

type AccountsEquationTotals = {
  assets: number;
  liabilities: number;
  equity: number;
  net: number;
};

/** A equação patrimonial em uma linha: ativo = passivo + patrimônio + resultado. */
export function AccountsEquationPanel({ totals, loading }: { totals: AccountsEquationTotals; loading: boolean }) {
  const { assets, liabilities, equity, net } = totals;
  const balanced = assets === liabilities + equity + net;

  return (
    <Paper
      component="section"
      aria-label="Equação patrimonial"
      mb={16}
      className="bg-surface"
    >
      <div className={s.equation}>
        <EquationCell
          label="Ativo"
          cents={assets}
          lead
          loading={loading}
        />

        <EquationOperator
          sign="="
          label="igual a"
        />

        <EquationCell
          label="Passivo"
          cents={liabilities}
          loading={loading}
        />

        <EquationOperator
          sign="+"
          label="mais"
        />

        <EquationCell
          label="Patrimônio líquido"
          cents={equity}
          loading={loading}
        />

        <EquationOperator
          sign="+"
          label="mais"
        />

        <EquationCell
          label="Resultado acumulado"
          cents={net}
          loading={loading}
        />
      </div>

      <UtilsIf condition={!loading}>
        {() => (
          <p className={s.eqProof}>
            <UtilsProofIcon ok={balanced} />

            <span>
              <strong>
                {balanced ? 'Os dois lados batem.' : 'Os dois lados não batem.'}
              </strong>

              {` Tudo que a empresa tem (${moneyFull(assets)}) veio de alguém: fornecedores (${moneyFull(liabilities)}), sócios (${moneyFull(equity)}) ou o próprio resultado (${moneyFull(net)}).`}
            </span>
          </p>
        )}
      </UtilsIf>
    </Paper>
  );
}

/** Os sinais da equação, no serifado da marca, como num livro. */
function EquationOperator({ sign, label }: { sign: string; label: string }) {
  return (
    <span
      className={s.eqOp}
      aria-label={label}
    >
      {sign}
    </span>
  );
}

function EquationCell({ label, cents, lead, loading }: { label: string; cents: number; lead?: boolean; loading: boolean }) {
  return (
    <div className={cn(s.eqCell, lead && s.eqLead)}>
      <span className={s.eqLabel}>
        {label}
      </span>

      <span className={s.eqValue}>
        <UtilsIf
          cases={[
            {
              condition: loading,
              content: () => (
                <Skeleton
                  height={24}
                  width={140}
                  radius={4}
                />
              ),
            },
            {
              content: () => <UtilsMoney cents={cents} />,
            },
          ]}
        />
      </span>
    </div>
  );
}
