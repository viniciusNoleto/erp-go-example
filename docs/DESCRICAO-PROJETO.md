# GoMoney — descrição técnica e funcional completa

> Documento autocontido para servir de contexto a outra IA. Descreve o projeto inteiro (com foco no backend em Go) de forma que não seja preciso abrir o código.

---

## 1. Visão geral

**GoMoney** é um ERP pequeno, mas funcional, de uma única empresa fictícia — o **Ateliê Pipa Materiais Artísticos**, loja de materiais de arte. Cobre quatro módulos: **vendas, compras, estoque e contabilidade**. O ponto central do projeto é que **todo movimento de dinheiro passa por um livro-razão de partidas dobradas no TigerBeetle** (banco de dados especializado em contabilidade financeira), enquanto o **PostgreSQL** guarda apenas cadastros e textos.

- Objetivo do projeto: vitrine/portfólio para vaga de desenvolvedor Go em contexto de ERP. Por isso o código Go é **intensamente comentado em português**, com analogias para quem vem de React/TypeScript e Laravel/PHP (existe um `docs/GUIA-GO.md` didático).
- Sem autenticação, sem multiempresa, sem impostos, devoluções ou estornos.
- Idioma: interface e comentários em português; **rotas, nomes de código e chaves JSON em inglês**.
- Valores monetários sempre em **centavos inteiros** (nunca float), em toda a pilha: Go (`Money int64`), TigerBeetle (`amount` u128), Postgres (`BIGINT *_cents`) e JSON (`*Cents`).

### Stack

| Camada | Tecnologia |
|---|---|
| Backend | Go (`go.mod` declara `go 1.24`; a imagem compila com `golang:1.27-bookworm`), só biblioteca padrão para HTTP (`net/http` com o roteador do Go 1.22+), `log/slog` para logs JSON |
| Banco relacional | PostgreSQL 16 via `github.com/jackc/pgx/v5` (pool `pgxpool`), SQL escrito à mão, sem ORM |
| Livro-razão | TigerBeetle 0.17.9 via cliente oficial `github.com/tigerbeetle/tigerbeetle-go v0.17.9` (biblioteca nativa, exige cgo) |
| Tempo real | Server-Sent Events (SSE) + pub/sub em memória com goroutines/channels |
| Frontend | Next.js 16 (App Router, exportação estática em produção), React 19, TypeScript 5.9, Mantine 9, TanStack Query 5, Motion (Framer Motion), Tailwind CSS 4, Yup, Tabler Icons |
| Infra | Docker Compose (ambientes `local` e `production`), nginx, Makefile; Playwright para gravar um vídeo de demonstração |

### Arquitetura em uma imagem

```
frontend (Next/React)  ──HTTP/JSON + SSE──▶  backend (Go)
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    ▼                                                     ▼
           Postgres: o TEXTO                                  TigerBeetle: os NÚMEROS
   produtos, vendas, compras, nomes das               contas, lançamentos (transfers), saldos,
   contas, históricos (memos)                         travas de saldo, histórico de saldos
```

A ponte entre os dois bancos:
- o **número da conta** (ex.: 1101) é ao mesmo tempo a PK em `accounts` no Postgres e o `id` da conta no TigerBeetle;
- o **id do "posting"** (histórico textual de um evento de negócio) é a PK da tabela `postings` no Postgres e vai gravado no campo `user_data_128` de cada transferência no TigerBeetle — funciona como um "JOIN" entre os bancos.

---

## 2. Conceitos contábeis implementados

- **Partidas dobradas**: todo lançamento é um débito em uma conta e um crédito em outra, de mesmo valor. Débito/crédito são só "lados".
- **Natureza das contas** (`AccountType`, gravado no campo `code` da conta no TigerBeetle):
  - `1 Asset` (ativo), `2 Liability` (passivo), `3 Equity` (patrimônio líquido), `4 Revenue` (receita), `5 Expense` (despesa/custo).
  - Ativo e despesa são de **natureza devedora** (`DebitNormal() == true`): saldo = débitos − créditos. Os demais são credores: saldo = créditos − débitos.
- **Numeração do plano de contas**: 4 dígitos; o primeiro dígito é o tipo (1 ativo, 2 passivo, 3 PL, 4 receita, 5 despesa) — convenção brasileira. `NewAccount` rejeita conta cujo primeiro dígito não bate com o tipo.
- **Plano de contas padrão** (`DefaultChart`):

| Nº | Nome | Tipo | Trava "não pode ficar negativa" |
|---|---|---|---|
| 1101 | Caixa e bancos | ativo | **sim** |
| 1102 | Clientes a receber | ativo | não |
| 1103 | Estoque de mercadorias | ativo | **sim** |
| 2101 | Fornecedores a pagar | passivo | não |
| 3101 | Capital social | PL | não |
| 4101 | Receita de vendas | receita | não |
| 5101 | Custo das mercadorias vendidas (CMV) | despesa | não |
| 5201 | Despesas operacionais | despesa | não |

- **Custo médio ponderado** do estoque: a cada entrada, `novo custo = (custo médio × estoque + custo unitário × qtd) / estoque total` (divisão inteira em centavos, então há arredondamento).
- **Lançamento em duas fases** (two-phase transfer): uma transferência *pendente* reserva o valor (como pré-autorização de cartão); depois uma segunda transferência a *efetiva* (`post`) ou *cancela* (`void`).
- **Imutabilidade**: lançamentos nunca são alterados nem apagados; corrige-se com outro lançamento.
- **Balancete**: soma de todos os débitos = soma de todos os créditos (verdadeiro por construção no TigerBeetle; o front exibe a prova).
- **Equação patrimonial** (exibida no front): Ativo = Passivo + PL + Resultado acumulado.

---

## 3. Funcionalidades (o que o usuário faz e o que acontece no livro-razão)

| Tela | Ação | Lançamentos no TigerBeetle |
|---|---|---|
| Vendas | Faturar venda (a prazo) | Duas pernas **encadeadas/atômicas**: `D 1102 Clientes a receber / C 4101 Receita` (pelo preço) e `D 5101 CMV / C 1103 Estoque` (pelo custo médio). Baixa o estoque. |
| Vendas | Receber | `D 1101 Caixa / C 1102 Clientes a receber` (valor total da venda) |
| Compras | Dar entrada na mercadoria | `D 1103 Estoque / C 2101 Fornecedores` e recalcula o custo médio de cada produto |
| Compras | Agendar pagamento | Transferência **pendente** `D 2101 Fornecedores / C 1101 Caixa` — reserva o valor no caixa |
| Compras | Confirmar pagamento | Segunda fase `post` da reserva (efetiva o valor inteiro) |
| Compras | Cancelar agendamento | Segunda fase `void` (libera a reserva); a compra volta para "a pagar" |
| Lançamentos | Aporte de capital | Uma perna (ex.: `D 1101 Caixa / C 3101 Capital`) |
| Lançamentos | Despesa | Uma perna (ex.: `D 5201 Despesas / C 1101 Caixa`) |
| Lançamentos | Manual | Uma perna entre quaisquer duas contas existentes |
| Contas | Abrir conta | Cria a conta no Postgres e no TigerBeetle |
| Contas | Ver razonete (T-account) | Lê transferências e histórico de saldos da conta |
| Estoque | Cadastrar produto | Só Postgres (SKU, nome, preço). Estoque e custo nascem zerados. |

**Recusa pelo próprio banco**: como Caixa (1101) e Estoque (1103) têm a flag "créditos não podem exceder débitos", qualquer saída maior que o saldo disponível (incluindo reservas pendentes) é **recusada atomicamente pelo TigerBeetle**, não por um `if` na aplicação — o que elimina condições de corrida. A API devolve `422 insufficient_funds` e o front toca uma animação de recusa. Vender mais do que o estoque físico gera `422 insufficient_stock` (essa verificação é do domínio Go, sob lock do Postgres).

---

## 4. Backend (Go) — em detalhe

### 4.1 Estrutura de pastas

```
backend/
  go.mod                         módulo "gomoney"
  cmd/api/main.go                ponto de entrada / composition root
  internal/
    domain/                      regras de negócio puras (só stdlib)
      money.go                   Money (centavos), formatação BRL
      account.go                 AccountType, AccountID, Account, DefaultChart, Balance
      ledger.go                  EntryKind, Leg, Phase, Entry, BalancePoint, Posting
      product.go                 Product, NewProduct, Receive (custo médio), Remove
      sale.go                    Sale (agregado), NewSale, InvoiceLegs, Receive
      purchase.go                Purchase (agregado + máquina de estados), Schedule/Confirm/Cancel
      errors.go                  domain.Error com Code
      domain_test.go             testes unitários table-driven
    app/                         camada de aplicação: casos de uso + portas
      ports.go                   interfaces Ledger, Repo, Store, Publisher; struct Resolution
      service.go                 Service (DI manual), stamp, newPosting, resolution, announce
      sales.go                   CreateSale, ReceiveSale, Sales
      purchases.go               CreatePurchase, SchedulePayment, ConfirmPayment, CancelPayment, Purchases
      journal.go                 CreateEntry, Journal, describe
      accounts.go                CreateAccount, Accounts, AccountDetail, Overview, CreateProduct, Products
      views.go                   DTOs de saída (JSON) e conversões domínio → view
      seed.go                    SeedDemo: 30 dias de movimento fictício
    adapters/
      httpapi/server.go          rotas, tradução de erros, middleware de log
      httpapi/stream.go          endpoint SSE
      postgres/schema.sql        DDL (embutido no binário com //go:embed)
      postgres/store.go          implementação de app.Store com pgx
      tigerbeetle/ledger.go      implementação de app.Ledger com o cliente TB
    platform/events/broker.go    pub/sub genérico em memória
```

### 4.2 Arquitetura hexagonal / DDD leve

- **Regra de dependência**: as setas apontam para dentro. `domain` não importa nada além da stdlib; `app` importa só `domain`; os `adapters` importam `app` e `domain`; `main.go` é o único que conhece tudo e conecta as peças.
- **Portas definidas por quem usa** (idioma Go): as interfaces `Ledger`, `Repo`, `Store`, `Publisher` ficam em `app/ports.go`. Os adapters as satisfazem por tipagem estrutural, sem declarar "implements". Cada adapter tem uma checagem em tempo de compilação: `var _ app.Ledger = (*Ledger)(nil)` e `var _ app.Store = (*Store)(nil)`.
- **Agregados com construtores que validam**: `NewSale`, `NewPurchase`, `NewProduct`, `NewAccount` devolvem `(valor, error)`.
- **Transação como closure**: `Store.WithTx(ctx, func(Repo) error) error` — erro ⇒ rollback; nil ⇒ commit.
- **DTOs separados do domínio** (`views.go`), para o contrato JSON não depender da forma interna.
- Referências declaradas no README: ThreeDotsLabs/wild-workouts-go-ddd-example (camadas, portas, WithTx), sklinkert/go-ddd (agregados e repositórios), formancehq/ledger (todo evento como pernas de partidas dobradas), iota-uz/iota-sdk (recorte modular do ERP), documentação do TigerBeetle.

### 4.3 Camada `domain`

**Money** — `type Money int64` (centavos). Tipo nominal (não alias), então o compilador impede misturar com `int`. Métodos: `String()` → `"R$ 1.234,56"` / `"-R$ 1.000.000,00"`; `Times(qty int) Money`.

**Erros de domínio** — `type Error struct { Code Code; Message string }`, com `Code` ∈:
- `invalid` (dados ruins), `not_found`, `conflict` (estado não permite a ação), `insufficient_funds` (livro-razão recusou por saldo), `insufficient_stock`.
- Construtores com formatação: `Invalid(fmt, args...)`, `NotFound`, `Conflict`, `InsufficientFunds`, `InsufficientStock`. Mensagens em português, prontas para o usuário.

**Account** — `{ID AccountID; Name string; Type AccountType; NoOverdraft bool}`.
- `NewAccount(id, name, type)`: nome não vazio (trim), tipo válido, id entre 1000 e 9999, `id/1000 == type`. Contas criadas pelo usuário **sempre têm `NoOverdraft = false`** (só Caixa e Estoque do plano padrão têm a trava).
- `AccountType.Slug()` ↔ `AccountTypeFromSlug()`: `asset`, `liability`, `equity`, `revenue`, `expense`.
- `Balance {DebitsPosted, CreditsPosted, DebitsPending, CreditsPending Money}` — espelha os 4 acumuladores do TigerBeetle.
  - `Net(type)`: saldo efetivado do lado natural.
  - `Reserved(type)`: para contas devedoras = `CreditsPending`; credoras = `DebitsPending` (quanto está comprometido por reservas).

**EntryKind** (gravado no `code` da transferência no TigerBeetle):

| Valor | Constante | Slug |
|---|---|---|
| 1 | KindCapital | `capital` |
| 10 | KindSaleRevenue | `sale_revenue` |
| 11 | KindSaleCost | `sale_cost` |
| 12 | KindReceipt | `receipt` |
| 20 | KindPurchase | `purchase` |
| 21 | KindPayment | `payment` |
| 30 | KindExpense | `expense` |
| 40 | KindManual | `manual` (também o fallback) |

**Leg** ("perna"): intenção de lançamento ainda não gravada — `{ID string (u128 hex); Kind; Debit, Credit AccountID; Amount Money; PostingID string; Pending bool; At time.Time}`. `At` só é usado na carga histórica.

**Phase**: `single` (lançamento comum), `pending` (reserva), `post` (confirmação de reserva), `void` (cancelamento de reserva).

**Entry**: lançamento já gravado, lido de volta do TigerBeetle — `{ID, Kind, Debit, Credit, Amount, PostingID, Phase, PendingID (para post/void: qual reserva resolveu), Resolved (para pending: "" se aberta, ou post/void), Timestamp}`.

**BalancePoint** `{Timestamp, Balance}` — saldo da conta logo após um lançamento (série para gráfico).

**Posting** `{ID, Memo, DocType ("sale" | "purchase" | ""), DocID int64, CreatedAt}` — o texto explicativo de um grupo de lançamentos (ex.: `"Venda nº 12 — Escola Aquarela"`).

**Product** `{ID, SKU, Name, Price, AvgCost Money, Stock int}`.
- `NewProduct(sku, name, price)`: SKU vira maiúsculo e com trim; SKU e nome obrigatórios; preço > 0.
- `(*Product).Receive(qty, unitCost)`: entrada com recálculo do custo médio ponderado (divisão inteira).
- `(*Product).Remove(qty) (Money, error)`: baixa; se `qty > Stock` → `InsufficientStock("estoque insuficiente de X: há N, pedido M")`; devolve o custo do que saiu.

**Sale** (agregado) `{ID, Customer, Items []SaleItem, Status, CreatedAt}`; `SaleItem {ProductID, Name, Qty, UnitPrice, UnitCost}` — preço e custo são **copiados** do produto no momento da venda.
- Status: `open` (faturada, a receber) → `received`.
- `NewSale(customer, lines []SaleLine{Product *Product; Qty}, now)`: valida cliente e ≥1 item, qty > 0; para cada linha captura o custo médio atual, chama `Product.Remove` (muta o produto em memória via ponteiro) e monta o item. Não fala com banco.
- `Total()` = Σ preço×qtd; `Cost()` = Σ custo×qtd.
- `InvoiceLegs()` → `[ {SaleRevenue: D Receivable / C SalesRevenue, Total}, {SaleCost: D COGS / C Inventory, Cost} ]`.
- `(*Sale).Receive() (Leg, error)`: só se `open` (senão `Conflict("a venda nº N já foi recebida")`); muda para `received` e devolve `{Receipt: D Cash / C Receivable, Total}`.

**Purchase** (agregado) `{ID, Supplier, Items []PurchaseItem{ProductID, Name, Qty, UnitCost}, Status, PendingID, CreatedAt}`.
- Máquina de estados:
  ```
  open ──Schedule──▶ scheduled ──Confirm──▶ paid
    ▲                    │
    └──────Cancel────────┘
  ```
- `NewPurchase(supplier, lines []PurchaseLine{Product *Product; Qty; UnitCost}, now)`: valida fornecedor, ≥1 item, qty e custo > 0; chama `Product.Receive` (recalcula custo médio) para cada linha.
- `Total()`; `ReceiptLeg()` → `{Purchase: D Inventory / C Payable, Total}`.
- `(*Purchase).Schedule(pendingID) (Leg, error)`: exige `open`; vai para `scheduled`, guarda `PendingID`; devolve `{ID: pendingID, Payment: D Payable / C Cash, Total, Pending: true}`.
- `Confirm() (pendingID, error)`: exige `scheduled`; vai para `paid`, limpa `PendingID`.
- `Cancel() (pendingID, error)`: exige `scheduled`; volta para `open`, limpa `PendingID`.
- Erros de transição inválida são `Conflict`.

**Testes** (`domain_test.go`, table-driven, sem framework): formatação de `Money`, custo médio ponderado (10 un. a R$ 10 + 30 un. a R$ 20 ⇒ R$ 17,50), venda com baixa de estoque e valores das pernas + erro `insufficient_stock`, máquina de estados da compra, numeração de contas. Rodam com `make go-test` (`go vet ./... && go test ./...` num container `golang:1.27-bookworm`). Não há testes de `app` nem de adapters.

### 4.4 Camada `app` (casos de uso)

#### Portas (`ports.go`)

```go
type Ledger interface {
    NewID() string                                                          // id u128, ordenável no tempo
    OpenAccounts(ctx, accounts []domain.Account, at time.Time) error         // at zerado = agora
    Post(ctx, legs []domain.Leg) ([]domain.Entry, error)                     // atômico: todas ou nenhuma
    Resolve(ctx, r Resolution) (domain.Entry, error)                         // post/void de reserva
    Balances(ctx, ids []domain.AccountID) (map[domain.AccountID]domain.Balance, error)
    Entries(ctx, limit int) ([]domain.Entry, error)                          // diário, mais novo primeiro
    AccountEntries(ctx, id domain.AccountID, limit int) ([]domain.Entry, error)
    BalanceHistory(ctx, id domain.AccountID, limit int) ([]domain.BalancePoint, error)
}

type Resolution struct { ID, PendingID, PostingID string; Phase domain.Phase; At time.Time }

type Repo interface {
    SaveAccount, Accounts
    CreateProduct(*Product), UpdateProduct(Product), Products, ProductsForUpdate(ids) map[int64]*Product
    CreateSale(*Sale), SaleForUpdate(id), UpdateSale, Sales
    CreatePurchase(*Purchase), PurchaseForUpdate(id), UpdatePurchase, Purchases
    SavePosting, Postings(ids []string) map[string]Posting
}

type Store interface { Repo; WithTx(ctx, fn func(Repo) error) error }
type Publisher interface { Publish(event PostingView) }
```

`context.Context` é sempre o primeiro parâmetro de I/O (cancelamento propagado da requisição HTTP).

#### `Service` (`service.go`)

```go
type Service struct {
    ledger Ledger; store Store; events Publisher
    now func() time.Time   // time.Now em produção; relógio falso no seed
    backdate bool          // modo "carga histórica"
    company string
}
```

Helpers centrais:
- **`stamp(legs, postingID)`**: preenche o que é responsabilidade da aplicação — gera `ID` para cada perna sem id (via `ledger.NewID()`), seta `PostingID` e, em modo `backdate`, `At = now() + i µs` (o TigerBeetle exige timestamps estritamente crescentes em importações). Gerar ids **antes** de enviar dá **idempotência**: reenviar as mesmas pernas resulta em `TransferExists`, não em lançamento duplicado.
- **`newPosting(memo, docType, docID)`**: cria `Posting` com id do `ledger.NewID()` e `CreatedAt = now()`.
- **`resolution(pendingID, postingID, phase)`**: monta `Resolution` com id novo; `At = now()` em backdate.
- **`announce(ctx, scene, posting, entries)`**: monta `PostingView{ID: entries[0].ID, Scene, Memo, Entries}` (resolvendo nomes de contas) e, **se não estiver em backdate**, publica no broker (SSE). É o retorno de toda mutação.
- **`accountIndex(ctx)`**: carrega o plano de contas do Postgres num `map[AccountID]Account` (chamado com frequência; não há cache).

#### Roteiro padrão de uma mutação (ex.: `CreateSale`)

1. `store.WithTx` abre transação no Postgres.
2. `ProductsForUpdate` carrega e **trava** (`SELECT … FOR UPDATE ORDER BY id`) os produtos envolvidos.
3. Chama o domínio (`NewSale`) — valida e baixa estoque em memória.
4. Grava documento, itens, produtos atualizados e o `Posting` no Postgres (sem commit ainda).
5. **Por último**, chama `ledger.Post` com as pernas carimbadas por `stamp`.
6. Se o TigerBeetle recusar (ex.: saldo) ⇒ erro ⇒ rollback de tudo no Postgres. Se aceitar ⇒ commit.
7. Fora da transação: `announce` (resposta + evento SSE).

**Consistência entre os dois bancos** (limitação conhecida e documentada): não há transação distribuída. Resta a janela "TigerBeetle aceitou e o commit do Postgres falhou". A solução de produção (não implementada) seria um *outbox* + reenvio, seguro porque os ids pré-gerados tornam o envio idempotente.

#### Casos de uso

**Vendas (`sales.go`)**
- `LineInput {productId, qty, unitCostCents}` (o custo só é usado em compras); `SaleInput {customer, items}`; `SaleResult {sale: SaleView, posting: PostingView}`.
- `CreateSale`: roteiro acima; produto inexistente ⇒ `NotFound("produto N não encontrado")`; memo `"Venda nº {id} — {cliente}"`, docType `sale`; 2 pernas encadeadas; cena `sale`.
- `ReceiveSale(id)`: `SaleForUpdate` (lock), `sale.Receive()`, `UpdateSale`, posting `"Recebimento da venda nº {id} — {cliente}"`, 1 perna; cena `receipt`.
- `Sales()`: lista (mais nova primeiro).

**Compras (`purchases.go`)**
- `PurchaseInput {supplier, items}`; `PurchaseResult {purchase, posting}`.
- `CreatePurchase`: lock dos produtos, `NewPurchase` (recalcula custo médio), grava compra/itens/produtos/posting (`"Compra nº {id} — {fornecedor}"`), perna `D Estoque / C Fornecedores`; cena `purchase`.
- `SchedulePayment(id)`, `ConfirmPayment(id)`, `CancelPayment(id)` compartilham o esqueleto **`movePurchase(ctx, id, scene, memoFormat, step)`**: transação → `PurchaseForUpdate` (lock) → salva posting → executa `step` (função que muda o estado e fala com o ledger) → `UpdatePurchase` → commit → `announce`.
  - Schedule: `p.Schedule(ledger.NewID())` ⇒ `ledger.Post` com perna `Pending`. Cena `payment_scheduled`, memo `"Pagamento agendado da compra nº …"`. Se o caixa disponível não cobre, o TigerBeetle recusa (`insufficient_funds`).
  - Confirm: `p.Confirm()` ⇒ `ledger.Resolve(PhasePost)`. Cena `payment_confirmed`.
  - Cancel: `p.Cancel()` ⇒ `ledger.Resolve(PhaseVoid)`. Cena `payment_cancelled`.
- `Purchases()`: lista.

**Lançamentos avulsos (`journal.go`)**
- `EntryInput {kind: "capital"|"expense"|"manual", debit, credit, amountCents, memo}`.
- `CreateEntry`: valida memo não vazio, valor > 0, contas diferentes, ambas existentes no plano (`NotFound` caso contrário). Mapeia kind → `EntryKind` e cena (qualquer valor diferente de capital/expense vira manual). Posting sem documento. 1 perna. **A aplicação não restringe quais contas cada kind usa** — o front sugere os pares, mas o backend aceita qualquer par existente.
- `Journal(limit)`: `ledger.Entries` + `describe`.
- `describe(entries)`: junta números do TigerBeetle com textos do Postgres (nomes de contas via `accountIndex`, memos via `store.Postings(ids)` em lote) ⇒ `[]EntryView`.

**Contas, visão geral e produtos (`accounts.go`)**
- `CreateAccount(AccountInput{id, name, type})`: converte slug, `NewAccount`, verifica duplicidade (`Conflict("já existe uma conta com o número N")`), e em transação: `SaveAccount` no Postgres + `ledger.OpenAccounts` (com `at` zerado = timestamp do TigerBeetle). Devolve `AccountView` com saldo zero.
- `Accounts()`: plano do Postgres + **um único** `ledger.Balances` em lote ⇒ `[]AccountView`.
- `AccountDetail(id)`: conta (404 se não existir), saldo, até 200 lançamentos (`AccountEntries`) descritos e a série de saldo (`BalanceHistory`, até 2000 pontos, convertida com `Net(type)` e ordenada do mais antigo ao mais novo).
- `Overview()`: contas com saldos; soma `TotalDebitsCents`/`TotalCreditsCents` (balancete); DRE acumulada: `RevenueCents` (contas de receita), `COGSCents` (só a 5101), `ExpensesCents` (demais despesas), `NetCents = receita − CMV − despesas`; séries de saldo de 1101, 1102, 1103 e 2101.
- `CreateProduct(ProductInput{sku, name, priceCents})` e `Products()` (ordenados por nome) — só Postgres. SKU duplicado ⇒ `Conflict`.

#### Carga de demonstração (`seed.go` → `SeedDemo`)

Roda no boot **somente se a tabela `accounts` estiver vazia**. Detalhes:
- **Não escreve direto no banco**: copia o `Service` (`demo := *s`), liga `backdate = true` e troca `now` por um **relógio falso** que começa 30 dias atrás às 9h. Assim os dados históricos passam pelos **mesmos casos de uso**, regras e travas do livro-razão que os dados reais.
- No TigerBeetle, contas e transferências vão com a flag `Imported` e timestamp explícito (estritamente crescente). Em backdate, nada é publicado no SSE.
- RNG com semente fixa (`1964598542`) ⇒ dados determinísticos. `tick()` avança o relógio 11–50 min entre eventos.
- Passos:
  1. Plano de contas padrão salvo no Postgres e aberto no TigerBeetle datado de 1 h antes do início.
  2. Catálogo de 7 produtos: `GIZ-24` Giz pastel seco 24 cores (R$ 89,90), `GIZ-48` Giz pastel oleoso 48 cores (R$ 149,90), `PAP-A3` Papel para pastel A3 180 g (R$ 64,50), `FIX-400` Fixador spray 400 ml (R$ 58,00), `CAV-M` Cavalete de mesa em pinus (R$ 219,00), `CAR-12` Carvão vegetal cx. 12 (R$ 34,90), `ESF-06` Esfuminho kit 6 (R$ 27,50).
  3. Eventos fixos por dia: dia 0 aporte de R$ 60.000 e aluguel R$ 3.200; dias 1–2 compras de três fornecedores (Distribuidora Belas Cores, Papelaria Atacado Sul, Marcenaria Ipê Roxo); despesas de energia, frete, anúncios, internet, contador ao longo do mês; pagamentos (agendar + confirmar) das compras 1, 2 e 3; reposições nos dias 18 e 25; no dia 29 o pagamento da compra 5 fica **apenas agendado** (reserva aberta) e a compra 4 fica em aberto.
  4. A partir do dia 3: 1–3 vendas por dia útil (0–1 no fim de semana) para 8 clientes fictícios, 1–3 itens de 1–5 unidades; vendas sem estoque são puladas (`insufficient_stock` é ignorado). Cada venda é recebida 2–7 dias depois.
- `make reset-data` apaga os volumes e força a recarga.

#### DTOs de saída (`views.go`) — contrato JSON

```ts
AccountRef      { id: number, name: string, type: "asset"|"liability"|"equity"|"revenue"|"expense" }
AccountView     = AccountRef (achatado, via embedding) & {
                    noOverdraft: boolean, balanceCents, reservedCents, debitsCents, creditsCents }
EntryView       { id: string(hex u128), kind: slug, debit: AccountRef, credit: AccountRef, amountCents,
                  phase: "single"|"pending"|"post"|"void", resolved?: "post"|"void", pendingId?,
                  postingId, memo, docType?: "sale"|"purchase", docId?, timestamp: ISO8601 }
PostingView     { id, scene: "sale"|"receipt"|"purchase"|"payment_scheduled"|"payment_confirmed"|
                  "payment_cancelled"|"expense"|"capital"|"manual", memo, entries: EntryView[] }
ProductView     { id, sku, name, priceCents, avgCostCents, stock, stockValueCents }
ItemView        { productId, name, qty, unitCents }   // preço na venda; custo na compra
SaleView        { id, customer, status: "open"|"received", totalCents, costCents, items, createdAt }
PurchaseView    { id, supplier, status: "open"|"scheduled"|"paid", totalCents, items, createdAt }
SeriesPoint     { at: ISO8601, cents }
OverviewView    { company, accounts: AccountView[], revenueCents, cogsCents, expensesCents, netCents,
                  totalDebitsCents, totalCreditsCents, series: { "1101": SeriesPoint[], "1102": …, "1103": …, "2101": … } }
AccountDetailView { account: AccountView, entries: EntryView[], series: SeriesPoint[] }
SaleResult      { sale: SaleView, posting: PostingView }
PurchaseResult  { purchase: PurchaseView, posting: PostingView }
```

`resolved`, `pendingId`, `docType` e `docId` usam `omitempty`.

### 4.5 Adapter HTTP (`adapters/httpapi`)

Só `net/http` (roteador com método e `{id}` do Go 1.22+). Handlers são closures curtas que chamam o caso de uso e passam `(resultado, erro)` para `reply`.

| Método e rota | Caso de uso | Sucesso |
|---|---|---|
| `GET /api/health` | — | 200 `{"status":"ok"}` |
| `GET /api/overview` | `Overview` | 200 `OverviewView` |
| `GET /api/accounts` | `Accounts` | 200 `AccountView[]` |
| `GET /api/accounts/{id}` | `AccountDetail` | 200 `AccountDetailView` |
| `GET /api/journal?limit=N` | `Journal` (limit padrão 200; inválido/≤0/>500 ⇒ 200) | 200 `EntryView[]` |
| `GET /api/products` | `Products` | 200 `ProductView[]` |
| `GET /api/sales` | `Sales` | 200 `SaleView[]` |
| `GET /api/purchases` | `Purchases` | 200 `PurchaseView[]` |
| `POST /api/accounts` `{id,name,type}` | `CreateAccount` | 201 `AccountView` |
| `POST /api/products` `{sku,name,priceCents}` | `CreateProduct` | 201 `ProductView` |
| `POST /api/journal` `{kind,debit,credit,amountCents,memo}` | `CreateEntry` | 201 `PostingView` |
| `POST /api/sales` `{customer,items:[{productId,qty}]}` | `CreateSale` | 201 `SaleResult` |
| `POST /api/purchases` `{supplier,items:[{productId,qty,unitCostCents}]}` | `CreatePurchase` | 201 `PurchaseResult` |
| `POST /api/sales/{id}/receive` | `ReceiveSale` | 200 `SaleResult` |
| `POST /api/purchases/{id}/schedule-payment` | `SchedulePayment` | 200 `PurchaseResult` |
| `POST /api/purchases/{id}/confirm-payment` | `ConfirmPayment` | 200 `PurchaseResult` |
| `POST /api/purchases/{id}/cancel-payment` | `CancelPayment` | 200 `PurchaseResult` |
| `GET /api/events` | SSE | stream `text/event-stream` |

As três rotas de pagamento são registradas num loop sobre um `map[string]func(ctx, id) (PurchaseResult, error)` usando *method values* (`s.svc.SchedulePayment`).

**Formato de erro** (único): `{"error": {"code": "...", "message": "..."}}`.
- `domain.Error` ⇒ status por código: `not_found` 404, `conflict` 409, `invalid` 400, `insufficient_funds`/`insufficient_stock` 422.
- Qualquer outro erro ⇒ log `slog.Error` com método/rota/erro e resposta 500 `{"code":"internal","message":"Algo deu errado do nosso lado. Tente de novo."}` (não vaza detalhe interno).
- Corpo JSON inválido ⇒ 400 `invalid` "Corpo da requisição não é um JSON válido."; corpo limitado a 1 MB (`http.MaxBytesReader`).
- `{id}` não inteiro ou ≤ 0 ⇒ 400 `invalid` "Identificador inválido."

**Middleware `logged`**: mede duração e loga `method`, `path`, `status`, `ms` em JSON (exceto `/api/events`). Usa um `statusRecorder` que embute o `ResponseWriter` e implementa `Unwrap()` para o `http.ResponseController` conseguir dar `Flush` no SSE.

**SSE (`stream.go`)**: headers `text/event-stream`, `no-cache`, `X-Accel-Buffering: no`; envia `: conectado`; assina o broker; laço `select` sobre: contexto da requisição (cliente desconectou ⇒ sai e cancela a inscrição), ticker de 25 s (`: ping` para manter proxies vivos) e eventos (`event: posting\ndata: <PostingView JSON>\n\n`); `Flush` após cada escrita. Não cria goroutine própria (cada requisição já roda na sua).

Sem CORS: o front sempre fala com `/api` na mesma origem (proxy do Next em dev, nginx em produção). Sem autenticação.

### 4.6 Broker de eventos (`platform/events/broker.go`)

`Broker[T any]` genérico: `map[chan T]struct{}` protegido por `sync.Mutex`.
- `Subscribe() (<-chan T, cancel func())`: cria canal com buffer 16; `cancel` remove do mapa e fecha o canal (idempotente).
- `Publish(event)`: para cada inscrito, envio **não bloqueante** (`select` com `default`) — se o buffer de um ouvinte lento estiver cheio, o evento é descartado para ele em vez de travar os demais.
- Instanciado em `main.go` como `events.NewBroker[app.PostingView]()`; usado pelo `Service` como `Publisher` e pelo `httpapi` para assinar. Funciona só em um processo (sem Redis/NATS).

### 4.7 Adapter Postgres (`adapters/postgres`)

- `schema.sql` embutido via `//go:embed` e executado a cada `Open` (`CREATE TABLE IF NOT EXISTS` — não há ferramenta de migração).
- Esquema:

```sql
accounts       (id BIGINT PK  -- = id no TigerBeetle, name TEXT, type SMALLINT, no_overdraft BOOLEAN)
products       (id BIGSERIAL PK, sku TEXT UNIQUE, name, price_cents BIGINT, avg_cost_cents BIGINT DEFAULT 0,
                stock INT DEFAULT 0 CHECK (stock >= 0))
sales          (id BIGSERIAL PK, customer, status TEXT, created_at TIMESTAMPTZ)
sale_items     (sale_id FK, position, product_id FK, name, qty, unit_price_cents, unit_cost_cents,
                PK (sale_id, position))
purchases      (id BIGSERIAL PK, supplier, status TEXT, pending_id TEXT DEFAULT '' -- id da reserva no TB,
                created_at)
purchase_items (purchase_id FK, position, product_id FK, name, qty, unit_cost_cents, PK (purchase_id, position))
postings       (id TEXT PK  -- = user_data_128 das transferências, memo, doc_type, doc_id, created_at)
```

- Abstração `querier` (interface com `Exec`, `Query`, `QueryRow`) satisfeita tanto por `*pgxpool.Pool` quanto por `pgx.Tx`; o mesmo `repo` funciona dentro e fora de transação. `Store` embute `repo` (ligado ao pool) e implementa `WithTx` (`Begin` → `defer Rollback` → `fn(repo{q: tx})` → `Commit`).
- Sempre queries parametrizadas (`$1`…); `ANY($1)` recebe slices como arrays.
- **Concorrência**: `ProductsForUpdate` usa `FOR UPDATE ... ORDER BY id` (ordem fixa de lock evita deadlock entre vendas simultâneas); `SaleForUpdate` e `PurchaseForUpdate` também usam `FOR UPDATE`. O `CHECK (stock >= 0)` é uma rede de segurança adicional.
- Violação de UNIQUE (`23505`) em produto ⇒ `domain.Conflict("já existe um produto com o código X")`.
- Listagens de vendas/compras carregam cabeçalhos + itens em **duas queries** (evita N+1), encaixando os itens via índice id→posição.
- `UpdateProduct` grava só `avg_cost_cents` e `stock`; `UpdateSale` só `status`; `UpdatePurchase` `status` e `pending_id`.
- `connectWithRetry` no `main.go`: até 30 tentativas, 1 s entre elas, respeitando cancelamento.

### 4.8 Adapter TigerBeetle (`adapters/tigerbeetle/ledger.go`)

Único pacote que importa o cliente (`tb "github.com/tigerbeetle/tigerbeetle-go"`). Traduz `Leg`/`Entry`/`Balance` ⇄ `tb.Transfer`/`tb.Account`.

- **Ledger id `986`** (código ISO 4217 do real) em todas as contas e transferências — o TigerBeetle só permite transferências entre contas do mesmo ledger.
- `Connect(clusterID, addresses)`: resolve nomes de host para IP (`net.LookupHost`), pois o cliente aceita só `ip:porta` ou porta, e no compose o endereço é `gomoney-tigerbeetle:3000`. Cliente único, compartilhado entre goroutines.
- `NewID()`: `tb.ID().String()` — id de 128 bits com timestamp nos bits altos (estilo ULID), em hex.
- **`OpenAccounts`**: cada conta com `ID = número da conta`, `Code = AccountType`, flags:
  - `History: true` (o banco guarda o saldo após cada transferência ⇒ gráficos sem recalcular);
  - `CreditsMustNotExceedDebits` se `NoOverdraft` e devedora; `DebitsMustNotExceedCredits` se `NoOverdraft` e credora;
  - `Imported` + `Timestamp` explícito (ns, +i para crescer estritamente) quando `at` não é zero.
  - `AccountCreated` ou `AccountExists` = sucesso (idempotente); outro status ⇒ erro.
- **`Post(legs)`**: monta um lote de `tb.Transfer` com `DebitAccountID`, `CreditAccountID`, `Amount`, `UserData128 = postingID`, `Ledger 986`, `Code = EntryKind`, flags `Linked` em todas menos a última (corrente atômica: todas ou nenhuma), `Pending` se reserva, `Imported` + `Timestamp` se backdate. Tratamento dos resultados:
  - `TransferCreated`/`TransferExists` ⇒ ok (Exists = reenvio idempotente);
  - `TransferLinkedEventFailed` ⇒ ignora (falhou por arrasto; o motivo real está em outra perna); se só houver esses, devolve erro genérico "o livro-razão desfez o lote encadeado";
  - outro status ⇒ `refusal(status, leg)`:
    - `TransferExceedsDebits` ⇒ `InsufficientFunds` na conta creditada; `TransferExceedsCredits` ⇒ `InsufficientFunds` na conta debitada (mensagem "saldo insuficiente na conta N: o livro-razão recusou a saída de R$ X");
    - conta inexistente ⇒ `NotFound`; contas iguais ⇒ `Invalid`; demais ⇒ erro interno com o status.
  - Erro de transporte (retornado por `CreateTransfers`) ⇒ erro interno.
  - Ao final relê as transferências gravadas (`LookupTransfers`) para devolver `[]Entry` com timestamps reais do banco.
- **`Resolve(r)`**: cria uma transferência **nova** com `PendingID` apontando a reserva (contas, ledger e code ficam zerados — o banco copia da pendente), `UserData128 = postingID`; `PostPendingTransfer` com `Amount = tb.AmountMax` (efetiva o valor inteiro) ou `VoidPendingTransfer`. Status `PendingTransferAlreadyPosted`/`AlreadyVoided` ⇒ `Conflict`. Relê e devolve a `Entry`.
- **`Balances(ids)`**: `LookupAccounts` em lote ⇒ os 4 acumuladores (`debits_posted`, `credits_posted`, `debits_pending`, `credits_pending`).
- **`Entries(limit)`**: `QueryTransfers` filtrando `Ledger 986`, `Reversed` (mais novo primeiro).
- **`AccountEntries(id, limit)`**: `GetAccountTransfers` com flags `Debits | Credits | Reversed`.
- **`BalanceHistory(id, limit)`**: `GetAccountBalances` (requer a flag `History`).
- **`toEntries`**: duas passadas — na primeira mapeia `pendingID → post/void` a partir das transferências de resolução presentes no lote; na segunda converte cada transferência em `Entry` com `Phase` (`single`, `pending` com `Resolved` preenchido se a resolução estiver no mesmo lote, `post`/`void` com `PendingID`). Conversão u128 → int64 via `BigInt().Int64()` (valores cabem em 64 bits).

### 4.9 `cmd/api/main.go` (composition root)

1. Logger `slog` JSON no stdout. `main` só chama `run` e decide o código de saída (para os `defer` rodarem antes do `os.Exit`).
2. Contexto cancelado por `SIGINT`/`SIGTERM` (`signal.NotifyContext`).
3. Configuração por variáveis de ambiente: `HTTP_ADDR` (padrão `:8080`), `DATABASE_URL` (padrão `postgres://gomoney:gomoney@localhost:5433/gomoney`), `TB_ADDRESSES` (lista separada por vírgula, padrão `3000`), `TB_CLUSTER_ID` (padrão `0`), `COMPANY_NAME` (padrão "Ateliê Pipa Materiais Artísticos"). `TZ=America/Sao_Paulo` no compose; `time/tzdata` é embutido no binário.
4. Conecta Postgres (com retry e criação do schema) e TigerBeetle.
5. Cria broker e `app.NewService(ledger, store, broker, company)`; executa `SeedDemo`.
6. `http.Server` com `ReadHeaderTimeout: 5s` (proteção contra slowloris), `ListenAndServe` numa goroutine; `select` entre erro do servidor e sinal de parada; **graceful shutdown** com até 10 s.

### 4.10 Pontos de atenção técnicos (observados no código)

- Janela de inconsistência Postgres × TigerBeetle (sem outbox), já explicada acima. A transação do Postgres fica aberta (com locks) durante a chamada ao TigerBeetle.
- `CreateAccount` verifica duplicidade antes da transação; uma corrida entre duas criações iguais cairia na violação de PK do Postgres e sairia como 500, não 409.
- `accountIndex` relê o plano de contas do Postgres em praticamente toda operação (sem cache).
- O campo `Resolved` de uma reserva só é preenchido se a transferência de resolução vier na mesma consulta (mesma página de resultados).
- O arredondamento do custo médio (divisão inteira) faz o valor do estoque no Postgres divergir em alguns centavos da conta 1103 no TigerBeetle; o front tolera até R$ 5 ou 0,1%.
- Conexões SSE abertas não observam o shutdown do servidor, então o graceful shutdown tende a esperar o prazo de 10 s.
- Broker em memória: não escala horizontalmente (vários processos da API não compartilhariam eventos).
- TigerBeetle roda com uma réplica em modo `--development` (em produção seriam 6 réplicas).

---

## 5. Frontend (resumo)

### 5.1 Tecnologia e organização

- Next.js 16 App Router, **100% client-side** em termos de dados (TanStack Query); em produção é exportado como **site estático** (`output: 'export'`) servido por nginx. Em dev, `next dev` faz `rewrites` de `/api/*` para o backend (`API_URL`, padrão `http://localhost:8088`); `compress: false` para não segurar o SSE.
- Mantine 9 como biblioteca de componentes (com wrappers próprios), Tailwind 4 para utilitários (um único CSS `src/styles/globals.css`, tokens em `src/tokens.ts` compartilhados com o tema `src/theme.ts`), Motion para animações, Yup para validação de formulário, Immer, lodash-es.
- Rotas sempre em inglês: `/` (apresentação), `/overview`, `/journal`, `/sales`, `/purchases`, `/inventory`, `/accounts`, `/accounts/ledger?account=1101` (query string, não segmento dinâmico, por causa do build estático). `?new=1` abre a gaveta de criação ao entrar na tela.
- Estrutura:
  - `src/app/page.tsx` — página de apresentação (estética de "vidro líquido" sobre gravação em guilhoché, com um quadro "ao vivo" do livro-razão: caixa, reservado, resultado, prova débitos = créditos, último lançamento).
  - `src/app/(app)/<área>/` — telas de trabalho, cada uma com `page.tsx`, `layout.tsx` e `_components/` locais.
  - `src/resources/<recurso>/{models,enums,services,logics}` — um módulo por recurso da API (`account`, `entry`, `overview`, `posting`, `product`, `purchase`, `sale`). `models` = interfaces TS (`IEntry`, `ISale`…), `enums` = enums TS espelhando slugs do backend (`EEntryKind`, `EPostingScene`, `ESaleStatus`, `EPurchaseStatus`, `EAccountId`…), `services` = funções de chamada + query keys, `logics` = componentes/hooks de ação (`CreateSale`, `ReceiveSale`, `SchedulePurchasePayment`, `ConfirmPurchasePayment`, `CancelPurchasePayment`, `CreatePurchase`, `CreateEntry`, `CreateAccount`, `CreateProduct`).
  - `src/components/<contexto>/` — componentes globais: `form/` (Button, Drawer, Form, ItemLines, MoneyInput, NumberInput, Select, SegmentedControl, TextInput), `utils/` (`UtilsIf`, `UtilsFor` para renderização condicional/listas declarativas, Money, Panel, Status, Empty, Fail, Skeleton…), `layout/` (AppFrame, PageHeader), `ledger/` (pré-visualização das pernas antes de lançar), `chart/Line`, `brand/`, `stage/`.
  - `src/utils/appClient.ts` — cliente `fetch`: a API devolve o recurso direto no corpo; erros viram `ApiError(code, message)`; `refused` = `insufficient_funds` ou `insufficient_stock`; falha de rede ⇒ código `offline`.
  - `src/utils/format.ts` — formatação pt-BR de dinheiro (`moneyFull` → "R$ 1.234,56"), datas ("Hoje", "Ontem", "12 de nov") e `parseMoney` (texto → centavos).

### 5.2 O "palco" (feedback de cada lançamento)

- `StageProvider` (contexto React) abre um `EventSource('/api/events')` e ouve eventos `posting`. Um lançamento chega por dois caminhos — a resposta da própria mutação (`play`) ou o SSE (outra aba/usuário) — e é deduplicado pelo id.
- Ao tocar um lançamento: `queryClient.invalidateQueries()` (recarrega tudo), marca os `postingId` como "frescos" por 4 s (as tabelas destacam as linhas) e mostra um cartão animado no canto inferior direito (até 3 empilhados, 7–8,5 s).
- Cada `scene` tem título e um "sinal de guarda-livros" desenhado em ouro: `sale` duplo sublinhado, `receipt` valor circulado, `purchase` caixa, `payment_scheduled` tracejado animado, `payment_confirmed` visto, `payment_cancelled` tracejado que esmaece, `expense` onda, `capital` raios, `manual` linha; `refused` com animação de "tremida".
- `usePostingMutation` encapsula toda mutação que gera lançamento: sucesso ⇒ `play`; recusa do livro-razão/estoque ⇒ `refuse(message)`; erro de validação ⇒ `postingError` exibido no formulário.

### 5.3 Telas

- **Visão geral** (`/overview`): frase-resumo (caixa, reserva, resultado); saldos das 4 contas que giram o negócio (1101, 1102, 1103, 2101) em abas com gráfico de evolução; painel de resultado (receita, CMV, despesas, lucro) e prova do balancete; pendências acionáveis (vendas a receber, compras a agendar/confirmar) com botão na linha; últimos lançamentos.
- **Lançamentos** (`/journal`): o diário; filtros por origem (Todos, Vendas, Compras, Despesas, Outros); status de fase das reservas; criação de despesa, aporte e lançamento manual.
- **Vendas** (`/sales`): vendas a receber primeiro; "Receber" na linha; gaveta para faturar venda com linhas de itens e pré-visualização das pernas.
- **Compras** (`/purchases`): faixa "o caixa aguenta?" (caixa − reservado = disponível; a pagar sem reserva); compras ordenadas (reservadas, a pagar, pagas); agendar, confirmar, cancelar; gaveta de nova compra com custo unitário.
- **Estoque** (`/inventory`): produtos com estoque, custo médio, valor em estoque e alerta de reposição; prova de que a soma dos produtos (Postgres) confere com a conta 1103 (TigerBeetle) dentro da tolerância de arredondamento; cadastro de produto.
- **Contas** (`/accounts`): plano de contas agrupado por natureza com totais, painel da equação patrimonial, abertura de conta nova.
- **Razonete** (`/accounts/ledger?account=N`): T-account (débitos à esquerda, créditos à direita, totais), gráfico de evolução do saldo; entram lançamentos efetivados e reservas abertas (reserva resolvida não entra; a confirmação conta no lugar dela).

Estilo: telas de trabalho sóbrias, "papel claro e tinta" com o ouro da moeda como acento; a estética de vidro fica restrita à apresentação.

---

## 6. Infraestrutura e execução

- **Docker Compose** com 4 serviços na rede `gomoney-network`:
  - `gomoney-web` — dev: `node:lts-slim` rodando `next dev` na porta 5173 com bind mount de `./frontend` (inclusive `node_modules`); produção: build estático + nginx.
  - `gomoney-api` — build multi-stage (`golang:1.27-bookworm` → `debian:bookworm-slim`), `CGO_ENABLED=1` (cliente TigerBeetle é nativo); `seccomp=unconfined` porque o cliente usa `io_uring`.
  - `gomoney-postgres` — `postgres:16-alpine`, healthcheck `pg_isready`, volume persistente.
  - `gomoney-tigerbeetle` — `ghcr.io/tigerbeetle/tigerbeetle:0.17.9`; o entrypoint formata o arquivo de dados na primeira vez (`--cluster=0 --replica=0 --replica-count=1 --development`) e inicia em `0.0.0.0:3000`; `seccomp=unconfined`, `IPC_LOCK`, volume persistente.
- `APP_ENV` no `.env` escolhe `docker-compose.local.yml` ou `docker-compose.production.yml`.
- Portas locais: front 5180, API 8088, Postgres 5433 (usuário/senha/banco `gomoney`), TigerBeetle 3001. Em produção nenhuma porta é publicada; o front entra na rede externa do Nginx Proxy Manager (`PROXY_NETWORK`).
- **nginx de produção**: `try_files $uri $uri.html $uri/` (rotas estáticas), cache imutável de 1 ano em `/_next/static/`, e proxy de `/api/` para `gomoney-api:8080` com `proxy_buffering off` e `proxy_read_timeout 1h` (necessário para o SSE).
- **Makefile**: `install` (cria `.env`, build, `npm install` no container, sobe), `up`/`down`/`restart`/`watch`, `reset-data` (apaga volumes ⇒ recarrega a demo), `update-api` (rebuild só da API), `update-build`, `logs`/`logs-api`, `npm-install b=pkg`, `typecheck`, `shell`, `go-test`, `demo-video`. Não é preciso Go nem Node no host (exceto para o vídeo).
- **Vídeo de demonstração** (`make demo-video`): teste longo do Playwright que sobe uma stack própria (`gomoney-demo`, API na 8099, sem volumes), serve o build estático na 3200 e percorre todas as telas e ações (incluindo recusas por falta de estoque e de saldo, pagamento em duas fases, filtros, razonete), gravando `frontend/videos/apresentacao.mp4`.

---

## 7. Exemplo ponta a ponta: faturar uma venda

1. Front envia `POST /api/sales` com `{"customer":"Escola Aquarela","items":[{"productId":1,"qty":2}]}`.
2. Handler decodifica em `app.SaleInput` e chama `Service.CreateSale`.
3. Transação Postgres: `SELECT … FROM products WHERE id = ANY($1) ORDER BY id FOR UPDATE`.
4. `domain.NewSale` valida, captura o custo médio (ex.: R$ 30,00), baixa 2 unidades (erro `insufficient_stock` se faltar) e monta o item com preço (ex.: R$ 50,00).
5. `INSERT sales … RETURNING id`, `INSERT sale_items`, `UPDATE products SET avg_cost_cents, stock`, `INSERT postings` (memo "Venda nº 42 — Escola Aquarela").
6. `stamp` gera ids u128 para as 2 pernas e as liga ao posting; `ledger.Post` envia ao TigerBeetle um lote encadeado:
   - `D 1102 / C 4101` R$ 100,00 (code 10, `Linked`)
   - `D 5101 / C 1103` R$ 60,00 (code 11) — se o Estoque 1103 ficasse negativo, o TigerBeetle recusaria a corrente inteira.
7. Commit no Postgres. `announce` monta `PostingView{scene:"sale", …}` e publica no broker; todas as abas abertas recebem `event: posting` via SSE.
8. Resposta 201 `{"sale": {...}, "posting": {...}}`; o front toca a cena "Venda faturada" (duplo sublinhado em ouro), invalida as queries e destaca as linhas novas.
