package domain

import (
	"errors"
	"testing"
	"time"
)

// Testes em Go moram ao lado do código, em arquivos *_test.go, e rodam com
// `go test ./...`. Não há framework: uma função TestXxx(t *testing.T) que chama
// t.Errorf/t.Fatalf quando algo está errado. (Pense em Vitest sem o `expect`.)

func TestMoneyString(t *testing.T) {
	// "Table-driven test": o idioma de Go para testar muitos casos de uma vez.
	// Um slice de structs anônimos, cada um com entrada e saída esperada.
	cases := []struct {
		in   Money
		want string
	}{
		{0, "R$ 0,00"},
		{5, "R$ 0,05"},
		{123456, "R$ 1.234,56"},
		{-100000000, "-R$ 1.000.000,00"},
	}
	for _, c := range cases {
		if got := c.in.String(); got != c.want {
			t.Errorf("Money(%d).String() = %q, esperado %q", int64(c.in), got, c.want)
		}
	}
}

func TestWeightedAverageCost(t *testing.T) {
	p := Product{Name: "Giz pastel"}
	p.Receive(10, 1000) // 10 un. a R$ 10,00
	p.Receive(30, 2000) // 30 un. a R$ 20,00
	// (10*10 + 30*20) / 40 = R$ 17,50
	if p.AvgCost != 1750 || p.Stock != 40 {
		t.Fatalf("custo médio = %v, estoque = %d", p.AvgCost, p.Stock)
	}
}

func TestSaleLegsBalanceAndStock(t *testing.T) {
	giz := &Product{ID: 1, Name: "Giz pastel", Price: 5000, AvgCost: 3000, Stock: 5}

	sale, err := NewSale("Escola Aquarela", []SaleLine{{Product: giz, Qty: 2}}, time.Now())
	if err != nil {
		t.Fatal(err)
	}
	if giz.Stock != 3 {
		t.Errorf("estoque após a venda = %d, esperado 3", giz.Stock)
	}
	legs := sale.InvoiceLegs()
	if legs[0].Amount != 10000 || legs[1].Amount != 6000 {
		t.Errorf("pernas = %v e %v", legs[0].Amount, legs[1].Amount)
	}

	// Vender mais do que há deve falhar com o código certo.
	_, err = NewSale("Escola Aquarela", []SaleLine{{Product: giz, Qty: 9}}, time.Now())
	// errors.As procura, na cadeia de erros, um erro do tipo *Error e o copia
	// para `derr`. É o `instanceof` + cast do Go.
	var derr *Error
	if !errors.As(err, &derr) || derr.Code != CodeInsufficientStock {
		t.Errorf("erro = %v, esperado insufficient_stock", err)
	}
}

func TestPurchaseStateMachine(t *testing.T) {
	p := Purchase{ID: 7, Status: PurchaseOpen, Items: []PurchaseItem{{Qty: 1, UnitCost: 900}}}

	if _, err := p.Confirm(); err == nil {
		t.Error("confirmar sem agendar deveria falhar")
	}
	leg, err := p.Schedule("abc")
	if err != nil || !leg.Pending || leg.Amount != 900 {
		t.Fatalf("Schedule: leg=%+v err=%v", leg, err)
	}
	if id, _ := p.Cancel(); id != "abc" || p.Status != PurchaseOpen {
		t.Errorf("Cancel devolveu %q, status %s", id, p.Status)
	}
}

func TestNewAccountChecksNumbering(t *testing.T) {
	if _, err := NewAccount(5202, "Frete", Expense); err != nil {
		t.Error(err)
	}
	if _, err := NewAccount(1202, "Frete", Expense); err == nil {
		t.Error("conta de despesa começando com 1 deveria ser recusada")
	}
}
