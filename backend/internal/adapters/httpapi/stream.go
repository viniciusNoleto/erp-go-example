package httpapi

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// contextLike é só um apelido para deixar a assinatura do map de pagamentos
// (em server.go) mais curta. `type A = B` é um ALIAS: A e B são o mesmo tipo.
type contextLike = context.Context

// stream é o endpoint de Server-Sent Events: uma resposta HTTP que nunca
// termina, por onde o servidor empurra cada lançamento novo para o navegador
// (que escuta com `new EventSource("/api/events")`).
//
// Repare que NÃO criamos goroutine aqui: o servidor HTTP já roda cada
// requisição na sua. Este handler simplesmente fica parado no `select` até
// chegar um evento ou o cliente desconectar.
func (s *Server) stream(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("X-Accel-Buffering", "no") // pede ao nginx para não segurar a resposta
	flusher := http.NewResponseController(w)

	events, cancel := s.broker.Subscribe()
	defer cancel() // ao sair (aba fechada), cancela a inscrição

	fmt.Fprint(w, ": conectado\n\n")
	flusher.Flush()

	// Um "ping" periódico mantém proxies e balanceadores de carga acordados.
	ping := time.NewTicker(25 * time.Second)
	defer ping.Stop()

	for {
		// `select` espera em vários canais ao mesmo tempo e executa o
		// primeiro que tiver algo. É o Promise.race do Go — só que em loop.
		select {
		case <-r.Context().Done():
			// O contexto da requisição é cancelado quando o cliente desconecta.
			return
		case <-ping.C:
			fmt.Fprint(w, ": ping\n\n")
		case event := <-events:
			payload, err := json.Marshal(event)
			if err != nil {
				continue
			}
			// Formato do SSE: linhas "campo: valor" e uma linha em branco.
			fmt.Fprintf(w, "event: posting\ndata: %s\n\n", payload)
		}
		// Sem Flush os bytes ficariam no buffer e o navegador não veria nada.
		flusher.Flush()
	}
}
