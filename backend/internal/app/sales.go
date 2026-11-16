package app

import (
	"context"
	"fmt"

	"razonete/internal/domain"
)

// LineInput é uma linha vinda do formulário. As tags json servem para o
// handler HTTP decodificar o corpo da requisição direto neste struct.
type LineInput struct {
	ProductID     int64 `json:"productId"`
	Qty           int   `json:"qty"`
	UnitCostCents int64 `json:"unitCostCents"` // só em compras
}

type SaleInput struct {
	Customer string      `json:"customer"`
	Items    []LineInput `json:"items"`
}

// SaleResult é o que o caso de uso devolve: o documento e o que foi lançado.
type SaleResult struct {
	Sale    SaleView    `json:"sale"`
	Posting PostingView `json:"posting"`
}

// CreateSale registra uma venda a prazo. É o caso de uso mais completo do
// sistema e vale ler com calma — os outros seguem o mesmo roteiro:
//
//  1. abre uma transação no Postgres e trava os produtos envolvidos;
//  2. pede ao DOMÍNIO para montar a venda (valida e dá baixa do estoque);
//  3. grava venda, estoque e histórico no Postgres (ainda sem commit);
//  4. lança as duas pernas no TigerBeetle, encadeadas;
//  5. se tudo deu certo, commit. Qualquer erro = rollback de tudo.
//
// SOBRE A CONSISTÊNCIA ENTRE OS DOIS BANCOS: Postgres e TigerBeetle não
// compartilham transação. Lançamos no razão por último, com a transação do
// Postgres ainda aberta; se o razão recusar (ex.: sem saldo), o rollback
// desfaz o resto. Resta uma janela pequena: o razão aceita e o commit do
// Postgres falha. Em produção fecha-se essa janela gravando a intenção antes
// (padrão "outbox") e reenviando — o que é seguro porque os ids das pernas
// tornam o lançamento idempotente (veja Service.stamp).
func (s *Service) CreateSale(ctx context.Context, in SaleInput) (SaleResult, error) {
	// Variáveis declaradas fora do closure para "sair" com o resultado.
	var (
		sale    domain.Sale
		posting domain.Posting
		entries []domain.Entry
	)

	// A função anônima abaixo é um CLOSURE: enxerga e altera sale/posting/
	// entries, exatamente como uma arrow function em JS.
	err := s.store.WithTx(ctx, func(r Repo) error {
		products, err := r.ProductsForUpdate(ctx, productIDs(in.Items))
		if err != nil {
			return err
		}

		lines := make([]domain.SaleLine, 0, len(in.Items))
		for _, it := range in.Items {
			// O `, ok` diz se a chave existia no map.
			p, ok := products[it.ProductID]
			if !ok {
				return domain.NotFound("produto %d não encontrado", it.ProductID)
			}
			lines = append(lines, domain.SaleLine{Product: p, Qty: it.Qty})
		}

		// `sale, err = ...` usa `=` e não `:=` de propósito: `:=` criaria
		// uma variável NOVA dentro do closure, escondendo a de fora.
		sale, err = domain.NewSale(in.Customer, lines, s.now())
		if err != nil {
			return err
		}

		// &sale passa o ENDEREÇO da venda para o repositório preencher o ID.
		if err := r.CreateSale(ctx, &sale); err != nil {
			return err
		}
		for _, p := range products {
			// *p "desreferencia" o ponteiro: passa uma cópia do produto.
			if err := r.UpdateProduct(ctx, *p); err != nil {
				return err
			}
		}

		posting = s.newPosting(fmt.Sprintf("Venda nº %d — %s", sale.ID, sale.Customer), "sale", sale.ID)
		if err := r.SavePosting(ctx, posting); err != nil {
			return err
		}

		entries, err = s.ledger.Post(ctx, s.stamp(sale.InvoiceLegs(), posting.ID))
		return err
	})
	if err != nil {
		return SaleResult{}, err
	}

	view, err := s.announce(ctx, "sale", posting, entries)
	return SaleResult{Sale: saleView(sale), Posting: view}, err
}

// ReceiveSale registra o pagamento do cliente: D Caixa / C Clientes a receber.
func (s *Service) ReceiveSale(ctx context.Context, id int64) (SaleResult, error) {
	var (
		sale    domain.Sale
		posting domain.Posting
		entries []domain.Entry
	)
	err := s.store.WithTx(ctx, func(r Repo) error {
		var err error
		if sale, err = r.SaleForUpdate(ctx, id); err != nil {
			return err
		}
		leg, err := sale.Receive() // a regra (só venda em aberto) está no domínio
		if err != nil {
			return err
		}
		if err := r.UpdateSale(ctx, sale); err != nil {
			return err
		}
		posting = s.newPosting(fmt.Sprintf("Recebimento da venda nº %d — %s", sale.ID, sale.Customer), "sale", sale.ID)
		if err := r.SavePosting(ctx, posting); err != nil {
			return err
		}
		entries, err = s.ledger.Post(ctx, s.stamp([]domain.Leg{leg}, posting.ID))
		return err
	})
	if err != nil {
		return SaleResult{}, err
	}
	view, err := s.announce(ctx, "receipt", posting, entries)
	return SaleResult{Sale: saleView(sale), Posting: view}, err
}

// Sales lista as vendas, da mais nova para a mais antiga.
func (s *Service) Sales(ctx context.Context) ([]SaleView, error) {
	sales, err := s.store.Sales(ctx)
	if err != nil {
		return nil, err
	}
	views := make([]SaleView, 0, len(sales))
	for _, sale := range sales {
		views = append(views, saleView(sale))
	}
	return views, nil
}

func productIDs(items []LineInput) []int64 {
	ids := make([]int64, 0, len(items))
	for _, it := range items {
		ids = append(ids, it.ProductID)
	}
	return ids
}
