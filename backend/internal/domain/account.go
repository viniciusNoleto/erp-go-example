package domain

import "strings"

// AccountType é a natureza contábil de uma conta. O número é gravado no campo
// `code` da conta dentro do TigerBeetle (ele só guarda números, nunca texto).
type AccountType uint16

// `const (...)` com valores explícitos funciona como um enum. Go não tem a
// palavra `enum`; o idioma é "tipo próprio + bloco de constantes".
const (
	Asset     AccountType = 1 // Ativo: o que a empresa TEM (caixa, estoque, a receber)
	Liability AccountType = 2 // Passivo: o que a empresa DEVE (fornecedores)
	Equity    AccountType = 3 // Patrimônio líquido: o que é dos sócios
	Revenue   AccountType = 4 // Receita: o que entrou por vender
	Expense   AccountType = 5 // Despesa/custo: o que foi consumido para operar
)

// DebitNormal diz de que lado a conta "cresce".
//
// Partidas dobradas em uma frase: todo lançamento tira de um lugar e põe em
// outro, no mesmo valor. O lado esquerdo chama-se DÉBITO e o direito CRÉDITO —
// são só nomes de colunas, não significam "bom" ou "ruim".
//
//   - Ativos e despesas aumentam no débito  -> saldo = débitos - créditos
//   - Passivos, PL e receitas aumentam no crédito -> saldo = créditos - débitos
func (t AccountType) DebitNormal() bool {
	return t == Asset || t == Expense
}

// Valid informa se o valor é um dos cinco tipos conhecidos.
func (t AccountType) Valid() bool { return t >= Asset && t <= Expense }

// Slug é o nome estável usado no JSON da API ("asset", "revenue"...).
func (t AccountType) Slug() string {
	// `switch` em Go não precisa de `break`: cada case termina sozinho.
	switch t {
	case Asset:
		return "asset"
	case Liability:
		return "liability"
	case Equity:
		return "equity"
	case Revenue:
		return "revenue"
	case Expense:
		return "expense"
	}
	return "unknown"
}

// AccountTypeFromSlug faz o caminho inverso de Slug. Devolve dois valores: o
// tipo e um bool "achei?". Esse par (valor, ok) é um idioma muito comum em Go.
func AccountTypeFromSlug(slug string) (AccountType, bool) {
	for t := Asset; t <= Expense; t++ {
		if t.Slug() == slug {
			return t, true
		}
	}
	return 0, false
}

// AccountID é o número da conta no plano de contas (1101, 2101...). O mesmo
// número é o ID da conta no TigerBeetle, então dá para conferir os dois lados
// a olho nu.
type AccountID uint64

// Contas que o próprio ERP precisa conhecer para montar os lançamentos de
// venda, compra etc. O primeiro dígito segue a convenção contábil brasileira:
// 1 ativo, 2 passivo, 3 patrimônio líquido, 4 receita, 5 despesa.
const (
	Cash         AccountID = 1101 // Caixa e bancos
	Receivable   AccountID = 1102 // Clientes a receber
	Inventory    AccountID = 1103 // Estoque de mercadorias
	Payable      AccountID = 2101 // Fornecedores a pagar
	Capital      AccountID = 3101 // Capital social
	SalesRevenue AccountID = 4101 // Receita de vendas
	COGS         AccountID = 5101 // Custo das mercadorias vendidas (CMV)
	OpEx         AccountID = 5201 // Despesas operacionais
)

// Account é uma conta do plano de contas.
//
// `struct` é o "objeto com forma fixa" do Go (pense numa interface/type do
// TypeScript, mas que existe em tempo de execução).
type Account struct {
	ID   AccountID
	Name string
	Type AccountType

	// NoOverdraft = "esta conta nunca pode ficar negativa".
	// Vira uma flag da conta no TigerBeetle, e a partir daí é o BANCO DE DADOS
	// que recusa o lançamento que estouraria o saldo — não um `if` nosso que
	// pode ter condição de corrida entre duas requisições simultâneas.
	NoOverdraft bool
}

// NewAccount valida e constrói uma conta. Funções `NewAlgo` são a convenção de
// Go para construtores: não há `new Class()`, só funções comuns que devolvem o
// valor pronto (e um erro, se os dados forem inválidos).
func NewAccount(id AccountID, name string, t AccountType) (Account, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		// Account{} é o "valor zero" do struct: todos os campos zerados.
		return Account{}, Invalid("informe o nome da conta")
	}
	if !t.Valid() {
		return Account{}, Invalid("tipo de conta desconhecido")
	}
	if id < 1000 || id > 9999 {
		return Account{}, Invalid("o número da conta deve ter 4 dígitos (ex.: 5202)")
	}
	if AccountType(id/1000) != t {
		return Account{}, Invalid("contas do tipo escolhido começam com %d (ex.: %d201)", t, t)
	}
	return Account{ID: id, Name: name, Type: t}, nil
}

// DefaultChart é o plano de contas com que toda empresa nova começa.
func DefaultChart() []Account {
	// []Account{...} é um SLICE literal: a lista dinâmica do Go (o Array do JS).
	return []Account{
		{ID: Cash, Name: "Caixa e bancos", Type: Asset, NoOverdraft: true},
		{ID: Receivable, Name: "Clientes a receber", Type: Asset},
		{ID: Inventory, Name: "Estoque de mercadorias", Type: Asset, NoOverdraft: true},
		{ID: Payable, Name: "Fornecedores a pagar", Type: Liability},
		{ID: Capital, Name: "Capital social", Type: Equity},
		{ID: SalesRevenue, Name: "Receita de vendas", Type: Revenue},
		{ID: COGS, Name: "Custo das mercadorias vendidas", Type: Expense},
		{ID: OpEx, Name: "Despesas operacionais", Type: Expense},
	}
}

// Balance são os quatro acumuladores que o TigerBeetle mantém por conta.
// Ele nunca guarda "o saldo": guarda quanto já foi debitado e creditado, e o
// saldo é sempre uma conta de subtrair. Assim nada é sobrescrito e tudo é
// auditável.
type Balance struct {
	DebitsPosted   Money // débitos efetivados
	CreditsPosted  Money // créditos efetivados
	DebitsPending  Money // débitos reservados (lançamento em duas fases)
	CreditsPending Money // créditos reservados
}

// Net é o saldo efetivado da conta, já do lado natural dela.
func (b Balance) Net(t AccountType) Money {
	if t.DebitNormal() {
		return b.DebitsPosted - b.CreditsPosted
	}
	return b.CreditsPosted - b.DebitsPosted
}

// Reserved é quanto do saldo está comprometido por reservas ainda não
// confirmadas (ex.: pagamento agendado a fornecedor saindo do caixa).
func (b Balance) Reserved(t AccountType) Money {
	if t.DebitNormal() {
		return b.CreditsPending
	}
	return b.DebitsPending
}
