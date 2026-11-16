---
paths:
  - "frontend/**"
---

# Resources — Services

Um arquivo por endpoint em `resources/{recurso}/services/{verbo}{Recurso}.ts`. Só a chamada HTTP, via `appClient` (`src/utils/appClient.ts`) — nenhuma regra de negócio.

```
resources/purchase/services/
├── getPurchases.ts             GET  /api/purchases
├── createPurchase.ts           POST /api/purchases
├── schedulePurchasePayment.ts  POST /api/purchases/:id/schedule-payment
├── confirmPurchasePayment.ts   POST /api/purchases/:id/confirm-payment
└── cancelPurchasePayment.ts    POST /api/purchases/:id/cancel-payment
```

## GET — lista

```ts
import { appClient } from '@/utils/appClient';
import type { QueryFnCtx } from '@/shared/types/tanstack';
import type { IPurchase } from '../models/Purchase';

export const GET_PURCHASES_KEY = ['get-purchases'];

export function getPurchasesService({ signal }: QueryFnCtx) {
  return appClient.get<IPurchase[]>('/api/purchases', { signal });
}
```

Com query params: tipo `Get{Recurso}ServiceQuery` + `PayloadQuery<T>`, serializado com `URLSearchParams`. Se o mesmo endpoint é consultado com parâmetros diferentes ao mesmo tempo (o diário com 200 linhas e a visão geral com 5), a query key vira função do parâmetro: `GET_ENTRIES_KEY = (limit: number) => ['get-entries', limit]`.

## GET — item

```ts
export const GET_ACCOUNT_KEY = (accountId: number) => ['get-account', accountId];

export function getAccountService({ signal, accountId }: QueryFnCtx & { accountId: number }) {
  return appClient.get<IAccountDetail>(`/api/accounts/${accountId}`, { signal });
}
```

## POST — criação e ações

```ts
export type CreateSaleServicePayload = {
  customer: string;
  items: { productId: number; qty: number }[];
};

export function createSaleService({ body }: PayloadBody<CreateSaleServicePayload>) {
  return appClient.post<ISalePosting>('/api/sales', { body });
}

// Ação sem corpo: body {}.
export function receiveSaleService({ saleId }: { saleId: number }) {
  return appClient.post<ISalePosting>(`/api/sales/${saleId}/receive`, { body: {} });
}
```

## Regras

- Toda função exportada termina em `Service` (`getSalesService`, nunca `getSales`).
- O genérico do `appClient` é sempre a interface do model, nunca `any`.
- Serviços GET exportam a query key (`GET_{RECURSO}S_KEY` / `GET_{RECURSO}_KEY`) e recebem `signal`; mutações não.
- Nas telas, a consulta é `useQuery({ queryKey: GET_X_KEY, queryFn: getXService })` — sempre com a key exportada, para todo lugar compartilhar o mesmo cache.

| Elemento | Padrão | Exemplo |
|---|---|---|
| Função | `{verbo}{Recurso}Service` | `createPurchaseService` |
| Tipo de query | `Get{Recurso}ServiceQuery` | `GetEntriesServiceQuery` |
| Tipo de payload | `{Verbo}{Recurso}ServicePayload` | `CreateSaleServicePayload` |
| Query key (lista / item) | `GET_{RECURSO}S_KEY` / `GET_{RECURSO}_KEY` | `GET_SALES_KEY`, `GET_ACCOUNT_KEY` |
