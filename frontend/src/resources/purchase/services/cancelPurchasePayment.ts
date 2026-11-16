import { appClient } from '@/utils/appClient';
import type { IPurchasePosting } from '../models/Purchase';

/** Segunda fase: cancela a reserva e libera o caixa. */
export function cancelPurchasePaymentService({ purchaseId }: { purchaseId: number }) {
  return appClient.post<IPurchasePosting>(`/api/purchases/${purchaseId}/cancel-payment`, { body: {} });
}
