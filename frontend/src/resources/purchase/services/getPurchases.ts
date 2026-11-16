import { appClient } from '@/utils/appClient';
import type { QueryFnCtx } from '@/shared/types/tanstack';
import type { IPurchase } from '../models/Purchase';

export const GET_PURCHASES_KEY = ['get-purchases'];

export function getPurchasesService({ signal }: QueryFnCtx) {
  return appClient.get<IPurchase[]>('/api/purchases', { signal });
}
