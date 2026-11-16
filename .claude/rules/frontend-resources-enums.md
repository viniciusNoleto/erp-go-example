---
paths:
  - "frontend/**"
---

# Resources — Enums

Ficam em `resources/{recurso}/enums/{Nome}.ts`, um enum por arquivo.

Todo valor fixo que vem da API ou vai para ela (`status`, `type`, `kind`, `phase`, `scene`) vira um **string enum** com prefixo `E`: chave em UPPER_SNAKE_CASE, valor = o slug exato da API.

```ts
// resources/purchase/enums/PurchaseStatus.ts
export enum EPurchaseStatus {
  OPEN = 'open',
  SCHEDULED = 'scheduled',
  PAID = 'paid',
}
```

- Compare sempre com o enum (`purchase.status === EPurchaseStatus.PAID`), nunca com a string solta (`'paid'`).
- Números fixos do domínio também viram enum numérico quando as telas os consultam pelo nome (`EAccountId.CASH = 1101`).
- **O rótulo de exibição** do enum pode ficar no mesmo arquivo, como `Record<EEnum, string>` chamado `{NOME}_LABEL` (`ACCOUNT_TYPE_LABEL`, `ENTRY_KIND_LABEL`), junto com uma ordem canônica quando houver (`ACCOUNT_TYPE_ORDER`).
- Não crie enum para unions de objetos, nem para tipos que misturam string com outros primitivos.
