// Package app é a camada de APLICAÇÃO: os casos de uso do ERP ("registrar
// venda", "agendar pagamento"...). Ela orquestra — carrega dados, chama as
// regras do domínio, grava o resultado — mas não contém regra de negócio nem
// sabe COMO os dados são guardados.
//
// Analogia com React: se o domain são as funções puras, o app são os seus
// custom hooks de mutação (useCreateSale): juntam validação, chamada e efeitos.
package app

import (
	"context"
	"time"

	"gomoney/internal/domain"
)

// Este arquivo define as PORTAS: as interfaces de que a aplicação precisa.
//
// Em Go, quem DEFINE a interface é quem a USA, não quem a implementa. E a
// implementação não declara "implements": basta ter os mesmos métodos
// (tipagem estrutural, igual às interfaces do TypeScript). Por isso o pacote
// `tigerbeetle` nunca menciona `app.Ledger` — ele simplesmente tem os métodos
// certos, e o main.go encaixa uma coisa na outra.
//
// O ganho: a aplicação depende de um contrato pequeno, não do TigerBeetle.
// Trocar por um livro-razão em memória num teste é só escrever outro struct.

// Ledger é o livro-razão: guarda lançamentos e saldos.
type Ledger interface {
	// NewID gera um id único de 128 bits, ordenável no tempo.
	NewID() string

	// OpenAccounts cria as contas no livro-razão. `at` zerado = agora.
	OpenAccounts(ctx context.Context, accounts []domain.Account, at time.Time) error

	// Post grava as pernas de forma ATÔMICA: ou todas, ou nenhuma.
	Post(ctx context.Context, legs []domain.Leg) ([]domain.Entry, error)

	// Resolve confirma (PhasePost) ou cancela (PhaseVoid) uma reserva.
	Resolve(ctx context.Context, r Resolution) (domain.Entry, error)

	Balances(ctx context.Context, ids []domain.AccountID) (map[domain.AccountID]domain.Balance, error)
	Entries(ctx context.Context, limit int) ([]domain.Entry, error)
	AccountEntries(ctx context.Context, id domain.AccountID, limit int) ([]domain.Entry, error)
	BalanceHistory(ctx context.Context, id domain.AccountID, limit int) ([]domain.BalancePoint, error)
}

// Resolution é o pedido de resolução de uma reserva (segunda fase).
type Resolution struct {
	ID        string       // id do novo lançamento (a confirmação/cancelamento)
	PendingID string       // a reserva que está sendo resolvida
	PostingID string       // histórico ao qual este lançamento pertence
	Phase     domain.Phase // PhasePost ou PhaseVoid
	At        time.Time    // só na carga histórica
}

// Repo são as operações de persistência dos dados "de texto" do ERP
// (cadastros e documentos), que moram no Postgres.
//
// `context.Context` é sempre o PRIMEIRO parâmetro de qualquer função que faz
// I/O em Go. Ele carrega o cancelamento: se o cliente HTTP desistir, o ctx é
// cancelado e a query em andamento é abortada. (Pense no AbortSignal do fetch.)
type Repo interface {
	SaveAccount(ctx context.Context, a domain.Account) error
	Accounts(ctx context.Context) ([]domain.Account, error)

	CreateProduct(ctx context.Context, p *domain.Product) error
	UpdateProduct(ctx context.Context, p domain.Product) error
	Products(ctx context.Context) ([]domain.Product, error)
	// ProductsForUpdate carrega e TRAVA as linhas (SELECT ... FOR UPDATE) até o
	// fim da transação, para duas vendas simultâneas não venderem a mesma unidade.
	ProductsForUpdate(ctx context.Context, ids []int64) (map[int64]*domain.Product, error)

	CreateSale(ctx context.Context, s *domain.Sale) error
	SaleForUpdate(ctx context.Context, id int64) (domain.Sale, error)
	UpdateSale(ctx context.Context, s domain.Sale) error
	Sales(ctx context.Context) ([]domain.Sale, error)

	CreatePurchase(ctx context.Context, p *domain.Purchase) error
	PurchaseForUpdate(ctx context.Context, id int64) (domain.Purchase, error)
	UpdatePurchase(ctx context.Context, p domain.Purchase) error
	Purchases(ctx context.Context) ([]domain.Purchase, error)

	SavePosting(ctx context.Context, p domain.Posting) error
	Postings(ctx context.Context, ids []string) (map[string]domain.Posting, error)
}

// Store é um Repo que também sabe abrir transações.
//
// `Repo` escrito sozinho dentro da interface é EMBEDDING: Store herda todos os
// métodos de Repo. É composição, a forma de reuso do Go (não há herança).
type Store interface {
	Repo

	// WithTx roda `fn` dentro de uma transação do banco. Se fn devolver erro,
	// ROLLBACK; se devolver nil, COMMIT. O Repo que fn recebe enxerga a
	// transação aberta.
	WithTx(ctx context.Context, fn func(Repo) error) error
}

// Publisher avisa quem estiver ouvindo (as abas abertas do navegador, via
// Server-Sent Events) que um lançamento aconteceu.
type Publisher interface {
	Publish(event PostingView)
}
