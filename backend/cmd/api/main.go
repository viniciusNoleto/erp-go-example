// O pacote `main` com a função `main` é o ponto de entrada do programa — e,
// nesta arquitetura, a "composition root": o ÚNICO lugar que conhece todas as
// peças concretas (Postgres, TigerBeetle, HTTP) e as encaixa umas nas outras.
//
//	          ┌──────────────── cmd/api/main.go ────────────────┐
//	          │  cria e conecta tudo                             │
//	          └──────────────────────────────────────────────────┘
//	HTTP ──▶ adapters/httpapi ──▶ app (casos de uso) ──▶ domain (regras)
//	                                 │        │
//	                    adapters/postgres   adapters/tigerbeetle
//
// As setas de dependência apontam sempre PARA DENTRO: domain não conhece
// ninguém; app conhece só domain; os adapters conhecem app e domain.
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"
	// Import "em branco" (com _): não usamos nada do pacote diretamente; ele
	// só precisa ser carregado. Este embute a base de fusos horários no
	// binário, para TZ=America/Sao_Paulo funcionar numa imagem mínima.
	_ "time/tzdata"

	"razonete/internal/adapters/httpapi"
	"razonete/internal/adapters/postgres"
	"razonete/internal/adapters/tigerbeetle"
	"razonete/internal/app"
	"razonete/internal/platform/events"
)

func main() {
	// slog é o logger estruturado da biblioteca padrão: cada linha é um JSON
	// com chaves e valores, pronto para Datadog/Loki/CloudWatch.
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	// main só chama run e decide o código de saída. Assim os `defer` de run
	// executam antes do os.Exit (que encerra o processo sem rodar defers).
	if err := run(log); err != nil {
		log.Error("encerrando com erro", "err", err)
		os.Exit(1)
	}
}

func run(log *slog.Logger) error {
	// Este contexto é cancelado quando o processo recebe Ctrl+C ou o SIGTERM
	// que o Docker/Kubernetes envia para parar o container.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// Configuração por variáveis de ambiente (o mesmo espírito do .env).
	var (
		httpAddr    = env("HTTP_ADDR", ":8080")
		databaseURL = env("DATABASE_URL", "postgres://razonete:razonete@localhost:5433/razonete")
		tbAddresses = strings.Split(env("TB_ADDRESSES", "3000"), ",")
		company     = env("COMPANY_NAME", "Ateliê Pipa Materiais Artísticos")
	)
	clusterID, err := strconv.ParseUint(env("TB_CLUSTER_ID", "0"), 10, 64)
	if err != nil {
		return err
	}

	// 1) Postgres. No `docker compose up` a API pode subir antes do banco
	//    aceitar conexões, então tentamos algumas vezes.
	store, err := connectWithRetry(ctx, log, databaseURL)
	if err != nil {
		return err
	}
	defer store.Close()

	// 2) TigerBeetle.
	ledger, err := tigerbeetle.Connect(clusterID, tbAddresses)
	if err != nil {
		return err
	}
	defer ledger.Close()

	// 3) O miolo: broker de eventos e casos de uso, recebendo as dependências.
	broker := events.NewBroker[app.PostingView]()
	service := app.NewService(ledger, store, broker, company)

	if err := service.SeedDemo(ctx); err != nil {
		return err
	}

	// 4) HTTP.
	server := &http.Server{
		Addr:    httpAddr,
		Handler: httpapi.NewServer(service, broker, log).Routes(),
		// Tempo máximo para o cliente enviar os cabeçalhos: protege contra
		// conexões abertas de propósito para esgotar o servidor (slowloris).
		ReadHeaderTimeout: 5 * time.Second,
	}

	// ListenAndServe BLOQUEIA enquanto o servidor estiver no ar. Rodamos em
	// outra goroutine (`go func`) para que a função principal possa ficar
	// esperando o sinal de parada. O canal traz de volta o erro, se houver.
	failed := make(chan error, 1)
	go func() {
		log.Info("API no ar", "addr", httpAddr)
		failed <- server.ListenAndServe()
	}()

	select {
	case err := <-failed:
		return err
	case <-ctx.Done():
		// GRACEFUL SHUTDOWN: para de aceitar conexões novas e dá até 10 s
		// para as requisições em andamento terminarem. Num sistema que move
		// dinheiro, matar o processo no meio de um lançamento não é opção.
		log.Info("sinal recebido, encerrando")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := server.Shutdown(shutdownCtx); err != nil && !errors.Is(err, http.ErrServerClosed) {
			return err
		}
		return nil
	}
}

func connectWithRetry(ctx context.Context, log *slog.Logger, url string) (*postgres.Store, error) {
	var lastErr error
	for attempt := 1; attempt <= 30; attempt++ {
		store, err := postgres.Open(ctx, url)
		if err == nil {
			return store, nil
		}
		lastErr = err
		log.Info("aguardando o Postgres", "tentativa", attempt)
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(time.Second):
		}
	}
	return nil, lastErr
}

// env lê uma variável de ambiente com valor padrão.
func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
