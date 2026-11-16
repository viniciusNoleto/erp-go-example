import { cn } from '@/utils/cn';
import { money } from '@/utils/format';

/**
 * Dinheiro: "R$" pequeno e cinza, o número em algarismos tabulares.
 * `sign` põe o + nos positivos (variações); o − dos negativos é sempre o sinal
 * de menos tipográfico, da mesma largura dos algarismos.
 */
export function UtilsMoney({ cents, sign = false, muted = false }: { cents: number; sign?: boolean; muted?: boolean }) {
  const prefix = cents < 0 ? '−' : sign && cents > 0 ? '+' : '';

  return (
    <span className={cn('tabular-nums', muted && 'text-muted')}>
      {/* "R$" menor e em cinza: o número é o que se lê. */}
      <span className="mr-[0.22em] text-[0.8em] font-normal text-muted">
        R$
      </span>

      {prefix}

      {money(Math.abs(cents))}
    </span>
  );
}
