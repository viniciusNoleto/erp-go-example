---
paths:
  - "frontend/**"
---

# Organização de arquivos do front (`frontend/src/`)

O alias `@/*` aponta para `frontend/src/*`.

```
src/
├── app/                      rotas (App Router); ver frontend-routes.md
│   ├── _components/          peças só da apresentação (/)
│   └── (app)/{rota}/
│       ├── page.tsx
│       └── _components/      peças só desta rota
├── components/               SÓ componentes globais, por contexto (tabela abaixo)
├── resources/{recurso}/      módulos da API (enums, logics, models, services…)
├── shared/constants/         constantes globais (ROUTES)
├── shared/types/             tipos globais (PayloadBody, QueryFnCtx, Path…)
├── styles/                   globals.css (o único CSS) e as classes compartilhadas (screens.ts, table.ts)
├── utils/                    funções puras e hooks sem UI (appClient, format, state, hooks, cn)
├── theme.ts / tokens.ts      tema do Mantine e tokens de design (lidos também pelo Tailwind)
```

## `components/` — uma pasta por contexto, nome com o prefixo do contexto

| Pasta | O que mora lá | Prefixo do componente |
|---|---|---|
| `form/` | Wrappers de input, `Form`, `FormDrawer`, `FormItemLines` | `Form` (`FormTextInput`, `FormDrawer`) |
| `utils/` | Blocos de exibição genéricos (`If`, `For`, `Panel`, `Money`, `Status`, `Clip`, `Empty`, `Fail`, `Proof`, `SkeletonRows`) | `Utils` (`UtilsPanel`, `UtilsMoney`) |
| `layout/` | A casca do app (`AppFrame`) e o cabeçalho das telas | `App` (`AppPageHeader`) |
| `ledger/` | Peças de partidas dobradas usadas por vários resources (prévia do lançamento) | `Ledger` |
| `stage/` | O palco das animações de lançamento, `useStage`, `usePostingMutation` | `Stage` |
| `chart/`, `brand/` | Gráfico de linha; marca e logotipo | `Chart`, `Brand` |

Arquivo sem o prefixo (`components/utils/Panel.tsx`), componente com o prefixo (`UtilsPanel`). Nunca deixe um componente solto na raiz de `components/`.

**Nunca crie em `components/` uma pasta com nome de rota ou feature** (`components/sales/`). Se só faz sentido numa rota, vai para `_components/` dela:

| Situação | Local |
|---|---|
| Usado por várias rotas/resources, sem ligação com uma tela | `components/{contexto}/` |
| Usado só por uma rota | `app/(app)/{rota}/_components/` (prefixo com o nome da tela: `PurchasesCashStrip`) |
| Ação sobre um recurso (criar, receber, agendar…) | `resources/{recurso}/logics/` |

## `resources/` — um módulo por recurso da API

Nome do módulo no **singular** (kebab-case se composto); subpastas no **plural**:

```
resources/
├── account/  entry/  overview/  posting/  product/  purchase/  sale/
│   ├── enums/      E{Nome}.ts — slugs da API (frontend-resources-enums.md)
│   ├── fragments/  seções de página ligadas ao recurso (quando houver)
│   ├── logics/     {Acao}.tsx — hook + UI de uma ação (frontend-resources-logic.md)
│   ├── models/     {Recurso}.ts — interface I{Recurso} (frontend-resources-models.md)
│   ├── schemas/    schemas Yup compartilhados entre logics (quando houver)
│   └── services/   {verbo}{Recurso}.ts — uma chamada HTTP por arquivo (frontend-resources-services.md)
```
