package domain

import (
	"strings"
	"time"
)

// PurchaseStatus é o estado de uma compra. As transições permitidas são:
//
//	open ──Schedule──▶ scheduled ──Confirm──▶ paid
//	  ▲                    │
//	  └──────Cancel────────┘
//
// "scheduled" corresponde a uma transferência PENDENTE no TigerBeetle: o
// dinheiro continua no caixa, mas reservado — outra saída não consegue gastá-lo.
type PurchaseStatus string

const (
	PurchaseOpen      PurchaseStatus = "open"      // mercadoria recebida, a pagar
	PurchaseScheduled PurchaseStatus = "scheduled" // pagamento agendado (reservado)
	PurchasePaid      PurchaseStatus = "paid"      // paga
)

// PurchaseItem é uma linha da compra.
type PurchaseItem struct {
	ProductID int64
	Name      string
	Qty       int
	UnitCost  Money
}

// Purchase é o agregado de compra.
type Purchase struct {
	ID        int64
	Supplier  string
	Items     []PurchaseItem
	Status    PurchaseStatus
	PendingID string // id da reserva no livro-razão enquanto Status == scheduled
	CreatedAt time.Time
}

// PurchaseLine é o pedido de uma linha de compra.
type PurchaseLine struct {
	Product  *Product
	Qty      int
	UnitCost Money
}

// NewPurchase monta a compra e dá entrada da mercadoria no estoque,
// recalculando o custo médio de cada produto.
func NewPurchase(supplier string, lines []PurchaseLine, now time.Time) (Purchase, error) {
	supplier = strings.TrimSpace(supplier)
	if supplier == "" {
		return Purchase{}, Invalid("informe o fornecedor")
	}
	if len(lines) == 0 {
		return Purchase{}, Invalid("a compra precisa de pelo menos um item")
	}

	p := Purchase{Supplier: supplier, Status: PurchaseOpen, CreatedAt: now}
	for _, line := range lines {
		if line.Qty <= 0 || line.UnitCost <= 0 {
			return Purchase{}, Invalid("quantidade e custo de %s devem ser maiores que zero", line.Product.Name)
		}
		line.Product.Receive(line.Qty, line.UnitCost)
		p.Items = append(p.Items, PurchaseItem{
			ProductID: line.Product.ID,
			Name:      line.Product.Name,
			Qty:       line.Qty,
			UnitCost:  line.UnitCost,
		})
	}
	return p, nil
}

// Total é o valor devido ao fornecedor.
func (p Purchase) Total() Money {
	var total Money
	for _, it := range p.Items {
		total += it.UnitCost.Times(it.Qty)
	}
	return total
}

// ReceiptLeg é o lançamento da entrada da mercadoria:
// D Estoque / C Fornecedores a pagar.
func (p Purchase) ReceiptLeg() Leg {
	return Leg{Kind: KindPurchase, Debit: Inventory, Credit: Payable, Amount: p.Total()}
}

// Schedule agenda o pagamento: devolve uma perna PENDENTE
// (D Fornecedores / C Caixa) que reserva o dinheiro sem tirá-lo do caixa.
func (p *Purchase) Schedule(pendingID string) (Leg, error) {
	if p.Status != PurchaseOpen {
		return Leg{}, Conflict("a compra nº %d não está em aberto", p.ID)
	}
	p.Status = PurchaseScheduled
	p.PendingID = pendingID
	return Leg{ID: pendingID, Kind: KindPayment, Debit: Payable, Credit: Cash, Amount: p.Total(), Pending: true}, nil
}

// Confirm efetiva o pagamento agendado. Devolve o id da reserva a confirmar.
func (p *Purchase) Confirm() (string, error) {
	if p.Status != PurchaseScheduled {
		return "", Conflict("a compra nº %d não tem pagamento agendado", p.ID)
	}
	pendingID := p.PendingID
	p.Status, p.PendingID = PurchasePaid, ""
	return pendingID, nil
}

// Cancel desfaz o agendamento: a reserva é liberada e a compra volta a "a pagar".
func (p *Purchase) Cancel() (string, error) {
	if p.Status != PurchaseScheduled {
		return "", Conflict("a compra nº %d não tem pagamento agendado", p.ID)
	}
	pendingID := p.PendingID
	p.Status, p.PendingID = PurchaseOpen, ""
	return pendingID, nil
}
