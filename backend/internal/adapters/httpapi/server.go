// Package httpapi é o ADAPTER de entrada: recebe HTTP, chama um caso de uso e
// devolve JSON. Nenhuma regra de negócio mora aqui — se você se pegar
// escrevendo um `if` sobre estoque ou saldo neste pacote, ele está no lugar
// errado. (O equivalente a manter Controllers magros no Laravel.)
//
// Usamos só a biblioteca padrão (net/http). Desde o Go 1.22 o roteador padrão
// entende método e parâmetros ("POST /api/sales/{id}/receive"), então para uma
// API deste tamanho não é preciso framework.
package httpapi

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"gomoney/internal/app"
	"gomoney/internal/domain"
	"gomoney/internal/platform/events"
)

type Server struct {
	svc    *app.Service
	broker *events.Broker[app.PostingView]
	log    *slog.Logger
}

func NewServer(svc *app.Service, broker *events.Broker[app.PostingView], log *slog.Logger) *Server {
	return &Server{svc: svc, broker: broker, log: log}
}

// Routes monta a tabela de rotas e devolve um http.Handler.
//
// http.Handler é a interface central do pacote: "algo que sabe responder a
// uma requisição". Roteador, middleware e handler final são todos Handlers,
// o que permite empilhá-los como bonecas russas (veja `logged` no fim).
func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	// Leituras. Cada handler é um closure curto: chama o caso de uso com o
	// contexto da requisição e passa o par (resultado, erro) para `reply`.
	mux.HandleFunc("GET /api/overview", func(w http.ResponseWriter, r *http.Request) {
		view, err := s.svc.Overview(r.Context())
		s.reply(w, r, http.StatusOK, view, err)
	})
	mux.HandleFunc("GET /api/accounts", func(w http.ResponseWriter, r *http.Request) {
		view, err := s.svc.Accounts(r.Context())
		s.reply(w, r, http.StatusOK, view, err)
	})
	mux.HandleFunc("GET /api/accounts/{id}", func(w http.ResponseWriter, r *http.Request) {
		id, ok := s.pathID(w, r)
		if !ok {
			return
		}
		view, err := s.svc.AccountDetail(r.Context(), domain.AccountID(id))
		s.reply(w, r, http.StatusOK, view, err)
	})
	mux.HandleFunc("GET /api/journal", func(w http.ResponseWriter, r *http.Request) {
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		if limit <= 0 || limit > 500 {
			limit = 200
		}
		view, err := s.svc.Journal(r.Context(), limit)
		s.reply(w, r, http.StatusOK, view, err)
	})
	mux.HandleFunc("GET /api/products", func(w http.ResponseWriter, r *http.Request) {
		view, err := s.svc.Products(r.Context())
		s.reply(w, r, http.StatusOK, view, err)
	})
	mux.HandleFunc("GET /api/sales", func(w http.ResponseWriter, r *http.Request) {
		view, err := s.svc.Sales(r.Context())
		s.reply(w, r, http.StatusOK, view, err)
	})
	mux.HandleFunc("GET /api/purchases", func(w http.ResponseWriter, r *http.Request) {
		view, err := s.svc.Purchases(r.Context())
		s.reply(w, r, http.StatusOK, view, err)
	})

	// Escritas com corpo JSON.
	mux.HandleFunc("POST /api/accounts", func(w http.ResponseWriter, r *http.Request) {
		var in app.AccountInput
		if !s.decode(w, r, &in) {
			return
		}
		view, err := s.svc.CreateAccount(r.Context(), in)
		s.reply(w, r, http.StatusCreated, view, err)
	})
	mux.HandleFunc("POST /api/products", func(w http.ResponseWriter, r *http.Request) {
		var in app.ProductInput
		if !s.decode(w, r, &in) {
			return
		}
		view, err := s.svc.CreateProduct(r.Context(), in)
		s.reply(w, r, http.StatusCreated, view, err)
	})
	mux.HandleFunc("POST /api/journal", func(w http.ResponseWriter, r *http.Request) {
		var in app.EntryInput
		if !s.decode(w, r, &in) {
			return
		}
		view, err := s.svc.CreateEntry(r.Context(), in)
		s.reply(w, r, http.StatusCreated, view, err)
	})
	mux.HandleFunc("POST /api/sales", func(w http.ResponseWriter, r *http.Request) {
		var in app.SaleInput
		if !s.decode(w, r, &in) {
			return
		}
		view, err := s.svc.CreateSale(r.Context(), in)
		s.reply(w, r, http.StatusCreated, view, err)
	})
	mux.HandleFunc("POST /api/purchases", func(w http.ResponseWriter, r *http.Request) {
		var in app.PurchaseInput
		if !s.decode(w, r, &in) {
			return
		}
		view, err := s.svc.CreatePurchase(r.Context(), in)
		s.reply(w, r, http.StatusCreated, view, err)
	})

	// Ações sobre um documento existente.
	mux.HandleFunc("POST /api/sales/{id}/receive", func(w http.ResponseWriter, r *http.Request) {
		id, ok := s.pathID(w, r)
		if !ok {
			return
		}
		view, err := s.svc.ReceiveSale(r.Context(), id)
		s.reply(w, r, http.StatusOK, view, err)
	})
	// As três ações de pagamento têm o mesmo formato; em vez de três blocos
	// iguais, um map de "nome da ação -> método do serviço". s.svc.SchedulePayment
	// sem parênteses é o método como VALOR (um method value).
	payments := map[string]func(ctx contextLike, id int64) (app.PurchaseResult, error){
		"schedule-payment": s.svc.SchedulePayment,
		"confirm-payment":  s.svc.ConfirmPayment,
		"cancel-payment":   s.svc.CancelPayment,
	}
	for action, run := range payments {
		mux.HandleFunc("POST /api/purchases/{id}/"+action, func(w http.ResponseWriter, r *http.Request) {
			id, ok := s.pathID(w, r)
			if !ok {
				return
			}
			view, err := run(r.Context(), id)
			s.reply(w, r, http.StatusOK, view, err)
		})
	}

	mux.HandleFunc("GET /api/events", s.stream)

	return s.logged(mux)
}

// reply é o ponto único de saída: escreve o JSON de sucesso ou traduz o erro.
func (s *Server) reply(w http.ResponseWriter, r *http.Request, status int, body any, err error) {
	if err == nil {
		writeJSON(w, status, body)
		return
	}

	// Erro de negócio? Vira um 4xx com código e mensagem que o front entende.
	var derr *domain.Error
	if errors.As(err, &derr) {
		writeJSON(w, statusFor(derr.Code), errorBody{Error: errorDetail{Code: string(derr.Code), Message: derr.Message}})
		return
	}

	// Qualquer outra coisa é falha NOSSA: registra o detalhe no log e devolve
	// uma mensagem genérica (nunca vazar erro interno para o cliente).
	s.log.Error("falha interna", "method", r.Method, "path", r.URL.Path, "err", err)
	writeJSON(w, http.StatusInternalServerError, errorBody{Error: errorDetail{Code: "internal", Message: "Algo deu errado do nosso lado. Tente de novo."}})
}

type errorBody struct {
	Error errorDetail `json:"error"`
}

type errorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func statusFor(code domain.Code) int {
	switch code {
	case domain.CodeNotFound:
		return http.StatusNotFound // 404
	case domain.CodeConflict:
		return http.StatusConflict // 409
	case domain.CodeInvalid:
		return http.StatusBadRequest // 400
	}
	return http.StatusUnprocessableEntity // 422: entendi o pedido, mas a regra não deixa
}

// decode lê o corpo JSON para dentro de `into` (um ponteiro para struct).
// Devolve false se já respondeu com erro.
func (s *Server) decode(w http.ResponseWriter, r *http.Request, into any) bool {
	// Limita o corpo a 1 MB: ninguém derruba a API mandando um arquivo gigante.
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	if err := json.NewDecoder(r.Body).Decode(into); err != nil {
		writeJSON(w, http.StatusBadRequest, errorBody{Error: errorDetail{Code: "invalid", Message: "Corpo da requisição não é um JSON válido."}})
		return false
	}
	return true
}

// pathID lê o {id} da rota como inteiro.
func (s *Server) pathID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || id <= 0 {
		writeJSON(w, http.StatusBadRequest, errorBody{Error: errorDetail{Code: "invalid", Message: "Identificador inválido."}})
		return 0, false
	}
	return id, true
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(body)
}

// logged é um MIDDLEWARE: recebe um Handler e devolve outro que faz algo antes
// e depois de chamar o original. Aqui: mede o tempo e escreve uma linha de log.
func (s *Server) logged(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)
		if r.URL.Path != "/api/events" { // o SSE fica aberto por horas; não polui o log
			s.log.Info("http", "method", r.Method, "path", r.URL.Path, "status", rec.status, "ms", time.Since(start).Milliseconds())
		}
	})
}

// statusRecorder embrulha o ResponseWriter só para lembrar o status enviado.
// Mais um uso de embedding: herda todos os métodos e sobrescreve um.
type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

// Unwrap deixa o http.ResponseController alcançar o writer original (o SSE
// precisa dele para dar Flush).
func (r *statusRecorder) Unwrap() http.ResponseWriter { return r.ResponseWriter }
