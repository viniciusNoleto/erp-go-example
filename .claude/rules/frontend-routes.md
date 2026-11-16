---
paths:
  - "frontend/**"
---

# Rotas do front

- **Rotas sempre em inglês**: pastas de rota em `src/app/`, segmentos de URL, parâmetros de query e âncoras (`/sales?new=1`, `/accounts/ledger?account=1101`, `#how-it-works`). O texto da interface continua em português.
- Toda rota sai de `ROUTES` em `src/shared/constants/routes.ts`. Nunca escreva o caminho à mão num `href` ou `router.push`.
- O parâmetro que abre a gaveta de criação ao chegar na tela é `OPEN_CREATE_PARAM` (`new`), lido com `useOpenFromQuery` (`src/utils/hooks.ts`).
- O build de produção é `output: 'export'` (estático, servido pelo nginx): **não há rota dinâmica** (`[id]`). Detalhe de um registro vai na query string (`ROUTES.accountLedger(id)` → `/accounts/ledger?account=1101`), lida com `useSearchParams` dentro de `<Suspense>`.
