package app

import (
	"context"
	"errors"
	"math/rand"
	"time"

	"razonete/internal/domain"
)

// SeedDemo carrega 30 dias de movimento de uma loja fictícia de materiais
// artísticos, para o sistema não abrir vazio. Só roda se o banco estiver zerado.
//
// O interessante aqui: a carga NÃO escreve direto nas tabelas. Ela chama os
// MESMOS casos de uso da API (CreateSale, SchedulePayment...) com um relógio
// falso. Assim os dados de demonstração passam por todas as regras de negócio
// e pelas mesmas travas do razão que os dados reais.
func (s *Service) SeedDemo(ctx context.Context) error {
	existing, err := s.store.Accounts(ctx)
	if err != nil {
		return err
	}
	if len(existing) > 0 {
		return nil // já há dados: não mexe
	}

	// Relógio falso: começa há 30 dias, às 9h.
	y, m, d := s.now().Date()
	start := time.Date(y, m, d, 9, 0, 0, 0, s.now().Location()).AddDate(0, 0, -30)
	clock := start

	// `demo := *s` COPIA o Service (o * desreferencia o ponteiro). A cópia
	// usa o relógio falso e o modo de carga; o serviço real fica intocado.
	demo := *s
	demo.backdate = true
	demo.now = func() time.Time { return clock }

	// rng com semente fixa: os "sorteios" saem iguais em toda execução.
	rng := rand.New(rand.NewSource(1964598542))
	// tick avança o relógio entre um evento e outro.
	tick := func() { clock = clock.Add(time.Duration(11+rng.Intn(40)) * time.Minute) }

	// 1) Plano de contas, datado de uma hora antes do primeiro lançamento.
	chart := domain.DefaultChart()
	for _, a := range chart {
		if err := s.store.SaveAccount(ctx, a); err != nil {
			return err
		}
	}
	if err := s.ledger.OpenAccounts(ctx, chart, start.Add(-time.Hour)); err != nil {
		return err
	}

	// 2) Produtos.
	catalog := []struct {
		sku, name string
		price     int64
	}{
		{"GIZ-24", "Giz pastel seco 24 cores", 8990},
		{"GIZ-48", "Giz pastel oleoso 48 cores", 14990},
		{"PAP-A3", "Papel para pastel A3 180 g (bloco)", 6450},
		{"FIX-400", "Fixador spray 400 ml", 5800},
		{"CAV-M", "Cavalete de mesa em pinus", 21900},
		{"CAR-12", "Carvão vegetal (caixa com 12)", 3490},
		{"ESF-06", "Esfuminho (kit com 6)", 2750},
	}
	ids := map[string]int64{}
	for _, c := range catalog {
		p, err := demo.CreateProduct(ctx, ProductInput{SKU: c.sku, Name: c.name, PriceCents: c.price})
		if err != nil {
			return err
		}
		ids[c.sku] = p.ID
	}
	line := func(sku string, qty int, cost int64) LineInput {
		return LineInput{ProductID: ids[sku], Qty: qty, UnitCostCents: cost}
	}

	// Os eventos fixos do mês, por dia. Cada um é uma função a executar.
	// map[int][]func() error = "para cada dia, uma lista de funções".
	entry := func(kind string, debit, credit domain.AccountID, cents int64, memo string) func() error {
		return func() error {
			_, err := demo.CreateEntry(ctx, EntryInput{Kind: kind, Debit: debit, Credit: credit, AmountCents: cents, Memo: memo})
			return err
		}
	}
	buy := func(supplier string, items ...LineInput) func() error {
		return func() error {
			_, err := demo.CreatePurchase(ctx, PurchaseInput{Supplier: supplier, Items: items})
			return err
		}
	}
	pay := func(purchaseID int64) func() error {
		return func() error {
			if _, err := demo.SchedulePayment(ctx, purchaseID); err != nil {
				return err
			}
			tick()
			_, err := demo.ConfirmPayment(ctx, purchaseID)
			return err
		}
	}
	schedule := func(purchaseID int64) func() error {
		return func() error { _, err := demo.SchedulePayment(ctx, purchaseID); return err }
	}

	fixed := map[int][]func() error{
		0: {
			entry("capital", domain.Cash, domain.Capital, 60_000_00, "Aporte inicial dos sócios"),
			entry("expense", domain.OpEx, domain.Cash, 3_200_00, "Aluguel da loja"),
		},
		1: {
			buy("Distribuidora Belas Cores", line("GIZ-24", 60, 5200), line("GIZ-48", 40, 9100), line("CAR-12", 50, 1780), line("ESF-06", 60, 1190)),
			buy("Papelaria Atacado Sul", line("PAP-A3", 80, 3820), line("FIX-400", 48, 3150)),
		},
		2:  {buy("Marcenaria Ipê Roxo", line("CAV-M", 15, 12800))},
		7:  {entry("expense", domain.OpEx, domain.Cash, 412_37, "Energia elétrica")},
		8:  {pay(1)},
		10: {pay(2)},
		14: {entry("expense", domain.OpEx, domain.Cash, 286_90, "Frete de entregas")},
		15: {entry("expense", domain.OpEx, domain.Cash, 650_00, "Anúncios e divulgação")},
		16: {pay(3)},
		18: {buy("Distribuidora Belas Cores", line("GIZ-24", 36, 5450), line("GIZ-48", 24, 9300), line("ESF-06", 30, 1210))},
		21: {entry("expense", domain.OpEx, domain.Cash, 149_90, "Internet e telefone")},
		25: {buy("Papelaria Atacado Sul", line("PAP-A3", 40, 3990), line("FIX-400", 24, 3200))},
		28: {entry("expense", domain.OpEx, domain.Cash, 890_00, "Honorários do contador")},
		29: {schedule(5)},
	}

	customers := []string{
		"Escola Aquarela", "Studio Traço Livre", "Colégio Monte Verde", "Marina Duarte",
		"Ateliê Casa Amarela", "Rafael Antunes", "Oficina de Arte do Bairro", "Helena Sakamoto",
	}
	skus := []string{"GIZ-24", "GIZ-24", "GIZ-48", "PAP-A3", "PAP-A3", "FIX-400", "CAV-M", "CAR-12", "ESF-06"}

	// due guarda, para cada dia, as vendas cujo cliente paga naquele dia.
	due := map[int][]int64{}

	for day := 0; day < 30; day++ {
		clock = start.AddDate(0, 0, day)

		for _, saleID := range due[day] {
			if _, err := demo.ReceiveSale(ctx, saleID); err != nil {
				return err
			}
			tick()
		}
		for _, run := range fixed[day] {
			if err := run(); err != nil {
				return err
			}
			tick()
		}
		if day < 3 {
			continue // a loja ainda está recebendo a mercadoria
		}

		sales := 1 + rng.Intn(3)
		if wd := clock.Weekday(); wd == time.Saturday || wd == time.Sunday {
			sales = rng.Intn(2)
		}
		for i := 0; i < sales; i++ {
			in := SaleInput{Customer: customers[rng.Intn(len(customers))]}
			for n := 1 + rng.Intn(3); n > 0; n-- {
				in.Items = append(in.Items, LineInput{ProductID: ids[skus[rng.Intn(len(skus))]], Qty: 1 + rng.Intn(5)})
			}
			res, err := demo.CreateSale(ctx, in)
			// Faltou estoque para esta venda sorteada? Segue o baile.
			var derr *domain.Error
			if errors.As(err, &derr) && derr.Code == domain.CodeInsufficientStock {
				continue
			}
			if err != nil {
				return err
			}
			payDay := day + 2 + rng.Intn(6)
			due[payDay] = append(due[payDay], res.Sale.ID)
			tick()
		}
	}
	return nil
}
