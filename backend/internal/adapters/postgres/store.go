// Package postgres é o ADAPTER de persistência dos cadastros e documentos.
// Implementa as portas app.Repo e app.Store com SQL escrito à mão (sem ORM —
// o costume em Go é SQL explícito; quem vem do Eloquent estranha no início,
// mas ganha queries previsíveis e fáceis de otimizar).
package postgres

import (
	"context"
	_ "embed" // import "em branco": só para habilitar a diretiva //go:embed
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"gomoney/internal/app"
	"gomoney/internal/domain"
)

// A diretiva abaixo manda o compilador EMBUTIR o arquivo schema.sql dentro do
// binário, na variável `schema`. O executável final não precisa de arquivos
// soltos ao lado — um dos charmes do deploy em Go.
//
//go:embed schema.sql
var schema string

// querier é o que há em comum entre o pool de conexões e uma transação: os
// dois sabem executar SQL. Declarando essa interface pequena, o MESMO código
// de repositório funciona dentro ou fora de uma transação.
type querier interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

// repo implementa app.Repo em cima de qualquer querier.
type repo struct {
	q querier
}

// Store é o repo ligado ao pool, mais a capacidade de abrir transações.
// O `repo` sem nome de campo é EMBEDDING: Store ganha todos os métodos de repo.
type Store struct {
	repo
	pool *pgxpool.Pool
}

var _ app.Store = (*Store)(nil) // verificação em tempo de compilação

// Open conecta ao Postgres e garante que as tabelas existem.
func Open(ctx context.Context, url string) (*Store, error) {
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		return nil, fmt.Errorf("abrindo pool do Postgres: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("Postgres não respondeu: %w", err)
	}
	if _, err := pool.Exec(ctx, schema); err != nil {
		pool.Close()
		return nil, fmt.Errorf("criando tabelas: %w", err)
	}
	return &Store{repo: repo{q: pool}, pool: pool}, nil
}

func (s *Store) Close() { s.pool.Close() }

// WithTx roda fn dentro de uma transação.
func (s *Store) WithTx(ctx context.Context, fn func(app.Repo) error) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("abrindo transação: %w", err)
	}
	// O defer garante o ROLLBACK em qualquer saída (erro, panic, return no
	// meio). Depois de um Commit bem-sucedido o Rollback não faz nada.
	defer tx.Rollback(ctx)

	// fn recebe um repo que fala com a TRANSAÇÃO, não com o pool.
	if err := fn(repo{q: tx}); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// --- contas ------------------------------------------------------------------

func (r repo) SaveAccount(ctx context.Context, a domain.Account) error {
	// $1, $2... são parâmetros: o valor NUNCA é concatenado no SQL, então
	// não há como sofrer SQL injection.
	_, err := r.q.Exec(ctx,
		`INSERT INTO accounts (id, name, type, no_overdraft) VALUES ($1, $2, $3, $4)`,
		a.ID, a.Name, a.Type, a.NoOverdraft)
	return err
}

func (r repo) Accounts(ctx context.Context) ([]domain.Account, error) {
	rows, err := r.q.Query(ctx, `SELECT id, name, type, no_overdraft FROM accounts ORDER BY id`)
	if err != nil {
		return nil, err
	}
	// pgx.CollectRows percorre o resultado e monta o slice, chamando a função
	// para cada linha. Scan copia as colunas para os ENDEREÇOS (&) passados.
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.Account, error) {
		var a domain.Account
		err := row.Scan(&a.ID, &a.Name, &a.Type, &a.NoOverdraft)
		return a, err
	})
}

// --- produtos ----------------------------------------------------------------

const productColumns = `id, sku, name, price_cents, avg_cost_cents, stock`

func scanProduct(row pgx.CollectableRow) (domain.Product, error) {
	var p domain.Product
	err := row.Scan(&p.ID, &p.SKU, &p.Name, &p.Price, &p.AvgCost, &p.Stock)
	return p, err
}

func (r repo) CreateProduct(ctx context.Context, p *domain.Product) error {
	// RETURNING id devolve a chave gerada; Scan a grava direto em p.ID.
	err := r.q.QueryRow(ctx,
		`INSERT INTO products (sku, name, price_cents) VALUES ($1, $2, $3) RETURNING id`,
		p.SKU, p.Name, p.Price).Scan(&p.ID)

	// Violação de UNIQUE (código 23505 do Postgres) vira erro de negócio.
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return domain.Conflict("já existe um produto com o código %s", p.SKU)
	}
	return err
}

func (r repo) UpdateProduct(ctx context.Context, p domain.Product) error {
	_, err := r.q.Exec(ctx,
		`UPDATE products SET avg_cost_cents = $2, stock = $3 WHERE id = $1`,
		p.ID, p.AvgCost, p.Stock)
	return err
}

func (r repo) Products(ctx context.Context) ([]domain.Product, error) {
	rows, err := r.q.Query(ctx, `SELECT `+productColumns+` FROM products ORDER BY name`)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, scanProduct)
}

func (r repo) ProductsForUpdate(ctx context.Context, ids []int64) (map[int64]*domain.Product, error) {
	// ANY($1) recebe o slice inteiro como um array do Postgres.
	// FOR UPDATE trava as linhas até o fim da transação; ORDER BY id faz todas
	// as transações travarem na mesma ordem, o que evita deadlock.
	rows, err := r.q.Query(ctx,
		`SELECT `+productColumns+` FROM products WHERE id = ANY($1) ORDER BY id FOR UPDATE`, ids)
	if err != nil {
		return nil, err
	}
	list, err := pgx.CollectRows(rows, scanProduct)
	if err != nil {
		return nil, err
	}
	products := make(map[int64]*domain.Product, len(list))
	for i := range list {
		// &list[i] = ponteiro para o item DENTRO do slice (não para uma cópia).
		products[list[i].ID] = &list[i]
	}
	return products, nil
}

// --- vendas ------------------------------------------------------------------

func (r repo) CreateSale(ctx context.Context, s *domain.Sale) error {
	err := r.q.QueryRow(ctx,
		`INSERT INTO sales (customer, status, created_at) VALUES ($1, $2, $3) RETURNING id`,
		s.Customer, s.Status, s.CreatedAt).Scan(&s.ID)
	if err != nil {
		return err
	}
	for i, it := range s.Items {
		_, err := r.q.Exec(ctx,
			`INSERT INTO sale_items (sale_id, position, product_id, name, qty, unit_price_cents, unit_cost_cents)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			s.ID, i, it.ProductID, it.Name, it.Qty, it.UnitPrice, it.UnitCost)
		if err != nil {
			return err
		}
	}
	return nil
}

func (r repo) UpdateSale(ctx context.Context, s domain.Sale) error {
	_, err := r.q.Exec(ctx, `UPDATE sales SET status = $2 WHERE id = $1`, s.ID, s.Status)
	return err
}

func (r repo) SaleForUpdate(ctx context.Context, id int64) (domain.Sale, error) {
	sales, err := r.sales(ctx, `WHERE id = $1 FOR UPDATE`, id)
	if err != nil {
		return domain.Sale{}, err
	}
	if len(sales) == 0 {
		return domain.Sale{}, domain.NotFound("venda nº %d não encontrada", id)
	}
	return sales[0], nil
}

func (r repo) Sales(ctx context.Context) ([]domain.Sale, error) {
	return r.sales(ctx, `ORDER BY id DESC`)
}

// sales carrega vendas + itens em DUAS queries (não uma por venda — o famoso
// problema N+1 que o Eloquent resolve com `with()`; aqui resolvemos na mão).
func (r repo) sales(ctx context.Context, clause string, args ...any) ([]domain.Sale, error) {
	rows, err := r.q.Query(ctx, `SELECT id, customer, status, created_at FROM sales `+clause, args...)
	if err != nil {
		return nil, err
	}
	sales, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.Sale, error) {
		var s domain.Sale
		err := row.Scan(&s.ID, &s.Customer, &s.Status, &s.CreatedAt)
		return s, err
	})
	if err != nil || len(sales) == 0 {
		return sales, err
	}

	// Índice id -> posição no slice, para encaixar cada item na sua venda.
	index := make(map[int64]int, len(sales))
	ids := make([]int64, len(sales))
	for i, s := range sales {
		index[s.ID], ids[i] = i, s.ID
	}
	rows, err = r.q.Query(ctx,
		`SELECT sale_id, product_id, name, qty, unit_price_cents, unit_cost_cents
		   FROM sale_items WHERE sale_id = ANY($1) ORDER BY sale_id, position`, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var saleID int64
		var it domain.SaleItem
		if err := rows.Scan(&saleID, &it.ProductID, &it.Name, &it.Qty, &it.UnitPrice, &it.UnitCost); err != nil {
			return nil, err
		}
		sale := &sales[index[saleID]]
		sale.Items = append(sale.Items, it)
	}
	return sales, rows.Err()
}

// --- compras -----------------------------------------------------------------

func (r repo) CreatePurchase(ctx context.Context, p *domain.Purchase) error {
	err := r.q.QueryRow(ctx,
		`INSERT INTO purchases (supplier, status, created_at) VALUES ($1, $2, $3) RETURNING id`,
		p.Supplier, p.Status, p.CreatedAt).Scan(&p.ID)
	if err != nil {
		return err
	}
	for i, it := range p.Items {
		_, err := r.q.Exec(ctx,
			`INSERT INTO purchase_items (purchase_id, position, product_id, name, qty, unit_cost_cents)
			 VALUES ($1, $2, $3, $4, $5, $6)`,
			p.ID, i, it.ProductID, it.Name, it.Qty, it.UnitCost)
		if err != nil {
			return err
		}
	}
	return nil
}

func (r repo) UpdatePurchase(ctx context.Context, p domain.Purchase) error {
	_, err := r.q.Exec(ctx,
		`UPDATE purchases SET status = $2, pending_id = $3 WHERE id = $1`, p.ID, p.Status, p.PendingID)
	return err
}

func (r repo) PurchaseForUpdate(ctx context.Context, id int64) (domain.Purchase, error) {
	purchases, err := r.purchases(ctx, `WHERE id = $1 FOR UPDATE`, id)
	if err != nil {
		return domain.Purchase{}, err
	}
	if len(purchases) == 0 {
		return domain.Purchase{}, domain.NotFound("compra nº %d não encontrada", id)
	}
	return purchases[0], nil
}

func (r repo) Purchases(ctx context.Context) ([]domain.Purchase, error) {
	return r.purchases(ctx, `ORDER BY id DESC`)
}

func (r repo) purchases(ctx context.Context, clause string, args ...any) ([]domain.Purchase, error) {
	rows, err := r.q.Query(ctx, `SELECT id, supplier, status, pending_id, created_at FROM purchases `+clause, args...)
	if err != nil {
		return nil, err
	}
	purchases, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.Purchase, error) {
		var p domain.Purchase
		err := row.Scan(&p.ID, &p.Supplier, &p.Status, &p.PendingID, &p.CreatedAt)
		return p, err
	})
	if err != nil || len(purchases) == 0 {
		return purchases, err
	}

	index := make(map[int64]int, len(purchases))
	ids := make([]int64, len(purchases))
	for i, p := range purchases {
		index[p.ID], ids[i] = i, p.ID
	}
	rows, err = r.q.Query(ctx,
		`SELECT purchase_id, product_id, name, qty, unit_cost_cents
		   FROM purchase_items WHERE purchase_id = ANY($1) ORDER BY purchase_id, position`, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var purchaseID int64
		var it domain.PurchaseItem
		if err := rows.Scan(&purchaseID, &it.ProductID, &it.Name, &it.Qty, &it.UnitCost); err != nil {
			return nil, err
		}
		purchase := &purchases[index[purchaseID]]
		purchase.Items = append(purchase.Items, it)
	}
	return purchases, rows.Err()
}

// --- históricos --------------------------------------------------------------

func (r repo) SavePosting(ctx context.Context, p domain.Posting) error {
	_, err := r.q.Exec(ctx,
		`INSERT INTO postings (id, memo, doc_type, doc_id, created_at) VALUES ($1, $2, $3, $4, $5)`,
		p.ID, p.Memo, p.DocType, p.DocID, p.CreatedAt)
	return err
}

func (r repo) Postings(ctx context.Context, ids []string) (map[string]domain.Posting, error) {
	rows, err := r.q.Query(ctx,
		`SELECT id, memo, doc_type, doc_id, created_at FROM postings WHERE id = ANY($1)`, ids)
	if err != nil {
		return nil, err
	}
	list, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.Posting, error) {
		var p domain.Posting
		err := row.Scan(&p.ID, &p.Memo, &p.DocType, &p.DocID, &p.CreatedAt)
		return p, err
	})
	if err != nil {
		return nil, err
	}
	postings := make(map[string]domain.Posting, len(list))
	for _, p := range list {
		postings[p.ID] = p
	}
	return postings, nil
}
