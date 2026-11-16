import { appClient } from '@/utils/appClient';
import type { IPurchasePosting } from '../models/Purchase';

/** Segunda fase: efetiva a reserva (o dinheiro sai do caixa). */
export function confirmPurchasePaymentService({ purchaseId }: { purchaseId: number }) {
  return appClient.post<IPurchasePosting>(`/api/purchases/${purchaseId}/confirm-payment`, { body: {} });
}
