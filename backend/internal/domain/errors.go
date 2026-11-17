package domain

import "fmt"

// Em Go, erro não é exceção: é um VALOR que a função devolve.
//
//	sale, err := NewSale(...)
//	if err != nil { return err }
//
// Não existe try/catch. Quem chama é obrigado a olhar para o erro (ou a
// ignorá-lo de propósito). Parece verboso no começo, mas torna o caminho de
// falha tão visível quanto o caminho feliz — ótimo para código financeiro.
//
// `error` é só uma interface com um método: Error() string. Qualquer tipo que
// tenha esse método É um erro.

// Code classifica um erro de negócio. O adapter HTTP usa o código para escolher
// o status (422, 404, 409...) e o front-end usa para escolher a animação.
type Code string

const (
	CodeInvalid           Code = "invalid"            // dados de entrada ruins
	CodeNotFound          Code = "not_found"          // registro não existe
	CodeConflict          Code = "conflict"           // estado não permite a ação
	CodeInsufficientFunds Code = "insufficient_funds" // o livro-razão recusou: saldo insuficiente
	CodeInsufficientStock Code = "insufficient_stock" // não há unidades em estoque
)

// Error é o erro de negócio do domínio. Carrega um código (para máquinas) e
// uma mensagem em português (para gente).
type Error struct {
	Code    Code
	Message string
}

// Error implementa a interface `error`. O receiver é um ponteiro (*Error)
// porque erros costumam ser passados por referência e comparados com errors.As.
func (e *Error) Error() string { return e.Message }

// Os construtores abaixo são só açúcar para criar erros com o código certo.
// O `args ...any` é um parâmetro variádico (igual ao ...args do JS).

func Invalid(format string, args ...any) error {
	return &Error{Code: CodeInvalid, Message: fmt.Sprintf(format, args...)}
}

func NotFound(format string, args ...any) error {
	return &Error{Code: CodeNotFound, Message: fmt.Sprintf(format, args...)}
}

func Conflict(format string, args ...any) error {
	return &Error{Code: CodeConflict, Message: fmt.Sprintf(format, args...)}
}

func InsufficientFunds(format string, args ...any) error {
	return &Error{Code: CodeInsufficientFunds, Message: fmt.Sprintf(format, args...)}
}

func InsufficientStock(format string, args ...any) error {
	return &Error{Code: CodeInsufficientStock, Message: fmt.Sprintf(format, args...)}
}
