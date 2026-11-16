package app

import (
	"context"
	"sort"
	"time"

	"razonete/internal/domain"
)

type AccountInput struct {
	ID   domain.AccountID `json:"id"`
	Name string           `json:"name"`
	Type string           `json:"type"`
}

// CreateAccount abre uma conta nova no plano de contas: o cadastro (nome) vai
// para o Postgres e a conta em si (onde os saldos vivem) para o TigerBeetle.
func (s *Service) CreateAccount(ctx context.Context, in AccountInput) (AccountView, error) {
	t, ok := domain.AccountTypeFromSlug(in.Type)
	if !ok {
		return AccountView{}, domain.Invalid("tipo de conta desconhecido")
	}
	account, err := domain.NewAccount(in.ID, in.Name, t)
	if err != nil {
		return AccountView{}, err
	}
	existing, err := s.accountIndex(ctx)
	if err != nil {
		return AccountView{}, err
	}
	if _, taken := existing[account.ID]; taken {
		return AccountView{}, domain.Conflict("já existe uma conta com o número %d", account.ID)
	}

	err = s.store.WithTx(ctx, func(r Repo) error {
		if err := r.SaveAccount(ctx, account); err != nil {
			return err
		}
		// time.Time{} é o valor zero de data: "use a hora do razão".
		return s.ledger.OpenAccounts(ctx, []domain.Account{account}, time.Time{})
	})
	if err != nil {
		return AccountView{}, err
	}
	return accountView(account, domain.Balance{}), nil
}

// Accounts devolve o plano de contas com o saldo atual de cada conta.
func (s *Service) Accounts(ctx context.Context) ([]AccountView, error) {
	accounts, err := s.store.Accounts(ctx)
	if err != nil {
		return nil, err
	}
	ids := make([]domain.AccountID, 0, len(accounts))
	for _, a := range accounts {
		ids = append(ids, a.ID)
	}
	// UMA ida ao TigerBeetle para todos os saldos (lookup em lote).
	balances, err := s.ledger.Balances(ctx, ids)
	if err != nil {
		return nil, err
	}
	views := make([]AccountView, 0, len(accounts))
	for _, a := range accounts {
		views = append(views, accountView(a, balances[a.ID]))
	}
	return views, nil
}

// AccountDetail é o razonete de uma conta: saldo, lançamentos e evolução.
func (s *Service) AccountDetail(ctx context.Context, id domain.AccountID) (AccountDetailView, error) {
	accounts, err := s.accountIndex(ctx)
	if err != nil {
		return AccountDetailView{}, err
	}
	account, ok := accounts[id]
	if !ok {
		return AccountDetailView{}, domain.NotFound("conta %d não encontrada", id)
	}
	balances, err := s.ledger.Balances(ctx, []domain.AccountID{id})
	if err != nil {
		return AccountDetailView{}, err
	}
	entries, err := s.ledger.AccountEntries(ctx, id, 200)
	if err != nil {
		return AccountDetailView{}, err
	}
	views, err := s.describe(ctx, entries)
	if err != nil {
		return AccountDetailView{}, err
	}
	series, err := s.series(ctx, account)
	if err != nil {
		return AccountDetailView{}, err
	}
	return AccountDetailView{Account: accountView(account, balances[id]), Entries: views, Series: series}, nil
}

// series lê do TigerBeetle o saldo da conta após cada lançamento.
func (s *Service) series(ctx context.Context, a domain.Account) ([]SeriesPoint, error) {
	history, err := s.ledger.BalanceHistory(ctx, a.ID, 2000)
	if err != nil {
		return nil, err
	}
	points := make([]SeriesPoint, 0, len(history))
	for _, h := range history {
		points = append(points, SeriesPoint{At: h.Timestamp, Cents: int64(h.Balance.Net(a.Type))})
	}
	// O razão devolve do mais novo para o mais antigo; o gráfico quer o inverso.
	sort.Slice(points, func(i, j int) bool { return points[i].At.Before(points[j].At) })
	return points, nil
}

// Overview monta a visão geral: saldos, resultado, balancete e séries.
func (s *Service) Overview(ctx context.Context) (OverviewView, error) {
	accounts, err := s.Accounts(ctx)
	if err != nil {
		return OverviewView{}, err
	}
	view := OverviewView{Company: s.company, Accounts: accounts, Series: map[domain.AccountID][]SeriesPoint{}}

	for _, a := range accounts {
		view.TotalDebitsCents += a.DebitsCents
		view.TotalCreditsCents += a.CreditsCents
		switch {
		case a.Type == domain.Revenue.Slug():
			view.RevenueCents += a.BalanceCents
		case a.ID == domain.COGS:
			view.COGSCents += a.BalanceCents
		case a.Type == domain.Expense.Slug():
			view.ExpensesCents += a.BalanceCents
		}
	}
	view.NetCents = view.RevenueCents - view.COGSCents - view.ExpensesCents

	index, err := s.accountIndex(ctx)
	if err != nil {
		return OverviewView{}, err
	}
	for _, id := range []domain.AccountID{domain.Cash, domain.Receivable, domain.Inventory, domain.Payable} {
		if view.Series[id], err = s.series(ctx, index[id]); err != nil {
			return OverviewView{}, err
		}
	}
	return view, nil
}

// --- produtos --------------------------------------------------------------

type ProductInput struct {
	SKU        string `json:"sku"`
	Name       string `json:"name"`
	PriceCents int64  `json:"priceCents"`
}

func (s *Service) CreateProduct(ctx context.Context, in ProductInput) (ProductView, error) {
	p, err := domain.NewProduct(in.SKU, in.Name, domain.Money(in.PriceCents))
	if err != nil {
		return ProductView{}, err
	}
	if err := s.store.CreateProduct(ctx, &p); err != nil {
		return ProductView{}, err
	}
	return productView(p), nil
}

func (s *Service) Products(ctx context.Context) ([]ProductView, error) {
	products, err := s.store.Products(ctx)
	if err != nil {
		return nil, err
	}
	views := make([]ProductView, 0, len(products))
	for _, p := range products {
		views = append(views, productView(p))
	}
	return views, nil
}
