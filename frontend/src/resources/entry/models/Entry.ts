import type { IAccountRef } from '@/resources/account/models/Account';
import type { EEntryKind } from '../enums/EntryKind';
import type { EEntryPhase } from '../enums/EntryPhase';

/** Uma partida do razão: um débito e um crédito de mesmo valor. */
export interface IEntry {
  id: string;
  kind: EEntryKind;
  debit: IAccountRef;
  credit: IAccountRef;
  amountCents: number;
  phase: EEntryPhase;
  /** Só nas reservas: como ela foi resolvida. */
  resolved?: EEntryPhase.POST | EEntryPhase.VOID;
  pendingId?: string;
  postingId: string;
  memo: string;
  docType?: 'sale' | 'purchase';
  docId?: number;
  timestamp: string;
}
