package app

import (
	"context"
	"time"

	"gomoney/internal/domain"
)

// Service reúne os casos de uso. Os campos são as DEPENDÊNCIAS, recebidas de
// fora pelo construtor — injeção de dependência feita à mão, sem framework.
// (Igual a passar um client por props/context em vez de importá-lo global.)
type Service struct {
	ledger Ledger
	store  Store
	events Publisher

	// now é uma função, não um valor: em produção é time.Now; na carga de
	// dados de demonstração é um relógio falso que anda para trás no tempo.
	// Funções são valores de primeira classe em Go, como em JS.
	now func() time.Time

	// backdate liga o modo "carga histórica": cada lançamento vai com a data
	// do relógio falso em vez da hora do TigerBeetle.
	backdate bool

	company string
}

// NewService é o construtor. Devolve *Service (ponteiro) para que todos
// compartilhem a mesma instância em vez de cópias.
func NewService(ledger Ledger, store Store, events Publisher, company string) *Service {
	return &Service{ledger: ledger, store: store, events: events, now: time.Now, company: company}
}

// stamp completa as pernas que o domínio montou com o que é responsabilidade
// da aplicação: ids únicos, o vínculo com o histórico e (na carga) a data.
//
// Os ids são gerados ANTES de enviar. Isso dá IDEMPOTÊNCIA: se a rede cair e
// reenviarmos as mesmas pernas, o TigerBeetle reconhece os ids e não lança em
// dobro. É a mesma ideia de uma idempotency-key de API de pagamento.
func (s *Service) stamp(legs []domain.Leg, postingID string) []domain.Leg {
	// `for i := range legs` itera pelos índices; mexemos em legs[i] direto
	// porque a variável do `range` com valor seria uma cópia.
	for i := range legs {
		if legs[i].ID == "" {
			legs[i].ID = s.ledger.NewID()
		}
		legs[i].PostingID = postingID
		if s.backdate {
			// Cada perna 1 microssegundo depois da anterior: o TigerBeetle
			// exige datas estritamente crescentes na importação.
			legs[i].At = s.now().Add(time.Duration(i) * time.Microsecond)
		}
	}
	return legs
}

// newPosting cria o histórico (o texto) de um evento de negócio.
func (s *Service) newPosting(memo, docType string, docID int64) domain.Posting {
	return domain.Posting{ID: s.ledger.NewID(), Memo: memo, DocType: docType, DocID: docID, CreatedAt: s.now()}
}

// resolution monta o pedido de confirmação/cancelamento de uma reserva.
func (s *Service) resolution(pendingID, postingID string, phase domain.Phase) Resolution {
	r := Resolution{ID: s.ledger.NewID(), PendingID: pendingID, PostingID: postingID, Phase: phase}
	if s.backdate {
		r.At = s.now()
	}
	return r
}

// announce transforma os lançamentos gravados na resposta da mutação e avisa
// os ouvintes do SSE. Na carga histórica não avisa ninguém.
func (s *Service) announce(ctx context.Context, scene string, posting domain.Posting, entries []domain.Entry) (PostingView, error) {
	accounts, err := s.accountIndex(ctx)
	if err != nil {
		return PostingView{}, err
	}
	view := PostingView{ID: entries[0].ID, Scene: scene, Memo: posting.Memo}
	for _, e := range entries {
		view.Entries = append(view.Entries, entryView(e, accounts, posting))
	}
	if !s.backdate {
		s.events.Publish(view)
	}
	return view, nil
}

// accountIndex carrega o plano de contas num map para busca por número.
// map[K]V é o dicionário do Go (o Map/objeto do JS).
func (s *Service) accountIndex(ctx context.Context) (map[domain.AccountID]domain.Account, error) {
	list, err := s.store.Accounts(ctx)
	if err != nil {
		return nil, err
	}
	index := make(map[domain.AccountID]domain.Account, len(list))
	for _, a := range list {
		index[a.ID] = a
	}
	return index, nil
}

func entryView(e domain.Entry, accounts map[domain.AccountID]domain.Account, p domain.Posting) EntryView {
	return EntryView{
		ID: e.ID, Kind: e.Kind.Slug(),
		// Ler uma chave que não existe num map devolve o valor zero, sem erro.
		Debit: accountRef(accounts[e.Debit]), Credit: accountRef(accounts[e.Credit]),
		AmountCents: int64(e.Amount),
		Phase:       string(e.Phase), Resolved: string(e.Resolved), PendingID: e.PendingID,
		PostingID: e.PostingID, Memo: p.Memo, DocType: p.DocType, DocID: p.DocID,
		Timestamp: e.Timestamp,
	}
}
