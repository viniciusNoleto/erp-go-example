import { appClient } from '@/utils/appClient';
import type { IPurchasePosting } from '../models/Purchase';

/** Primeira fase: reserva o valor no caixa. */
export function schedulePurchasePaymentService({ purchaseId }: { purchaseId: number }) {
  return appClient.post<IPurchasePosting>(`/api/purchases/${purchaseId}/schedule-payment`, { body: {} });
}
