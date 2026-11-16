import { appClient } from '@/utils/appClient';
import type { QueryFnCtx } from '@/shared/types/tanstack';
import type { IProduct } from '../models/Product';

export const GET_PRODUCTS_KEY = ['get-products'];

export function getProductsService({ signal }: QueryFnCtx) {
  return appClient.get<IProduct[]>('/api/products', { signal });
}
