/** A cena que o palco toca para cada operação gravada (`scene`). */
export enum EPostingScene {
  SALE = 'sale',
  RECEIPT = 'receipt',
  PURCHASE = 'purchase',
  PAYMENT_SCHEDULED = 'payment_scheduled',
  PAYMENT_CONFIRMED = 'payment_confirmed',
  PAYMENT_CANCELLED = 'payment_cancelled',
  EXPENSE = 'expense',
  CAPITAL = 'capital',
  MANUAL = 'manual',
}
