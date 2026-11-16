package app

import (
	"context"
	"fmt"

	"razonete/internal/domain"
)

type PurchaseInput struct {
	Supplier string      `json:"supplier"`
	Items    []LineInput `json:"items"`
}

type PurchaseResult struct {
	Purchase PurchaseView `json:"purchase"`
	Posting  PostingView  `json:"posting"`
}

// CreatePurchase dá entrada de mercadoria comprada a prazo:
// D Estoque / C Fornecedores a pagar.
func (s *Service) CreatePurchase(ctx context.Context, in PurchaseInput) (PurchaseResult, error) {
	var (
		purchase domain.Purchase
		posting  domain.Posting
		entries  []domain.Entry
	)
	err := s.store.WithTx(ctx, func(r Repo) error {
		products, err := r.ProductsForUpdate(ctx, productIDs(in.Items))
		if err != nil {
			return err
		}
		lines := make([]domain.PurchaseLine, 0, len(in.Items))
		for _, it := range in.Items {
			p, ok := products[it.ProductID]
			if !ok {
				return domain.NotFound("produto %d não encontrado", it.ProductID)
			}
			lines = append(lines, domain.PurchaseLine{Product: p, Qty: it.Qty, UnitCost: domain.Money(it.UnitCostCents)})
		}
		if purchase, err = domain.NewPurchase(in.Supplier, lines, s.now()); err != nil {
			return err
		}
		if err := r.CreatePurchase(ctx, &purchase); err != nil {
			return err
		}
		for _, p := range products {
			if err := r.UpdateProduct(ctx, *p); err != nil {
				return err
			}
		}
		posting = s.newPosting(fmt.Sprintf("Compra nº %d — %s", purchase.ID, purchase.Supplier), "purchase", purchase.ID)
		if err := r.SavePosting(ctx, posting); err != nil {
			return err
		}
		entries, err = s.ledger.Post(ctx, s.stamp([]domain.Leg{purchase.ReceiptLeg()}, posting.ID))
		return err
	})
	if err != nil {
		return PurchaseResult{}, err
	}
	view, err := s.announce(ctx, "purchase", posting, entries)
	return PurchaseResult{Purchase: purchaseView(purchase), Posting: view}, err
}

// SchedulePayment agenda o pagamento ao fornecedor — a PRIMEIRA FASE de um
// lançamento em duas fases. O TigerBeetle grava uma transferência pendente:
// o valor sai do "disponível" do caixa, mas ainda não do saldo efetivado.
// Se não houver caixa suficiente, é o próprio razão que recusa.
func (s *Service) SchedulePayment(ctx context.Context, id int64) (PurchaseResult, error) {
	return s.movePurchase(ctx, id, "payment_scheduled", "Pagamento agendado da compra nº %d — %s",
		func(p *domain.Purchase, postingID string) (domain.Entry, error) {
			leg, err := p.Schedule(s.ledger.NewID())
			if err != nil {
				return domain.Entry{}, err
			}
			entries, err := s.ledger.Post(ctx, s.stamp([]domain.Leg{leg}, postingID))
			if err != nil {
				return domain.Entry{}, err
			}
			return entries[0], nil
		})
}

// ConfirmPayment é a SEGUNDA FASE, caminho feliz: efetiva a reserva.
func (s *Service) ConfirmPayment(ctx context.Context, id int64) (PurchaseResult, error) {
	return s.movePurchase(ctx, id, "payment_confirmed", "Pagamento confirmado da compra nº %d — %s",
		func(p *domain.Purchase, postingID string) (domain.Entry, error) {
			pendingID, err := p.Confirm()
			if err != nil {
				return domain.Entry{}, err
			}
			return s.ledger.Resolve(ctx, s.resolution(pendingID, postingID, domain.PhasePost))
		})
}

// CancelPayment é a SEGUNDA FASE, caminho de desistência: libera a reserva.
// Nada é apagado: fica registrado que houve uma reserva e que foi cancelada.
func (s *Service) CancelPayment(ctx context.Context, id int64) (PurchaseResult, error) {
	return s.movePurchase(ctx, id, "payment_cancelled", "Agendamento cancelado da compra nº %d — %s",
		func(p *domain.Purchase, postingID string) (domain.Entry, error) {
			pendingID, err := p.Cancel()
			if err != nil {
				return domain.Entry{}, err
			}
			return s.ledger.Resolve(ctx, s.resolution(pendingID, postingID, domain.PhaseVoid))
		})
}

// movePurchase é o esqueleto comum dos três casos de uso acima: carrega a
// compra travada, executa o `step` (que muda o estado e lança no razão),
// salva e anuncia. O que varia entra como FUNÇÃO — o mesmo que extrair um
// hook genérico e passar um callback.
func (s *Service) movePurchase(
	ctx context.Context,
	id int64,
	scene, memoFormat string,
	step func(p *domain.Purchase, postingID string) (domain.Entry, error),
) (PurchaseResult, error) {
	var (
		purchase domain.Purchase
		posting  domain.Posting
		entry    domain.Entry
	)
	err := s.store.WithTx(ctx, func(r Repo) error {
		var err error
		if purchase, err = r.PurchaseForUpdate(ctx, id); err != nil {
			return err
		}
		posting = s.newPosting(fmt.Sprintf(memoFormat, purchase.ID, purchase.Supplier), "purchase", purchase.ID)
		if err := r.SavePosting(ctx, posting); err != nil {
			return err
		}
		if entry, err = step(&purchase, posting.ID); err != nil {
			return err
		}
		return r.UpdatePurchase(ctx, purchase)
	})
	if err != nil {
		return PurchaseResult{}, err
	}
	view, err := s.announce(ctx, scene, posting, []domain.Entry{entry})
	return PurchaseResult{Purchase: purchaseView(purchase), Posting: view}, err
}

// Purchases lista as compras, da mais nova para a mais antiga.
func (s *Service) Purchases(ctx context.Context) ([]PurchaseView, error) {
	purchases, err := s.store.Purchases(ctx)
	if err != nil {
		return nil, err
	}
	views := make([]PurchaseView, 0, len(purchases))
	for _, p := range purchases {
		views = append(views, purchaseView(p))
	}
	return views, nil
}
