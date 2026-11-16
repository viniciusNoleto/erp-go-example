import type { IAccount, ISeriesPoint } from '@/resources/account/models/Account';

/** A visão geral: os saldos, o resultado e a evolução das contas principais. */
export interface IOverview {
  company: string;
  accounts: IAccount[];
  revenueCents: number;
  cogsCents: number;
  expensesCents: number;
  netCents: number;
  totalDebitsCents: number;
  totalCreditsCents: number;
  /** A evolução do saldo de cada conta principal, pelo número da conta. */
  series: Record<string, ISeriesPoint[]>;
}
