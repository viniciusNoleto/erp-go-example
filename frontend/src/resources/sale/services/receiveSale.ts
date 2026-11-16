import { appClient } from '@/utils/appClient';
import type { ISalePosting } from '../models/Sale';

export function receiveSaleService({ saleId }: { saleId: number }) {
  return appClient.post<ISalePosting>(`/api/sales/${saleId}/receive`, { body: {} });
}
