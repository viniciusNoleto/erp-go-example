import type { EAccountType } from '../enums/AccountType';
import type { IEntry } from '@/resources/entry/models/Entry';

/** A conta resumida, como aparece dentro de um lançamento. */
export interface IAccountRef {
  id: number;
  name: string;
  type: EAccountType;
}

/** A conta com os saldos lidos do TigerBeetle. */
export interface IAccount extends IAccountRef {
  noOverdraft: boolean;
  balanceCents: number;
  reservedCents: number;
  debitsCents: number;
  creditsCents: number;
}

/** Um ponto da evolução do saldo: o saldo logo depois de um lançamento. */
export interface ISeriesPoint {
  at: string;
  cents: number;
}

/** O razonete de uma conta: a conta, os lançamentos e a evolução do saldo. */
export interface IAccountDetail {
  account: IAccount;
  entries: IEntry[];
  series: ISeriesPoint[];
}
