package domain

import (
	"strings"
	"time"
)

// SaleStatus é o estado de uma venda.
type SaleStatus string

const (
	SaleOpen     SaleStatus = "open"     // faturada, cliente ainda não pagou
	SaleReceived SaleStatus = "received" // cliente pagou
)

// SaleItem é uma linha da venda. Preço e custo são COPIADOS do produto no
// momento da venda: se o preço mudar amanhã, a venda de hoje não muda.
type SaleItem struct {
	ProductID int64
	Name      string
	Qty       int
	UnitPrice Money
	UnitCost  Money
}

// Sale é o AGREGADO de venda: a venda e os seus itens são sempre carregados e
// salvos juntos, e toda regra sobre eles vive aqui.
type Sale struct {
	ID        int64 // número da venda; o banco atribui ao salvar
	Customer  string
	Items     []SaleItem
	Status    SaleStatus
	CreatedAt time.Time
}

// SaleLine é o pedido de uma linha: qual produto e quantas unidades.
// Product é um PONTEIRO porque NewSale vai dar baixa no estoque dele.
type SaleLine struct {
	Product *Product
	Qty     int
}

// NewSale monta uma venda válida e dá baixa do estoque dos produtos.
//
// Repare que a função não fala com banco nenhum: recebe os produtos já
// carregados, altera-os em memória e devolve a venda. Quem persiste é a camada
// de aplicação. Por isso este arquivo é testável com `go test` em milissegundos.
func NewSale(customer string, lines []SaleLine, now time.Time) (Sale, error) {
	customer = strings.TrimSpace(customer)
	if customer == "" {
		return Sale{}, Invalid("informe o cliente")
	}
	if len(lines) == 0 {
		return Sale{}, Invalid("a venda precisa de pelo menos um item")
	}

	sale := Sale{Customer: customer, Status: SaleOpen, CreatedAt: now}
	// `for _, line := range lines` é o for...of do Go. O `_` descarta o índice.
	for _, line := range lines {
		if line.Qty <= 0 {
			return Sale{}, Invalid("a quantidade de %s deve ser maior que zero", line.Product.Name)
		}
		unitCost := line.Product.AvgCost
		// Remove devolve (custo, erro). Aqui só o erro interessa.
		if _, err := line.Product.Remove(line.Qty); err != nil {
			return Sale{}, err
		}
		// append devolve o slice novo — é o push do Go, mas você reatribui.
		sale.Items = append(sale.Items, SaleItem{
			ProductID: line.Product.ID,
			Name:      line.Product.Name,
			Qty:       line.Qty,
			UnitPrice: line.Product.Price,
			UnitCost:  unitCost,
		})
	}
	return sale, nil
}

// Total é o valor faturado ao cliente.
func (s Sale) Total() Money {
	var total Money // `var` sem valor começa no zero do tipo: aqui, 0
	for _, it := range s.Items {
		total += it.UnitPrice.Times(it.Qty)
	}
	return total
}

// Cost é o custo das mercadorias que saíram (CMV).
func (s Sale) Cost() Money {
	var total Money
	for _, it := range s.Items {
		total += it.UnitCost.Times(it.Qty)
	}
	return total
}

// InvoiceLegs são os lançamentos de uma venda a prazo. São DUAS pernas que só
// fazem sentido juntas:
//
//  1. D Clientes a receber / C Receita de vendas   (pelo preço)
//  2. D CMV                / C Estoque             (pelo custo)
//
// Se só a primeira fosse gravada, a empresa teria receita sem ter entregue
// nada. Por isso elas vão "encadeadas" (linked) para o TigerBeetle.
func (s Sale) InvoiceLegs() []Leg {
	return []Leg{
		{Kind: KindSaleRevenue, Debit: Receivable, Credit: SalesRevenue, Amount: s.Total()},
		{Kind: KindSaleCost, Debit: COGS, Credit: Inventory, Amount: s.Cost()},
	}
}

// Receive registra o pagamento do cliente e devolve o lançamento:
// D Caixa / C Clientes a receber.
func (s *Sale) Receive() (Leg, error) {
	if s.Status != SaleOpen {
		return Leg{}, Conflict("a venda nº %d já foi recebida", s.ID)
	}
	s.Status = SaleReceived
	return Leg{Kind: KindReceipt, Debit: Cash, Credit: Receivable, Amount: s.Total()}, nil
}
