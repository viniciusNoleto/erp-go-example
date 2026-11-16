---
paths:
  - "frontend/**"
---

# Resources — Models

Ficam em `resources/{recurso}/models/{Recurso}.ts`.

## Interface — sempre necessária

Espelha exatamente o JSON da API (camelCase, ver `frontend-api-format.md`). Nome com prefixo `I`. Use-a para tipar parâmetros, retornos de serviços e estado.

```ts
// resources/sale/models/Sale.ts
import type { ESaleStatus } from '../enums/SaleStatus';

export interface ISale {
  id: number;
  customer: string;
  status: ESaleStatus;
  totalCents: number;
  items: IProductItem[];
  createdAt: string;
}

/** O que as operações de venda devolvem: a venda e o lançamento gravado. */
export interface ISalePosting {
  sale: ISale;
  posting: IPosting;
}
```

- Respostas compostas (`{ sale, posting }`) ganham a própria interface no model do recurso principal.
- Interface usada por vários recursos fica no recurso dono do dado (`IProductItem` em `product/`, `IAccountRef` em `account/`) e é importada pelos outros.

## Classe model — só quando precisar transformar os dados

Crie a classe `{Recurso}` (sem `I`) apenas quando o dado precisar ser normalizado depois de chegar (arrays que podem vir `null`, campos derivados). O construtor recebe a interface. Na maioria dos casos a interface basta; não crie a classe por padrão.

## Proibido: reexportar enums nos models

Não crie `export type X = EEnum` em arquivo de model. Importe o enum de `../enums/` onde precisar e use-o direto no campo da interface (`status: ESaleStatus`).
