// Package tigerbeetle é o ADAPTER do livro-razão: traduz os tipos do nosso
// domínio (Leg, Entry, Balance) para as chamadas do cliente Go do TigerBeetle
// e de volta. É o único pacote do projeto que importa o cliente.
//
// O QUE É O TIGERBEETLE, EM CINCO LINHAS
//   - Um banco de dados que só sabe fazer uma coisa: contabilidade de partidas
//     dobradas. Tem dois "tipos de linha": Account (conta) e Transfer
//     (transferência = um débito + um crédito de mesmo valor).
//   - Não tem SQL, texto nem colunas livres. Só números de tamanho fixo.
//   - Transferências são IMUTÁVEIS: nunca há UPDATE nem DELETE. Errou?
//     Lança-se outra transferência corrigindo.
//   - O saldo de cada conta é mantido pelo próprio banco, e regras como "esta
//     conta não pode ficar negativa" são verificadas por ele, de forma atômica.
//   - Tudo é enviado em LOTES (slices): uma ida à rede leva N operações.
package tigerbeetle

import (
	"context"
	"fmt"
	"net"
	"time"

	// Import com APELIDO: o pacote se chama tigerbeetle_go; aqui vira `tb`.
	tb "github.com/tigerbeetle/tigerbeetle-go"

	"razonete/internal/app"
	"razonete/internal/domain"
)

// ledgerBRL identifica o "livro". Contas só transacionam com contas do mesmo
// ledger — é como o TigerBeetle impede somar reais com dólares. Usamos 986, o
// código numérico ISO 4217 do real.
const ledgerBRL uint32 = 986

// Ledger implementa a porta app.Ledger em cima do TigerBeetle.
type Ledger struct {
	client tb.Client
}

// Esta linha não executa nada: é uma VERIFICAÇÃO EM TEMPO DE COMPILAÇÃO de que
// *Ledger tem todos os métodos de app.Ledger. Se faltar um, o build quebra
// aqui, com uma mensagem clara, em vez de quebrar lá no main.go.
var _ app.Ledger = (*Ledger)(nil)

// Connect abre a conexão com o cluster. O cliente é seguro para uso por várias
// goroutines e deve ser criado UMA vez e compartilhado.
func Connect(clusterID uint64, addresses []string) (*Ledger, error) {
	resolved, err := resolve(addresses)
	if err != nil {
		return nil, err
	}
	client, err := tb.NewClient(tb.ToUint128(clusterID), resolved)
	if err != nil {
		// %w "embrulha" o erro original dentro do novo: a mensagem ganha
		// contexto e errors.Is/As ainda encontram o erro de dentro.
		return nil, fmt.Errorf("conectando ao TigerBeetle: %w", err)
	}
	return &Ledger{client: client}, nil
}

func (l *Ledger) Close() { l.client.Close() }

// resolve troca nomes de máquina por IPs. O cliente do TigerBeetle só aceita
// "ip:porta" (ou só a porta), mas no docker compose o endereço chega como
// "tigerbeetle:3000" — o nome do serviço na rede interna.
func resolve(addresses []string) ([]string, error) {
	out := make([]string, len(addresses))
	for i, addr := range addresses {
		host, port, err := net.SplitHostPort(addr)
		if err != nil {
			out[i] = addr // só a porta ("3000"): já está no formato aceito
			continue
		}
		ips, err := net.LookupHost(host)
		if err != nil {
			return nil, fmt.Errorf("resolvendo o endereço do TigerBeetle %q: %w", host, err)
		}
		out[i] = net.JoinHostPort(ips[0], port)
	}
	return out, nil
}

// NewID gera um id de 128 bits no formato recomendado pelo TigerBeetle:
// carimbo de tempo nos bits altos + aleatório nos baixos (parecido com ULID).
// Ids crescentes no tempo deixam o armazenamento do banco mais eficiente.
func (l *Ledger) NewID() string { return tb.ID().String() }

// OpenAccounts cria as contas.
func (l *Ledger) OpenAccounts(_ context.Context, accounts []domain.Account, at time.Time) error {
	batch := make([]tb.Account, len(accounts))
	for i, a := range accounts {
		flags := tb.AccountFlags{
			// History: o banco guarda o saldo após CADA transferência. É o
			// que alimenta os gráficos de evolução sem recalcular nada.
			History: true,
			// A trava anti-saldo-negativo. Para uma conta de natureza
			// devedora (ativo), "não ficar negativa" = créditos nunca
			// passarem dos débitos. Para as credoras, o espelho.
			CreditsMustNotExceedDebits: a.NoOverdraft && a.Type.DebitNormal(),
			DebitsMustNotExceedCredits: a.NoOverdraft && !a.Type.DebitNormal(),
			// Imported: "estou migrando dados antigos, a data quem dá sou eu".
			Imported: !at.IsZero(),
		}
		batch[i] = tb.Account{
			ID:     tb.ToUint128(uint64(a.ID)),
			Ledger: ledgerBRL,
			Code:   uint16(a.Type), // `code` é livre: guardamos o tipo da conta
			Flags:  flags.ToUint16(),
		}
		if !at.IsZero() {
			// Datas em nanossegundos desde 1970, estritamente crescentes.
			batch[i].Timestamp = uint64(at.UnixNano()) + uint64(i)
		}
	}

	results, err := l.client.CreateAccounts(batch)
	if err != nil {
		return fmt.Errorf("criando contas no razão: %w", err)
	}
	for i, r := range results {
		// AccountExists = já estava lá, idêntica. Criar é idempotente.
		if r.Status != tb.AccountCreated && r.Status != tb.AccountExists {
			return fmt.Errorf("razão recusou a conta %d: %s", accounts[i].ID, r.Status)
		}
	}
	return nil
}

// Post grava as pernas como um lote ENCADEADO (linked): a flag Linked em uma
// transferência diz "meu destino está amarrado ao da próxima". Marcando todas
// menos a última, formamos uma corrente: ou todas são gravadas, ou nenhuma.
// É a transação atômica do TigerBeetle — sem BEGIN/COMMIT.
func (l *Ledger) Post(_ context.Context, legs []domain.Leg) ([]domain.Entry, error) {
	batch := make([]tb.Transfer, len(legs))
	ids := make([]tb.Uint128, len(legs))

	for i, leg := range legs {
		id, err := tb.HexStringToUint128(leg.ID)
		if err != nil {
			return nil, fmt.Errorf("id de lançamento inválido %q: %w", leg.ID, err)
		}
		posting, err := tb.HexStringToUint128(leg.PostingID)
		if err != nil {
			return nil, fmt.Errorf("id de histórico inválido %q: %w", leg.PostingID, err)
		}
		flags := tb.TransferFlags{
			Linked:   i < len(legs)-1,
			Pending:  leg.Pending,
			Imported: !leg.At.IsZero(),
		}
		ids[i] = id
		batch[i] = tb.Transfer{
			ID:              id,
			DebitAccountID:  tb.ToUint128(uint64(leg.Debit)),
			CreditAccountID: tb.ToUint128(uint64(leg.Credit)),
			Amount:          tb.ToUint128(uint64(leg.Amount)),
			// user_data_* são campos livres que o banco indexa. No de 128
			// bits guardamos o id do histórico: é o "JOIN" com o Postgres.
			UserData128: posting,
			Ledger:      ledgerBRL,
			Code:        uint16(leg.Kind),
			Flags:       flags.ToUint16(),
		}
		if !leg.At.IsZero() {
			batch[i].Timestamp = uint64(leg.At.UnixNano())
		}
	}

	results, err := l.client.CreateTransfers(batch)
	if err != nil {
		// Este `err` é falha de TRANSPORTE (cliente fechado, lote grande
		// demais). Recusa de negócio vem em `results`, logo abaixo.
		return nil, fmt.Errorf("enviando lançamentos ao razão: %w", err)
	}
	// O banco devolve um resultado por transferência, na mesma ordem.
	for i, r := range results {
		switch r.Status {
		case tb.TransferCreated, tb.TransferExists:
			// Exists = reenvio idêntico de algo já gravado. Tudo certo.
		case tb.TransferLinkedEventFailed:
			// Esta perna estava boa; caiu porque OUTRA da corrente falhou.
			// O motivo real está no resultado daquela, então seguimos.
		default:
			return nil, refusal(r.Status, legs[i])
		}
	}
	// Se alguma falhou por arrasto mas nenhuma trouxe o motivo, não seguimos.
	for _, r := range results {
		if r.Status == tb.TransferLinkedEventFailed {
			return nil, fmt.Errorf("o razão desfez o lote encadeado")
		}
	}

	return l.lookup(ids)
}

// Resolve confirma ou cancela uma reserva. É uma transferência NOVA que aponta
// (PendingID) para a pendente; a pendente em si continua lá, imutável.
func (l *Ledger) Resolve(_ context.Context, r app.Resolution) (domain.Entry, error) {
	id, err := tb.HexStringToUint128(r.ID)
	if err != nil {
		return domain.Entry{}, fmt.Errorf("id de lançamento inválido %q: %w", r.ID, err)
	}
	pendingID, err := tb.HexStringToUint128(r.PendingID)
	if err != nil {
		return domain.Entry{}, fmt.Errorf("id de reserva inválido %q: %w", r.PendingID, err)
	}
	posting, err := tb.HexStringToUint128(r.PostingID)
	if err != nil {
		return domain.Entry{}, fmt.Errorf("id de histórico inválido %q: %w", r.PostingID, err)
	}

	transfer := tb.Transfer{
		ID:          id,
		PendingID:   pendingID,
		UserData128: posting,
		// Contas, ledger e code ficam zerados: o banco copia da reserva.
	}
	flags := tb.TransferFlags{Imported: !r.At.IsZero()}
	if r.Phase == domain.PhasePost {
		flags.PostPendingTransfer = true
		// AmountMax = "efetive o valor INTEIRO da reserva". (Daria para
		// efetivar só uma parte passando um valor menor.)
		transfer.Amount = tb.AmountMax
	} else {
		flags.VoidPendingTransfer = true
	}
	transfer.Flags = flags.ToUint16()
	if !r.At.IsZero() {
		transfer.Timestamp = uint64(r.At.UnixNano())
	}

	results, err := l.client.CreateTransfers([]tb.Transfer{transfer})
	if err != nil {
		return domain.Entry{}, fmt.Errorf("resolvendo reserva no razão: %w", err)
	}
	for _, res := range results {
		switch res.Status {
		case tb.TransferCreated, tb.TransferExists:
		case tb.TransferPendingTransferAlreadyPosted:
			return domain.Entry{}, domain.Conflict("esta reserva já foi confirmada")
		case tb.TransferPendingTransferAlreadyVoided:
			return domain.Entry{}, domain.Conflict("esta reserva já foi cancelada")
		default:
			return domain.Entry{}, fmt.Errorf("razão recusou a resolução da reserva: %s", res.Status)
		}
	}

	entries, err := l.lookup([]tb.Uint128{id})
	if err != nil {
		return domain.Entry{}, err
	}
	return entries[0], nil
}

// refusal traduz a recusa do banco para um erro do NOSSO domínio. É o papel
// de um adapter: o resto do sistema nunca vê um status do TigerBeetle.
func refusal(status tb.CreateTransferStatus, leg domain.Leg) error {
	switch status {
	case tb.TransferExceedsDebits:
		// A conta CREDITADA tem a trava "créditos não excedem débitos".
		return domain.InsufficientFunds(
			"saldo insuficiente na conta %d: o razão recusou a saída de %s", leg.Credit, leg.Amount)
	case tb.TransferExceedsCredits:
		return domain.InsufficientFunds(
			"saldo insuficiente na conta %d: o razão recusou a saída de %s", leg.Debit, leg.Amount)
	case tb.TransferDebitAccountNotFound, tb.TransferCreditAccountNotFound:
		return domain.NotFound("conta do lançamento não existe no razão")
	case tb.TransferAccountsMustBeDifferent:
		return domain.Invalid("as contas de débito e crédito devem ser diferentes")
	}
	return fmt.Errorf("razão recusou o lançamento %s: %s", leg.Kind.Slug(), status)
}

// Balances busca o saldo de várias contas em uma única ida ao banco.
func (l *Ledger) Balances(_ context.Context, ids []domain.AccountID) (map[domain.AccountID]domain.Balance, error) {
	lookup := make([]tb.Uint128, len(ids))
	for i, id := range ids {
		lookup[i] = tb.ToUint128(uint64(id))
	}
	accounts, err := l.client.LookupAccounts(lookup)
	if err != nil {
		return nil, fmt.Errorf("consultando saldos no razão: %w", err)
	}
	balances := make(map[domain.AccountID]domain.Balance, len(accounts))
	for _, a := range accounts {
		balances[domain.AccountID(toInt(a.ID))] = domain.Balance{
			DebitsPosted:   domain.Money(toInt(a.DebitsPosted)),
			CreditsPosted:  domain.Money(toInt(a.CreditsPosted)),
			DebitsPending:  domain.Money(toInt(a.DebitsPending)),
			CreditsPending: domain.Money(toInt(a.CreditsPending)),
		}
	}
	return balances, nil
}

// Entries devolve os lançamentos mais recentes do livro (diário).
func (l *Ledger) Entries(_ context.Context, limit int) ([]domain.Entry, error) {
	transfers, err := l.client.QueryTransfers(tb.QueryFilter{
		Ledger: ledgerBRL,
		Limit:  uint32(limit),
		Flags:  tb.QueryFilterFlags{Reversed: true}.ToUint32(), // do mais novo ao mais antigo
	})
	if err != nil {
		return nil, fmt.Errorf("consultando o diário no razão: %w", err)
	}
	return toEntries(transfers), nil
}

// AccountEntries devolve os lançamentos que tocaram uma conta (razonete).
func (l *Ledger) AccountEntries(_ context.Context, id domain.AccountID, limit int) ([]domain.Entry, error) {
	transfers, err := l.client.GetAccountTransfers(accountFilter(id, limit))
	if err != nil {
		return nil, fmt.Errorf("consultando a conta %d no razão: %w", id, err)
	}
	return toEntries(transfers), nil
}

// BalanceHistory devolve o saldo da conta após cada lançamento. Só funciona
// porque as contas foram criadas com a flag History.
func (l *Ledger) BalanceHistory(_ context.Context, id domain.AccountID, limit int) ([]domain.BalancePoint, error) {
	history, err := l.client.GetAccountBalances(accountFilter(id, limit))
	if err != nil {
		return nil, fmt.Errorf("consultando o histórico da conta %d: %w", id, err)
	}
	points := make([]domain.BalancePoint, len(history))
	for i, h := range history {
		points[i] = domain.BalancePoint{
			Timestamp: time.Unix(0, int64(h.Timestamp)),
			Balance: domain.Balance{
				DebitsPosted:   domain.Money(toInt(h.DebitsPosted)),
				CreditsPosted:  domain.Money(toInt(h.CreditsPosted)),
				DebitsPending:  domain.Money(toInt(h.DebitsPending)),
				CreditsPending: domain.Money(toInt(h.CreditsPending)),
			},
		}
	}
	return points, nil
}

func accountFilter(id domain.AccountID, limit int) tb.AccountFilter {
	return tb.AccountFilter{
		AccountID: tb.ToUint128(uint64(id)),
		Limit:     uint32(limit),
		// Debits+Credits: tanto as transferências em que a conta foi
		// debitada quanto aquelas em que foi creditada.
		Flags: tb.AccountFilterFlags{Debits: true, Credits: true, Reversed: true}.ToUint32(),
	}
}

func (l *Ledger) lookup(ids []tb.Uint128) ([]domain.Entry, error) {
	transfers, err := l.client.LookupTransfers(ids)
	if err != nil {
		return nil, fmt.Errorf("relendo lançamentos do razão: %w", err)
	}
	if len(transfers) != len(ids) {
		return nil, fmt.Errorf("razão devolveu %d de %d lançamentos", len(transfers), len(ids))
	}
	return toEntries(transfers), nil
}

// toEntries converte transferências do banco em lançamentos do domínio e
// descobre, para cada reserva, se ela já foi confirmada ou cancelada.
func toEntries(transfers []tb.Transfer) []domain.Entry {
	// 1ª passada: quem resolveu quem. Usamos Uint128 direto como chave do map
	// (é um array de 16 bytes, e arrays são comparáveis em Go).
	resolved := map[tb.Uint128]domain.Phase{}
	for _, t := range transfers {
		switch flags := t.TransferFlags(); {
		case flags.PostPendingTransfer:
			resolved[t.PendingID] = domain.PhasePost
		case flags.VoidPendingTransfer:
			resolved[t.PendingID] = domain.PhaseVoid
		}
	}

	entries := make([]domain.Entry, len(transfers))
	for i, t := range transfers {
		e := domain.Entry{
			ID:        t.ID.String(),
			Kind:      domain.EntryKind(t.Code),
			Debit:     domain.AccountID(toInt(t.DebitAccountID)),
			Credit:    domain.AccountID(toInt(t.CreditAccountID)),
			Amount:    domain.Money(toInt(t.Amount)),
			PostingID: t.UserData128.String(),
			Phase:     domain.PhaseSingle,
			Timestamp: time.Unix(0, int64(t.Timestamp)),
		}
		switch flags := t.TransferFlags(); {
		case flags.Pending:
			e.Phase = domain.PhasePending
			e.Resolved = resolved[t.ID] // "" se ainda estiver em aberto
		case flags.PostPendingTransfer:
			e.Phase, e.PendingID = domain.PhasePost, t.PendingID.String()
		case flags.VoidPendingTransfer:
			e.Phase, e.PendingID = domain.PhaseVoid, t.PendingID.String()
		}
		entries[i] = e
	}
	return entries
}

// toInt converte um inteiro de 128 bits do TigerBeetle para int64. Go não tem
// tipo nativo de 128 bits; o cliente representa como 16 bytes. Nossos valores
// (centavos e números de conta) cabem com folga em 64 bits.
func toInt(v tb.Uint128) int64 {
	return v.BigInt().Int64()
}
