import { appClient } from '@/utils/appClient';
import type { PayloadBody } from '@/shared/types/api';
import type { IPurchasePosting } from '../models/Purchase';

export type CreatePurchaseServicePayload = {
  supplier: string;
  items: { productId: number; qty: number; unitCostCents: number }[];
};

export function createPurchaseService({ body }: PayloadBody<CreatePurchaseServicePayload>) {
  return appClient.post<IPurchasePosting>('/api/purchases', { body });
}
