# Guia de leitura do Go, para quem vem de React

O backend tem cerca de 3.200 linhas de Go, fartamente comentadas. Este guia diz **em que ordem ler** e traduz os conceitos para o que você já conhece.

## 1. Ordem de leitura

Leia de dentro para fora — do negócio para a infraestrutura.

| # | Arquivo | O que você aprende |
| --- | --- | --- |
| 1 | `internal/domain/money.go` | Tipos próprios, métodos, visibilidade por maiúscula |
| 2 | `internal/domain/errors.go` | Erro como valor (não existe `try/catch`) |
| 3 | `internal/domain/account.go` | "Enum" com `const`, structs, construtores `NewX`, débito × crédito |
| 4 | `internal/domain/product.go` | Receiver por ponteiro × por valor; custo médio |
| 5 | `internal/domain/sale.go` | Um agregado completo; slices, `range`, `append` |
| 6 | `internal/domain/purchase.go` | Máquina de estados; lançamento em duas fases |
| 7 | `internal/domain/domain_test.go` | Testes table-driven, `errors.As` |
| 8 | `internal/app/ports.go` | Interfaces implícitas, `context.Context`, embedding |
| 9 | `internal/app/sales.go` | **O caso de uso mais importante.** Closures, transação, consistência entre dois bancos |
| 10 | `internal/app/purchases.go` | Passar função como parâmetro para eliminar repetição |
| 11 | `internal/adapters/tigerbeetle/ledger.go` | Como falar com o TigerBeetle: lotes, flags, encadeamento |
| 12 | `internal/adapters/postgres/store.go` | SQL à mão, `//go:embed`, a mesma interface para pool e transação |
| 13 | `internal/platform/events/broker.go` | Goroutines, channels, mutex, generics |
| 14 | `internal/adapters/httpapi/server.go` e `stream.go` | Rotas, JSON, middleware, SSE com `select` |
| 15 | `cmd/api/main.go` | Injeção de dependência à mão e graceful shutdown |
| 16 | `internal/app/seed.go` | Tudo junto: os casos de uso reaproveitados com relógio falso |

## 2. Go em uma tabela, para quem pensa em TypeScript

| Em TypeScript/React | Em Go | Onde ver |
| --- | --- | --- |
| `type Money = number & { __brand }` | `type Money int64` — tipo novo de verdade | `domain/money.go` |
| `export function` | Nome com **maiúscula** é exportado; minúscula é privado ao pacote | qualquer arquivo |
| `class` com métodos | `struct` + funções com *receiver*: `func (s Sale) Total() Money` | `domain/sale.go` |
| `new Sale(...)` | Função comum `NewSale(...) (Sale, error)` | `domain/sale.go` |
| `throw` / `try…catch` | A função devolve `(valor, err)`; quem chama testa `if err != nil` | em todo lugar |
| `err instanceof ApiError` | `errors.As(err, &alvo)` | `httpapi/server.go` |
| `interface` + `implements` | `interface` satisfeita **sem declarar**: basta ter os métodos | `app/ports.go` |
| `Array<T>` / `Map<K,V>` | slice `[]T` / `map[K]V` | `app/service.go` |
| `for (const x of xs)` | `for _, x := range xs` | `domain/sale.go` |
| `xs.push(x)` | `xs = append(xs, x)` | `domain/sale.go` |
| objeto mutável por referência | ponteiro `*Product`; sem ponteiro, Go **copia** | `domain/product.go` |
| arrow function / closure | `func(...) { ... }` — captura variáveis igualzinho | `app/sales.go` |
| `try { } finally { }` | `defer` | `postgres/store.go` |
| `AbortSignal` | `context.Context` (sempre o 1º parâmetro) | `app/ports.go` |
| `<T>` | `[T any]` | `events/broker.go` |
| `async/await`, `Promise.race` | goroutine (`go f()`), channel, `select` | `events/broker.go`, `httpapi/stream.go` |
| `.env` | `os.Getenv` | `cmd/api/main.go` |
| `import x from './x.json'` | `//go:embed` embute o arquivo no binário | `postgres/store.go` |
| Vitest | `go test ./...` com arquivos `*_test.go` | `domain/domain_test.go` |

Três coisas que mais estranham no começo:

1. **`:=` × `=`.** `x := 1` declara e atribui; `x = 1` só atribui. Dentro de um closure, `:=` cria uma variável *nova* que esconde a de fora — há um comentário sobre isso em `app/sales.go`.
2. **Valor zero.** Toda variável nasce com um valor: `0`, `""`, `false`, `nil`. `var total Money` já é `0`. Não existe `undefined`.
3. **Sem herança.** Reuso é por composição (*embedding*): `type Store struct { repo; pool }` faz `Store` ganhar os métodos de `repo`.

## 3. A arquitetura, comparada com um projeto Laravel

| Laravel | Aqui |
| --- | --- |
| Model Eloquent (dados + regra + banco) | `domain.Sale` (dados + regra) **separado** de `postgres.repo` (banco) |
| Controller | closure de rota em `httpapi/server.go` — magro, só traduz HTTP |
| Service / Action | método de `app.Service` (`CreateSale`, `SchedulePayment`…) |
| Service Container | `cmd/api/main.go`: as dependências são passadas à mão no construtor |
| `DB::transaction(fn)` | `store.WithTx(ctx, func(r Repo) error { … })` |
| Form Request | validação no construtor do domínio (`NewSale`) |
| Migration | `postgres/schema.sql`, embutido e executado na subida |
| Seeder | `app/seed.go` |
| Broadcasting (Echo/Pusher) | `events.Broker` + SSE |

A regra que organiza tudo: **quem usa define a interface**. O pacote `app` declara `Ledger` e `Store` (o que ele precisa); os pacotes `tigerbeetle` e `postgres` apenas têm os métodos certos. Por isso dá para testar os casos de uso com um livro-razão falso em memória — um bom exercício para treinar.

## 4. TigerBeetle: o conceito e onde ele aparece no código

| Conceito | Em uma frase | No código |
| --- | --- | --- |
| **Account** | Uma conta com quatro acumuladores: débitos e créditos, efetivados e pendentes. Não existe campo "saldo" | `OpenAccounts`, `Balances` |
| **Transfer** | Um débito e um crédito de mesmo valor entre duas contas. Imutável | `Post` |
| **Ledger** | Um "livro". Contas de ledgers diferentes não transacionam; aqui há um só, `986` (o código ISO do real) | `ledgerBRL` |
| **Code** | Um número livre para classificar. Na conta guardamos o tipo; na transferência, a operação de negócio | `domain.AccountType`, `domain.EntryKind` |
| **user_data_128** | Campo livre e indexado. Guardamos o id do histórico: é o "JOIN" com o Postgres | `Post`, `app.describe` |
| **Linked** | Transferências encadeadas: ou todas, ou nenhuma. É a transação do TigerBeetle | `Post` (a venda com duas pernas) |
| **Pending → post / void** | Duas fases: reserva, depois confirma ou cancela | `Purchase.Schedule/Confirm/Cancel`, `Resolve` |
| **credits_must_not_exceed_debits** | Trava de saldo verificada pelo banco, sem condição de corrida | `Account.NoOverdraft`, `refusal` |
| **History** | O banco guarda o saldo após cada transferência | `BalanceHistory` (os gráficos) |
| **Imported** | Permite gravar dados antigos com a data original | usado só pelo `seed.go` |
| **Id gerado no cliente** | Reenviar a mesma transferência não lança em dobro (idempotência) | `Service.stamp` |

Contabilidade em um parágrafo: todo lançamento tira de um lugar e põe em outro, no mesmo valor. O lado esquerdo se chama débito, o direito crédito. Ativos e despesas crescem no débito; passivos, patrimônio e receitas crescem no crédito. Por construção, a soma de todos os débitos é igual à de todos os créditos — a tela inicial mostra essa conferência com os números reais.

## 5. Exercícios para praticar

Em ordem de dificuldade. Cada um toca uma camada diferente.

1. **Novo campo.** Adicione `Notes` à venda: `domain/sale.go` → `postgres/schema.sql` e `store.go` → `app/views.go` → formulário em `frontend/src/resources/sale/logics/CreateSale.tsx` (e o model em `resources/sale/models/Sale.ts`).
2. **Novo teste.** Em `domain_test.go`, teste que `Sale.Receive()` falha na segunda chamada.
3. **Nova regra.** Recuse vender abaixo do custo médio. Onde a regra deve morar? (No domínio.)
4. **Livro-razão falso.** Escreva um `type memoryLedger struct` que satisfaça `app.Ledger` e teste `CreateSale` sem banco nenhum.
5. **Novo caso de uso.** Devolução de venda: quais são as pernas? (O inverso das duas da venda, encadeadas.)
6. **Pagamento parcial.** `Resolve` passa `tb.AmountMax` para efetivar tudo; permita efetivar só uma parte da reserva.
7. **Outbox.** Feche a janela de inconsistência descrita em `app/sales.go`: grave a intenção no Postgres, lance no livro-razão depois e marque como feito.
