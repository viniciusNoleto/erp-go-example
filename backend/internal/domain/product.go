package domain

import "strings"

// Product é um item de estoque.
type Product struct {
	ID      int64
	SKU     string
	Name    string
	Price   Money // preço de venda unitário
	AvgCost Money // custo médio ponderado unitário
	Stock   int   // unidades disponíveis
}

// NewProduct valida os dados de cadastro de um produto.
func NewProduct(sku, name string, price Money) (Product, error) {
	sku, name = strings.ToUpper(strings.TrimSpace(sku)), strings.TrimSpace(name)
	if sku == "" || name == "" {
		return Product{}, Invalid("informe o código e o nome do produto")
	}
	if price <= 0 {
		return Product{}, Invalid("o preço de venda deve ser maior que zero")
	}
	return Product{SKU: sku, Name: name, Price: price}, nil
}

// Receive dá entrada de mercadoria e recalcula o CUSTO MÉDIO PONDERADO, o
// método de custeio mais usado em ERPs brasileiros:
//
//	novo custo = (valor que já havia + valor que chegou) / unidades totais
//
// O receiver é *Product (ponteiro) porque o método ALTERA o produto. Com
// receiver por valor (p Product) o Go trabalharia numa cópia e a alteração se
// perderia. Regra prática: método que muda o struct recebe ponteiro.
func (p *Product) Receive(qty int, unitCost Money) {
	total := p.AvgCost.Times(p.Stock) + unitCost.Times(qty)
	p.Stock += qty
	p.AvgCost = total / Money(p.Stock) // divisão inteira: centavos, sem fração
}

// Remove dá baixa de unidades e devolve o custo do que saiu (o CMV da venda).
func (p *Product) Remove(qty int) (Money, error) {
	if qty > p.Stock {
		return 0, InsufficientStock("estoque insuficiente de %s: há %d, pedido %d", p.Name, p.Stock, qty)
	}
	p.Stock -= qty
	return p.AvgCost.Times(qty), nil
}
