import { UtilsMoney } from '@/components/utils/Money';

/**
 * Uma partida na prévia do formulário: a conta debitada e a creditada, e o
 * valor que vai de uma para a outra. É o que o TigerBeetle vai gravar.
 */
export function LedgerLegPreview({ debit, credit, cents }: { debit: string; credit: string; cents: number }) {
  return (
    <div className="grid grid-cols-[24px_1fr_auto] gap-x-2 gap-y-1 border-t border-rule py-2.5 text-14">
      <span className="text-muted">
        D
      </span>

      <span>
        {debit}
      </span>

      <span className="row-span-2 self-center font-semibold">
        <UtilsMoney cents={cents} />
      </span>

      <span className="text-muted">
        C
      </span>

      <span>
        {credit}
      </span>
    </div>
  );
}
