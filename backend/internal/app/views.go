package app

import (
	"time"

	"gomoney/internal/domain"
)

// Este arquivo tem os "views" (ou DTOs): o formato em que os dados SAEM da
// aplicação rumo ao JSON. São separados dos tipos do domínio de propósito:
// o domínio pode mudar por dentro sem quebrar o contrato com o front-end.
//
// O texto entre crases depois de cada campo é uma STRUCT TAG. O pacote
// encoding/json a lê para saber o nome da chave no JSON. Sem a tag, o campo
// `AmountCents` sairia como "AmountCents" em vez de "amountCents".

type AccountRef struct {
	ID   domain.AccountID `json:"id"`
	Name string           `json:"name"`
	Type string           `json:"type"`
}

type AccountView struct {
	AccountRef
	NoOverdraft   bool  `json:"noOverdraft"`
	BalanceCents  int64 `json:"balanceCents"`  // saldo efetivado, do lado natural da conta
	ReservedCents int64 `json:"reservedCents"` // comprometido por reservas
	DebitsCents   int64 `json:"debitsCents"`   // total já debitado
	CreditsCents  int64 `json:"creditsCents"`  // total já creditado
}

type EntryView struct {
	ID          string     `json:"id"`
	Kind        string     `json:"kind"`
	Debit       AccountRef `json:"debit"`
	Credit      AccountRef `json:"credit"`
	AmountCents int64      `json:"amountCents"`
	Phase       string     `json:"phase"`
	Resolved    string     `json:"resolved,omitempty"` // omitempty: some do JSON se vazio
	PendingID   string     `json:"pendingId,omitempty"`
	PostingID   string     `json:"postingId"`
	Memo        string     `json:"memo"`
	DocType     string     `json:"docType,omitempty"`
	DocID       int64      `json:"docId,omitempty"`
	Timestamp   time.Time  `json:"timestamp"`
}

// PostingView é um evento de negócio que acabou de ser lançado: o texto e as
// pernas gravadas. É a resposta de toda mutação e também o que viaja pelo SSE.
// `Scene` diz ao front-end qual animação tocar.
type PostingView struct {
	ID      string      `json:"id"`
	Scene   string      `json:"scene"`
	Memo    string      `json:"memo"`
	Entries []EntryView `json:"entries"`
}

type ProductView struct {
	ID              int64  `json:"id"`
	SKU             string `json:"sku"`
	Name            string `json:"name"`
	PriceCents      int64  `json:"priceCents"`
	AvgCostCents    int64  `json:"avgCostCents"`
	Stock           int    `json:"stock"`
	StockValueCents int64  `json:"stockValueCents"`
}

type ItemView struct {
	ProductID int64  `json:"productId"`
	Name      string `json:"name"`
	Qty       int    `json:"qty"`
	UnitCents int64  `json:"unitCents"`
}

type SaleView struct {
	ID         int64      `json:"id"`
	Customer   string     `json:"customer"`
	Status     string     `json:"status"`
	TotalCents int64      `json:"totalCents"`
	CostCents  int64      `json:"costCents"`
	Items      []ItemView `json:"items"`
	CreatedAt  time.Time  `json:"createdAt"`
}

type PurchaseView struct {
	ID         int64      `json:"id"`
	Supplier   string     `json:"supplier"`
	Status     string     `json:"status"`
	TotalCents int64      `json:"totalCents"`
	Items      []ItemView `json:"items"`
	CreatedAt  time.Time  `json:"createdAt"`
}

type SeriesPoint struct {
	At    time.Time `json:"at"`
	Cents int64     `json:"cents"`
}

type OverviewView struct {
	Company  string        `json:"company"`
	Accounts []AccountView `json:"accounts"`

	// Demonstração do resultado, acumulada desde a abertura da empresa.
	RevenueCents  int64 `json:"revenueCents"`
	COGSCents     int64 `json:"cogsCents"`
	ExpensesCents int64 `json:"expensesCents"`
	NetCents      int64 `json:"netCents"`

	// Balancete: a soma de todos os débitos tem de ser igual à de todos os
	// créditos. No TigerBeetle isso é verdade por construção.
	TotalDebitsCents  int64 `json:"totalDebitsCents"`
	TotalCreditsCents int64 `json:"totalCreditsCents"`

	// Evolução do saldo das contas principais (chave = número da conta).
	Series map[domain.AccountID][]SeriesPoint `json:"series"`
}

type AccountDetailView struct {
	Account AccountView   `json:"account"`
	Entries []EntryView   `json:"entries"`
	Series  []SeriesPoint `json:"series"`
}

// --- conversões domínio -> view -------------------------------------------

func accountRef(a domain.Account) AccountRef {
	return AccountRef{ID: a.ID, Name: a.Name, Type: a.Type.Slug()}
}

func accountView(a domain.Account, b domain.Balance) AccountView {
	return AccountView{
		AccountRef:    accountRef(a),
		NoOverdraft:   a.NoOverdraft,
		BalanceCents:  int64(b.Net(a.Type)),
		ReservedCents: int64(b.Reserved(a.Type)),
		DebitsCents:   int64(b.DebitsPosted),
		CreditsCents:  int64(b.CreditsPosted),
	}
}

func productView(p domain.Product) ProductView {
	return ProductView{
		ID: p.ID, SKU: p.SKU, Name: p.Name,
		PriceCents: int64(p.Price), AvgCostCents: int64(p.AvgCost),
		Stock: p.Stock, StockValueCents: int64(p.AvgCost.Times(p.Stock)),
	}
}

func saleView(s domain.Sale) SaleView {
	// make([]T, 0, n) cria um slice vazio já com espaço para n itens: evita
	// realocar a cada append. É uma otimização comum e barata.
	items := make([]ItemView, 0, len(s.Items))
	for _, it := range s.Items {
		items = append(items, ItemView{ProductID: it.ProductID, Name: it.Name, Qty: it.Qty, UnitCents: int64(it.UnitPrice)})
	}
	return SaleView{
		ID: s.ID, Customer: s.Customer, Status: string(s.Status),
		TotalCents: int64(s.Total()), CostCents: int64(s.Cost()),
		Items: items, CreatedAt: s.CreatedAt,
	}
}

func purchaseView(p domain.Purchase) PurchaseView {
	items := make([]ItemView, 0, len(p.Items))
	for _, it := range p.Items {
		items = append(items, ItemView{ProductID: it.ProductID, Name: it.Name, Qty: it.Qty, UnitCents: int64(it.UnitCost)})
	}
	return PurchaseView{
		ID: p.ID, Supplier: p.Supplier, Status: string(p.Status),
		TotalCents: int64(p.Total()), Items: items, CreatedAt: p.CreatedAt,
	}
}
