import { appClient } from '@/utils/appClient';
import type { PayloadBody } from '@/shared/types/api';
import type { IPosting } from '@/resources/posting/models/Posting';
import type { EManualEntryKind } from '../enums/ManualEntryKind';

export type CreateEntryServicePayload = {
  kind: EManualEntryKind;
  debit: number;
  credit: number;
  amountCents: number;
  memo: string;
};

export function createEntryService({ body }: PayloadBody<CreateEntryServicePayload>) {
  return appClient.post<IPosting>('/api/journal', { body });
}
