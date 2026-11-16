import { appClient } from '@/utils/appClient';
import type { QueryFnCtx } from '@/shared/types/tanstack';
import type { ISale } from '../models/Sale';

export const GET_SALES_KEY = ['get-sales'];

export function getSalesService({ signal }: QueryFnCtx) {
  return appClient.get<ISale[]>('/api/sales', { signal });
}
