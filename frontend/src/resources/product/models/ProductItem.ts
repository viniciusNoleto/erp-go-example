/** Um item de venda ou de compra: o produto, a quantidade e o valor unitário. */
export interface IProductItem {
  productId: number;
  name: string;
  qty: number;
  unitCents: number;
}
