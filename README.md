# GoMoney

<img src="frontend/public/mark.svg" width="72" alt="A marca do GoMoney: a marmota do Go segurando uma moeda de ouro">

Um ERP pequeno e de verdade — vendas, compras, estoque e contabilidade — em que **todo o dinheiro passa por um livro-razão de partidas dobradas no [TigerBeetle](https://tigerbeetle.com/)**.

- **Backend:** Go (biblioteca padrão para HTTP, `pgx` para Postgres, cliente oficial do TigerBeetle), em arquitetura hexagonal / DDD leve.
- **Frontend:** Next.js 16 (App Router, exportação estática) + React 19 + TypeScript, [Mantine](https://mantine.dev/) 9, TanStack Query, Motion. As telas de trabalho são sóbrias, em papel claro, feitas para ler por horas; o vidro líquido sobre a gravação em guilhoché fica só na página de apresentação (`/`). Cada tipo de lançamento tem a sua própria animação.
- **Dados:** TigerBeetle guarda contas, lançamentos e saldos. Postgres guarda cadastros e textos.

O código Go é comentado em português, pensando em quem vem de React/Laravel. Comece por [`docs/GUIA-GO.md`](docs/GUIA-GO.md).

## Rodando

Só é preciso Docker e `make`.

```bash
make install
```

O `make install` cria o `.env` a partir do `.env.example`, constrói as imagens, instala as dependências do front (dentro do container) e sobe tudo. Depois disso, `make up` e `make down` ligam e desligam o sistema.

| O quê | Onde |
| --- | --- |
| Apresentação | http://localhost:5180 |
| Aplicação | http://localhost:5180/overview |
| API | http://localhost:8088/api/overview |
| Postgres | `localhost:5433` (usuário, senha e banco: `razonete`) |
| TigerBeetle | `localhost:3001` |

Na primeira subida a API carrega 30 dias de movimento de uma loja fictícia de materiais artísticos (o **Ateliê Pipa**). Para zerar e recarregar:

```bash
make reset-data
```

### Ambientes

O `APP_ENV` do `.env` escolhe o arquivo `docker-compose.{APP_ENV}.yml`:

- **`local`**: o front roda no `next dev`, com hot reload (`configs/docker/node/Dockerfile.local`). A pasta `./frontend` inteira é montada no container, inclusive o `node_modules`, então o editor e as ferramentas do host usam as mesmas dependências. Salvou, o navegador atualiza.
- **`production`**: o front é exportado como site estático (`next build` com `output: 'export'`) e servido pelo nginx (`configs/docker/node/Dockerfile.deploy` + `configs/docker/nginx/default.conf`). Nenhum container publica porta: o front entra na rede do Nginx Proxy Manager (`PROXY_NETWORK`).

### Comandos úteis

| Comando | O que faz |
| --- | --- |
| `make watch` | sobe tudo em primeiro plano, com os logs |
| `make logs` / `make logs-api` | acompanha os logs do front / da API |
| `make npm-install b=pacote` | instala um pacote no front (dentro do container) |
| `make typecheck` | roda o `tsc --noEmit` no front |
| `make update-api` | recompila e reinicia só a API, depois de mexer em `./backend` |
| `make shell` | abre um shell no container do front |
| `make go-test` | `go vet` e testes do Go, sem precisar de Go instalado |
| `make demo-video` | grava o vídeo de apresentação com o Playwright (abaixo) |

### Vídeo de apresentação

`make demo-video` (ou `npm run demo:video` em `frontend/`) grava um teste longo do Playwright que começa na página de apresentação e passa por todas as telas e ações: visão geral, lançamento chegando ao vivo, vendas (com validação, recebimento e recusa por falta de estoque), produto novo, compra com custo médio, pagamento em duas fases, conta nova, despesa, aporte, lançamento manual, recusa do razão, filtros do diário e razonete. Sai em `frontend/videos/apresentacao.mp4` (sem ffmpeg, o `.webm` cru).

Não encosta nos dados do `make up`: sobe uma stack própria do compose (`gomoney-demo`, API na porta `8099`, sem volumes) com a loja de demonstração recém-carregada e serve o build estático na porta `3200`; no fim, apaga tudo. Precisa de Docker e, no host, de Node e do Chromium do Playwright (`npx playwright install chromium`, uma vez). `DEMO_SKIP_BUILD=1` reaproveita o último `out/`; `DEMO_KEEP_STACK=1` deixa a stack no ar.

## O que dá para fazer

| Tela | Ação | O que acontece no razão |
| --- | --- | --- |
| Vendas | Faturar venda | Duas pernas **encadeadas** (ou as duas, ou nenhuma): `D Clientes a receber / C Receita` e `D CMV / C Estoque` |
| Vendas | Receber | `D Caixa / C Clientes a receber` |
| Compras | Dar entrada | `D Estoque / C Fornecedores`, e o custo médio é recalculado |
| Compras | Agendar pagamento | Lançamento **pendente** (1ª fase): o valor fica reservado no caixa |
| Compras | Confirmar / Cancelar | 2ª fase: efetiva (`post`) ou libera (`void`) a reserva |
| Lançamentos | Despesa, aporte, manual | Uma perna entre duas contas |
| Contas | Abrir conta, ver razonete | Conta criada no TigerBeetle; razonete e gráfico vêm do histórico de saldos |

Experimente lançar uma despesa maior que o caixa: quem recusa é o próprio TigerBeetle (a conta tem a trava "créditos não excedem débitos"), e a interface mostra a animação de recusa.

## Arquitetura

```
frontend (React)  ──HTTP/JSON + SSE──▶  backend (Go)
                                          │
                 ┌────────────────────────┼────────────────────────┐
                 ▼                                                 ▼
        Postgres: o TEXTO                              TigerBeetle: os NÚMEROS
   produtos, vendas, compras,                    contas, lançamentos, saldos,
   nomes das contas, históricos                  travas de saldo, histórico
```

```
backend/
  cmd/api/main.go              ponto de entrada: monta e liga todas as peças
  internal/
    domain/                    regras de negócio puras (não importa nada de fora)
    app/                       casos de uso + as interfaces (portas) de que precisam
    adapters/
      httpapi/                 HTTP e Server-Sent Events
      postgres/                SQL à mão com pgx
      tigerbeetle/             o livro-razão
    platform/events/           pub/sub em memória (goroutines e channels)
frontend/
  src/app/page.tsx             a apresentação (vidro líquido)
  src/app/(app)/               as telas de trabalho, uma pasta por área (rotas em inglês: /overview, /sales…)
  src/resources/               um módulo por recurso da API: models, enums, services e logics (as ações)
  src/components/              só componentes globais, por contexto: form/, utils/, layout/, stage/…
  src/components/stage/        o palco das animações de lançamento
  src/theme.ts                 o tema do Mantine: papel, tinta e o ouro da moeda
```

As dependências apontam sempre para dentro: `domain` não conhece ninguém, `app` conhece só `domain`, os `adapters` conhecem os dois.

## De onde vieram as ideias

| Referência | O que este projeto aproveitou |
| --- | --- |
| [ThreeDotsLabs/wild-workouts-go-ddd-example](https://github.com/ThreeDotsLabs/wild-workouts-go-ddd-example) | As camadas `domain` / `app` / `adapters`, as portas definidas por quem usa e a transação passada como closure (`WithTx`) |
| [sklinkert/go-ddd](https://github.com/sklinkert/go-ddd) | Agregados com construtor que valida (`NewSale`, `NewPurchase`) e repositórios por agregado |
| [formancehq/ledger](https://github.com/formancehq/ledger) | Pensar todo evento de negócio como um conjunto de pernas de partidas dobradas, imutáveis |
| [iota-uz/iota-sdk](https://github.com/iota-uz/iota-sdk) | O recorte de um ERP em módulos (financeiro, vendas, compras, estoque) |
| [TigerBeetle](https://docs.tigerbeetle.com/) | Transferências encadeadas, duas fases, travas de saldo, histórico de saldos e importação com data |

## Limites conhecidos

- **Dois bancos, uma operação.** Postgres e TigerBeetle não compartilham transação. O razão é chamado por último, com a transação do Postgres aberta; se ele recusar, tudo é desfeito. Resta a janela "o razão aceitou e o commit do Postgres falhou", que em produção se fecha com outbox e reenvio idempotente. Está explicado em `backend/internal/app/sales.go`.
- **Sem login.** É um sistema de uma empresa só, sem usuários nem permissões.
- **TigerBeetle em modo desenvolvimento**, com uma réplica. Em produção são seis.
- **Sem impostos, devoluções e estornos.**

## Créditos

A marca do GoMoney é uma versão estilizada da marmota do Go (o *gopher*), criação de [Renée French](https://reneefrench.blogspot.com/), sob a licença [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
