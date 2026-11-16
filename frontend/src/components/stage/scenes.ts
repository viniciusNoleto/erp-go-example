import type { EPostingScene } from '@/resources/posting/enums/PostingScene';

/**
 * Cada tipo de lançamento tem a sua cena no palco (o cartão que aparece no
 * canto quando algo é gravado no razão): um título e um "sinal" desenhado a
 * pena ao fim do traço, como um guarda-livros marcaria o livro.
 *
 *  - double:  duplo sublinhado — na escrituração, o sinal de total fechado
 *  - ring:    o valor circulado — dinheiro que entrou
 *  - box:     o valor numa caixa — mercadoria que chegou
 *  - dashed:  traço tracejado que fica "andando" — reserva em aberto
 *  - check:   o tracejado vira traço cheio e ganha um visto
 *  - wipe:    o tracejado esmaece: a reserva se desfez
 *  - strike:  uma onda sob o valor — dinheiro consumido
 *  - rays:    três riscos abrindo — capital que entra
 *  - line:    sublinhado simples
 *
 * Sem uma cor por tipo: o traço é tinta e o sinal é o ouro da moeda. O que
 * distingue as cenas é o desenho, não um arco-íris.
 */
export type StageMark = 'double' | 'ring' | 'box' | 'dashed' | 'check' | 'wipe' | 'strike' | 'rays' | 'line';

export interface StageSceneStyle {
  title: string;
  mark: StageMark;
}

export const SCENES: Record<`${EPostingScene}` | 'refused', StageSceneStyle> = {
  sale: { title: 'Venda faturada', mark: 'double' },
  receipt: { title: 'Recebimento', mark: 'ring' },
  purchase: { title: 'Compra recebida', mark: 'box' },
  payment_scheduled: { title: 'Pagamento agendado', mark: 'dashed' },
  payment_confirmed: { title: 'Pagamento confirmado', mark: 'check' },
  payment_cancelled: { title: 'Agendamento cancelado', mark: 'wipe' },
  expense: { title: 'Despesa paga', mark: 'strike' },
  capital: { title: 'Aporte de capital', mark: 'rays' },
  manual: { title: 'Lançamento manual', mark: 'line' },
  refused: { title: 'Recusado pelo razão', mark: 'line' },
};
