/** De onde veio o lançamento (`kind`). */
export enum EEntryKind {
  CAPITAL = 'capital',
  SALE_REVENUE = 'sale_revenue',
  SALE_COST = 'sale_cost',
  RECEIPT = 'receipt',
  PURCHASE = 'purchase',
  PAYMENT = 'payment',
  EXPENSE = 'expense',
  MANUAL = 'manual',
}

/** O nome de cada origem, como aparece na segunda linha do diário. */
export const ENTRY_KIND_LABEL: Record<EEntryKind, string> = {
  [EEntryKind.CAPITAL]: 'Aporte',
  [EEntryKind.SALE_REVENUE]: 'Venda',
  [EEntryKind.SALE_COST]: 'Baixa de estoque',
  [EEntryKind.RECEIPT]: 'Recebimento',
  [EEntryKind.PURCHASE]: 'Compra',
  [EEntryKind.PAYMENT]: 'Pagamento',
  [EEntryKind.EXPENSE]: 'Despesa',
  [EEntryKind.MANUAL]: 'Manual',
};
