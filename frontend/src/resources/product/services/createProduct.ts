import { appClient } from '@/utils/appClient';
import type { PayloadBody } from '@/shared/types/api';
import type { IProduct } from '../models/Product';

export type CreateProductServicePayload = {
  sku: string;
  name: string;
  priceCents: number;
};

export function createProductService({ body }: PayloadBody<CreateProductServicePayload>) {
  return appClient.post<IProduct>('/api/products', { body });
}
