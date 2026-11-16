import { EEntryKind } from '@/resources/entry/enums/EntryKind';
import type { IEntry } from '@/resources/entry/models/Entry';

/** Os filtros do diário por origem do lançamento. */
export const JOURNAL_FILTERS: { value: string; label: string; match: (entry: IEntry) => boolean }[] = [
  { value: 'all', label: 'Todos', match: () => true },
  {
    value: 'sales',
    label: 'Vendas',
    match: (entry) => [EEntryKind.SALE_REVENUE, EEntryKind.SALE_COST, EEntryKind.RECEIPT].includes(entry.kind),
  },
  { value: 'purchases', label: 'Compras', match: (entry) => [EEntryKind.PURCHASE, EEntryKind.PAYMENT].includes(entry.kind) },
  { value: 'expenses', label: 'Despesas', match: (entry) => entry.kind === EEntryKind.EXPENSE },
  { value: 'other', label: 'Outros', match: (entry) => [EEntryKind.CAPITAL, EEntryKind.MANUAL].includes(entry.kind) },
];
