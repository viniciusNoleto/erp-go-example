'use client';

import { IconArrowRight } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, type CSSProperties, type ReactNode } from 'react';

import { BrandMark, BrandWordmark } from '@/components/brand/Brand';
import { UtilsFor } from '@/components/utils/For';
import { GET_OVERVIEW_KEY, getOverviewService } from '@/resources/overview/services/getOverview';
import { ROUTES } from '@/shared/constants/routes';
import { cn } from '@/utils/cn';
import { plural } from '@/utils/format';

import { Backdrop } from './Backdrop';
import { presentationClasses as c } from './classes';
import { startLenses } from './glass';
import { LiveLedger } from './LiveLedger';
import { Store } from './Store';

/** As operações do ERP e as partidas que cada uma grava no livro-razão. */
const OPERATIONS: { where: string; what: string; legs: ReactNode[] }[] = [
  {
    where: 'Vendas',
    what: 'Faturar uma venda',
    legs: [
      'D Clientes a receber · C Receita de vendas',
      <>
        {'D Custo das mercadorias · C Estoque '}

        <em>
          — encadeadas: as duas ou nenhuma
        </em>
      </>,
    ],
  },
  { where: 'Vendas', what: 'Receber do cliente', legs: ['D Caixa e bancos · C Clientes a receber'] },
  { where: 'Compras', what: 'Dar entrada na mercadoria', legs: ['D Estoque · C Fornecedores a pagar, e o custo médio é recalculado'] },
  {
    where: 'Compras',
    what: 'Agendar e confirmar o pagamento',
    legs: [
      <>
        <em>
          Reserva
        </em>

        {' no caixa (primeira fase), depois efetiva ou cancela (segunda fase)'}
      </>,
    ],
  },
  { where: 'Lançamentos', what: 'Despesa, aporte ou manual', legs: ['Uma partida entre duas contas que você escolhe'] },
];

/** O passo da entrada escalonada (animate-rise): 80ms por passo. */
const step = (i: number) => ({ '--i': i }) as CSSProperties;

/**
 * A página de apresentação do GoMoney: o que é, como funciona por dentro e o
 * livro-razão da loja de demonstração ao vivo. É a única página com vidro líquido.
 */
export function Presentation() {
  const { data: overview } = useQuery({ queryKey: GET_OVERVIEW_KEY, queryFn: getOverviewService });

  // Liga a lente de vidro líquido nas superfícies .glass (só no Chromium).
  useEffect(() => startLenses(), []);

  return (
    <>
      <Backdrop />

      {/* Tinta clara sobre a gravação escura. Coluna de 1200px no centro, margens de 32px (16px no celular). */}
      <div className="relative z-1 min-h-dvh text-16 leading-[1.55] text-night-ink">
        <div className="mx-auto max-w-wrap px-8 max-sm:px-4">
          <header
            className="glass mt-5 flex items-center justify-between gap-4 py-2.5 pr-2.5 pl-4.5 motion-safe:animate-rise"
            data-lens="pill"
          >
            <Link
              href={ROUTES.presentation}
              className="flex items-center gap-2.5 text-night-ink"
              aria-label="GoMoney, início"
            >
              <BrandMark
                size={34}
                tone="ivory"
              />

              <BrandWordmark size={26} />
            </Link>

            <nav
              className="flex items-center gap-1"
              aria-label="Seções"
            >
              <a
                href="#how-it-works"
                className={c.navLink}
              >
                Como funciona
              </a>

              <a
                href="#architecture"
                className={c.navLink}
              >
                Arquitetura
              </a>

              <Link
                href={ROUTES.overview}
                className={c.cta}
              >
                Abrir o sistema
              </Link>
            </nav>
          </header>

          <main>
            <section className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] items-center gap-12 pt-24 pb-30 max-md:grid-cols-1 max-md:pt-16 max-md:pb-24">
              <div>
                <h1 className="font-serif text-[clamp(72px,10vw,152px)] leading-[0.9] font-normal tracking-[-0.03em] motion-safe:animate-rise">
                  GoMoney
                </h1>

                <p
                  className="mt-7 max-w-[30ch] text-24 leading-[1.4] max-sm:text-20 motion-safe:animate-rise"
                  style={step(1)}
                >
                  O ERP da pequena loja, com cada centavo num livro-razão de partidas dobradas.
                </p>

                <div
                  className="mt-10 flex flex-wrap items-center gap-5 motion-safe:animate-rise"
                  style={step(2)}
                >
                  <Link
                    href={ROUTES.overview}
                    className={c.cta}
                  >
                    Abrir o sistema

                    <IconArrowRight
                      size={18}
                      stroke={1.8}
                    />
                  </Link>

                  <a
                    href="#how-it-works"
                    className={cn(c.focus, 'text-15 text-night-soft underline decoration-white/30 underline-offset-4 hover:text-night-ink')}
                  >
                    Como as partidas são gravadas
                  </a>
                </div>
              </div>

              <LiveLedger style={step(3)} />
            </section>

            <section
              id="how-it-works"
              className={c.section}
            >
              <h2 className={c.h2}>
                Cada operação, duas partidas
              </h2>

              <p className={c.intro}>
                Toda tela do GoMoney que mexe com dinheiro grava partidas no TigerBeetle: um débito e um crédito de mesmo valor. O saldo de cada conta é a soma
                delas, e o balancete fecha sempre, porque o próprio banco recusa o que não fecha.
              </p>

              <div className="glass px-8 py-2 max-sm:px-5 max-sm:py-1">
                <UtilsFor
                  each={OPERATIONS}
                  eachKey={({ item }) => item.what}
                >
                  {({ item: operation }) => (
                    <div className="grid grid-cols-[160px_minmax(0,1fr)_minmax(0,1.4fr)] gap-6 border-t border-white/12 py-5 first:border-t-0 max-md:grid-cols-1 max-md:gap-1">
                      <span className="text-15 text-night-soft">
                        {operation.where}
                      </span>

                      <span className="text-18 font-medium">
                        {operation.what}
                      </span>

                      <span className="text-15 text-night-soft *:block [&_em]:text-night-gold [&_em]:not-italic">
                        <UtilsFor each={operation.legs}>
                          {({ item: leg }) => (
                            <span>
                              {leg}
                            </span>
                          )}
                        </UtilsFor>
                      </span>
                    </div>
                  )}
                </UtilsFor>
              </div>
            </section>

            <section
              id="architecture"
              className={c.section}
            >
              <h2 className={c.h2}>
                O texto num banco, os números no outro
              </h2>

              <p className={c.intro}>
                Cadastros e históricos ficam no Postgres. Contas, lançamentos e saldos ficam no TigerBeetle, um banco feito só para contabilidade: partidas
                imutáveis, travas de saldo e pagamentos em duas fases.
              </p>

              <div className="grid grid-cols-2 gap-6 max-md:grid-cols-1">
                <Store
                  name="Postgres"
                  role="guarda o texto"
                  items={['Produtos, preços e custo médio', 'Vendas, compras e os seus itens', 'Nomes das contas e históricos']}
                />

                <Store
                  name="TigerBeetle"
                  role="guarda os números"
                  items={['Contas, partidas e saldos', 'Caixa que não pode ficar negativo', 'Reserva de pagamento em duas fases']}
                />
              </div>

              <div className="glass mt-6 flex items-center gap-6 px-8 py-6 text-17 text-night-soft max-sm:flex-col max-sm:items-start max-sm:px-5 max-sm:py-5.5">
                <BrandMark
                  size={56}
                  tone="ivory"
                />

                <span>
                  <strong className="font-medium text-night-ink">
                    No meio, um serviço em Go
                  </strong>

                  {' com a biblioteca padrão para HTTP, arquitetura hexagonal e Server-Sent Events: quando alguém lança, todas as telas abertas veem o lançamento acontecer.'}
                </span>
              </div>
            </section>
          </main>

          <footer className="pb-12">
            <div className="flex items-center gap-5 font-serif text-[clamp(64px,12vw,176px)] leading-[0.9] tracking-[-0.03em]">
              <BrandMark
                size={120}
                tone="ivory"
              />

              GoMoney
            </div>

            <div className="mt-8 flex flex-wrap justify-between gap-x-8 gap-y-4 border-t border-white/14 pt-5 text-14 text-night-soft">
              <span>
                {`ERP de demonstração. ${overview ? `${overview.company}: ${plural(overview.accounts.length, 'conta', 'contas')} no livro-razão.` : ''}`}
              </span>

              <span>
                {'A marmota do Go é criação de Renée French ('}

                <a
                  href="https://creativecommons.org/licenses/by/4.0/deed.pt-br"
                  rel="license noreferrer"
                  target="_blank"
                  className={cn(c.focus, 'text-night-ink underline')}
                >
                  CC BY 4.0
                </a>

                {'); a marca do GoMoney é uma versão estilizada dela.'}
              </span>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
