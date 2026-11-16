import { appClient } from '@/utils/appClient';
import type { PayloadBody } from '@/shared/types/api';
import type { ISalePosting } from '../models/Sale';

export type CreateSaleServicePayload = {
  customer: string;
  items: { productId: number; qty: number }[];
};

export function createSaleService({ body }: PayloadBody<CreateSaleServicePayload>) {
  return appClient.post<ISalePosting>('/api/sales', { body });
}
