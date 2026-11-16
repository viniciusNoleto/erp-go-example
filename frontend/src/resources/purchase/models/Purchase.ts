import type { IPosting } from '@/resources/posting/models/Posting';
import type { IProductItem } from '@/resources/product/models/ProductItem';
import type { EPurchaseStatus } from '../enums/PurchaseStatus';

export interface IPurchase {
  id: number;
  supplier: string;
  status: EPurchaseStatus;
  totalCents: number;
  items: IProductItem[];
  createdAt: string;
}

/** O que as operações de compra devolvem: a compra e o lançamento gravado. */
export interface IPurchasePosting {
  purchase: IPurchase;
  posting: IPosting;
}
