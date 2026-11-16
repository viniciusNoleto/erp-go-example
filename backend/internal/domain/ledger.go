package domain

import "time"

// EntryKind diz QUE operação de negócio gerou um lançamento. Vai gravado no
// campo `code` da transferência no TigerBeetle. É por ele que o front-end
// escolhe a animação de cada lançamento.
type EntryKind uint16

const (
	KindCapital     EntryKind = 1  // aporte dos sócios
	KindSaleRevenue EntryKind = 10 // venda: reconhece a receita
	KindSaleCost    EntryKind = 11 // venda: baixa a mercadoria do estoque
	KindReceipt     EntryKind = 12 // cliente pagou
	KindPurchase    EntryKind = 20 // compra de mercadoria a prazo
	KindPayment     EntryKind = 21 // pagamento a fornecedor
	KindExpense     EntryKind = 30 // despesa paga
	KindManual      EntryKind = 40 // lançamento manual
)

func (k EntryKind) Slug() string {
	switch k {
	case KindCapital:
		return "capital"
	case KindSaleRevenue:
		return "sale_revenue"
	case KindSaleCost:
		return "sale_cost"
	case KindReceipt:
		return "receipt"
	case KindPurchase:
		return "purchase"
	case KindPayment:
		return "payment"
	case KindExpense:
		return "expense"
	}
	return "manual"
}

// Leg ("perna") é UM débito + UM crédito de mesmo valor: a menor unidade das
// partidas dobradas. É uma INTENÇÃO de lançamento, ainda não gravada.
//
// Uma venda tem duas pernas (receita e baixa de estoque). Quando mandamos
// várias pernas juntas, o TigerBeetle grava todas ou nenhuma — veja Ledger.Post
// no pacote app.
type Leg struct {
	ID        string    // id da transferência (128 bits em hexadecimal)
	Kind      EntryKind // operação de negócio
	Debit     AccountID // conta debitada
	Credit    AccountID // conta creditada
	Amount    Money     // sempre positivo
	PostingID string    // agrupa as pernas do mesmo evento de negócio

	// Pending = "reserve, mas ainda não efetive". É a primeira fase de um
	// lançamento em duas fases (two-phase transfer), como uma pré-autorização
	// de cartão: o valor fica comprometido até alguém confirmar ou cancelar.
	Pending bool

	// At só é usado na carga de dados históricos (seed). Em operação normal
	// fica zerado e quem carimba a hora é o próprio TigerBeetle.
	At time.Time
}

// Phase descreve o papel de um lançamento dentro das duas fases.
type Phase string

const (
	PhaseSingle  Phase = "single"  // lançamento comum, efetivado na hora
	PhasePending Phase = "pending" // reserva
	PhasePost    Phase = "post"    // confirmação de uma reserva
	PhaseVoid    Phase = "void"    // cancelamento de uma reserva
)

// Entry é um lançamento JÁ GRAVADO no razão, do jeito que o lemos de volta.
// Um lançamento nunca é alterado nem apagado: corrige-se com outro lançamento.
type Entry struct {
	ID        string
	Kind      EntryKind
	Debit     AccountID
	Credit    AccountID
	Amount    Money
	PostingID string
	Phase     Phase
	PendingID string    // para PhasePost/PhaseVoid: qual reserva foi resolvida
	Resolved  Phase     // para PhasePending: "" se ainda aberta, ou post/void
	Timestamp time.Time // carimbado pelo TigerBeetle
}

// BalancePoint é o saldo de uma conta logo após um lançamento. A série desses
// pontos é o gráfico de evolução da conta.
type BalancePoint struct {
	Timestamp time.Time
	Balance   Balance
}

// Posting é o "histórico" de um evento de negócio: o texto que explica um
// grupo de lançamentos. O TigerBeetle guarda números; o texto mora no Postgres.
type Posting struct {
	ID        string
	Memo      string // ex.: "Venda nº 12 — Escola Aquarela"
	DocType   string // "sale", "purchase" ou "" (lançamento avulso)
	DocID     int64  // número do documento, quando houver
	CreatedAt time.Time
}
