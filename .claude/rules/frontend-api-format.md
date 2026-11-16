---
paths:
  - "frontend/**"
---

# Formato da API Go (como o front a consome)

A API é o backend Go deste repositório (`backend/internal/app/views.go`), e o front se adapta a ela — não o contrário:

- **Chaves em camelCase**, como as struct tags `json:"..."` do Go (`balanceCents`, `createdAt`). As interfaces `I{Recurso}` espelham exatamente isso.
- **Sem envelope**: o corpo da resposta é o próprio recurso (`IAccount[]`, `ISalePosting`), não `{ success, data, message }`.
- **Dinheiro em centavos inteiros** (`*Cents`). Nunca trafegue reais com casas decimais; a conversão fica nos componentes (`FormMoneyInput`, `UtilsMoney`, `moneyFull`).
- **Erros** chegam como `{ "error": { "code", "message" } }` com status 4xx/5xx; o `appClient` (`src/utils/appClient.ts`) os transforma em `ApiError(code, message)`. A mensagem já vem em português, pronta para a tela.
- `ApiError.refused` (`insufficient_funds`, `insufficient_stock`) é a recusa do razão: vira a cena de recusa no palco, não um erro de formulário (ver `usePostingMutation`).
- O front chama sempre `/api/...` relativo: em dev o `next dev` repassa ao backend, em produção o nginx.
