import type { IPosting } from '@/resources/posting/models/Posting';
import type { IProductItem } from '@/resources/product/models/ProductItem';
import type { ESaleStatus } from '../enums/SaleStatus';

export interface ISale {
  id: number;
  customer: string;
  status: ESaleStatus;
  totalCents: number;
  costCents: number;
  items: IProductItem[];
  createdAt: string;
}

/** O que as operações de venda devolvem: a venda e o lançamento gravado. */
export interface ISalePosting {
  sale: ISale;
  posting: IPosting;
}
