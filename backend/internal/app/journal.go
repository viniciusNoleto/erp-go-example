package app

import (
	"context"
	"strings"

	"gomoney/internal/domain"
)

// EntryInput é um lançamento avulso: aporte de capital, despesa ou manual.
type EntryInput struct {
	Kind        string           `json:"kind"` // "capital", "expense" ou "manual"
	Debit       domain.AccountID `json:"debit"`
	Credit      domain.AccountID `json:"credit"`
	AmountCents int64            `json:"amountCents"`
	Memo        string           `json:"memo"`
}

// CreateEntry grava um lançamento avulso de uma perna.
func (s *Service) CreateEntry(ctx context.Context, in EntryInput) (PostingView, error) {
	memo := strings.TrimSpace(in.Memo)
	if memo == "" {
		return PostingView{}, domain.Invalid("descreva o lançamento no histórico")
	}
	if in.AmountCents <= 0 {
		return PostingView{}, domain.Invalid("o valor deve ser maior que zero")
	}
	if in.Debit == in.Credit {
		return PostingView{}, domain.Invalid("as contas de débito e crédito devem ser diferentes")
	}

	accounts, err := s.accountIndex(ctx)
	if err != nil {
		return PostingView{}, err
	}
	// Dois `ok` de uma vez: as duas contas precisam existir no plano.
	if _, ok := accounts[in.Debit]; !ok {
		return PostingView{}, domain.NotFound("conta %d não existe no plano de contas", in.Debit)
	}
	if _, ok := accounts[in.Credit]; !ok {
		return PostingView{}, domain.NotFound("conta %d não existe no plano de contas", in.Credit)
	}

	kind, scene := domain.KindManual, "manual"
	switch in.Kind {
	case "capital":
		kind, scene = domain.KindCapital, "capital"
	case "expense":
		kind, scene = domain.KindExpense, "expense"
	}

	posting := s.newPosting(memo, "", 0)
	leg := domain.Leg{Kind: kind, Debit: in.Debit, Credit: in.Credit, Amount: domain.Money(in.AmountCents)}

	var entries []domain.Entry
	err = s.store.WithTx(ctx, func(r Repo) error {
		if err := r.SavePosting(ctx, posting); err != nil {
			return err
		}
		entries, err = s.ledger.Post(ctx, s.stamp([]domain.Leg{leg}, posting.ID))
		return err
	})
	if err != nil {
		return PostingView{}, err
	}
	return s.announce(ctx, scene, posting, entries)
}

// Journal é o livro diário: os lançamentos mais recentes, com o texto.
func (s *Service) Journal(ctx context.Context, limit int) ([]EntryView, error) {
	entries, err := s.ledger.Entries(ctx, limit)
	if err != nil {
		return nil, err
	}
	return s.describe(ctx, entries)
}

// describe junta os dois mundos: os NÚMEROS que vieram do TigerBeetle com os
// TEXTOS (nome das contas, histórico) que moram no Postgres.
func (s *Service) describe(ctx context.Context, entries []domain.Entry) ([]EntryView, error) {
	accounts, err := s.accountIndex(ctx)
	if err != nil {
		return nil, err
	}
	ids := make([]string, 0, len(entries))
	for _, e := range entries {
		ids = append(ids, e.PostingID)
	}
	postings, err := s.store.Postings(ctx, ids)
	if err != nil {
		return nil, err
	}
	views := make([]EntryView, 0, len(entries))
	for _, e := range entries {
		views = append(views, entryView(e, accounts, postings[e.PostingID]))
	}
	return views, nil
}
