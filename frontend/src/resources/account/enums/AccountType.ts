/** A natureza da conta, como a API manda (`type`). */
export enum EAccountType {
  ASSET = 'asset',
  LIABILITY = 'liability',
  EQUITY = 'equity',
  REVENUE = 'revenue',
  EXPENSE = 'expense',
}

/** O nome de cada natureza na interface. */
export const ACCOUNT_TYPE_LABEL: Record<EAccountType, string> = {
  [EAccountType.ASSET]: 'Ativo',
  [EAccountType.LIABILITY]: 'Passivo',
  [EAccountType.EQUITY]: 'Patrimônio líquido',
  [EAccountType.REVENUE]: 'Receita',
  [EAccountType.EXPENSE]: 'Despesas e custos',
};

/** A ordem do plano de contas: o primeiro dígito do número de cada conta. */
export const ACCOUNT_TYPE_ORDER: EAccountType[] = [
  EAccountType.ASSET,
  EAccountType.LIABILITY,
  EAccountType.EQUITY,
  EAccountType.REVENUE,
  EAccountType.EXPENSE,
];
