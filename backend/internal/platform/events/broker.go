// Package events é um mini pub/sub em memória. É aqui que aparecem as duas
// ferramentas de concorrência mais famosas do Go: GOROUTINES e CHANNELS.
//
// Cada requisição HTTP em Go já roda na sua própria goroutine (uma "thread"
// leve, gerenciada pelo runtime — dá para ter centenas de milhares). Então
// uma aba com o SSE aberto é uma goroutine parada esperando eventos, e o POST
// que cria uma venda é outra goroutine que publica. O Broker é a ponte.
package events

import "sync"

// Broker distribui eventos do tipo T para todos os inscritos.
//
// `[T any]` é um GENERIC, igual a <T> no TypeScript: o mesmo Broker serve para
// qualquer tipo de evento sem perder a tipagem.
type Broker[T any] struct {
	// Várias goroutines mexem em `subscribers` ao mesmo tempo (uma aba abre,
	// outra fecha, um POST publica). Um map NÃO é seguro para isso; o Mutex
	// garante que só uma goroutine por vez entra na seção crítica.
	mu          sync.Mutex
	subscribers map[chan T]struct{} // um "Set" de canais (struct{} não ocupa memória)
}

func NewBroker[T any]() *Broker[T] {
	return &Broker[T]{subscribers: make(map[chan T]struct{})}
}

// Subscribe devolve um canal por onde chegarão os eventos e uma função para
// cancelar a inscrição (o mesmo formato do retorno de um useEffect).
//
// Um canal (chan T) é uma fila tipada entre goroutines: uma escreve com
// `ch <- valor`, outra lê com `valor := <-ch`.
func (b *Broker[T]) Subscribe() (events <-chan T, cancel func()) {
	// Canal com buffer de 16: o publicador não trava se o ouvinte estiver
	// momentaneamente ocupado.
	ch := make(chan T, 16)

	b.mu.Lock()
	b.subscribers[ch] = struct{}{}
	b.mu.Unlock()

	cancel = func() {
		b.mu.Lock()
		// `defer` agenda a chamada para quando a função terminar, aconteça o
		// que acontecer. É o `finally` do Go — ideal para soltar travas.
		defer b.mu.Unlock()
		if _, ok := b.subscribers[ch]; ok {
			delete(b.subscribers, ch)
			close(ch) // fechar o canal avisa o leitor de que acabou
		}
	}
	// `<-chan T` no retorno = canal SOMENTE LEITURA para quem recebe.
	return ch, cancel
}

// Publish entrega o evento a todos os inscritos.
func (b *Broker[T]) Publish(event T) {
	b.mu.Lock()
	defer b.mu.Unlock()
	for ch := range b.subscribers {
		// `select` com `default` = tentativa NÃO BLOQUEANTE de envio: se o
		// buffer deste ouvinte estiver cheio (aba lenta), o evento é
		// descartado para ele em vez de travar todos os outros.
		select {
		case ch <- event:
		default:
		}
	}
}
