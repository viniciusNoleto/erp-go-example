'use client';

import { AppShell, Burger, NavLink, ScrollArea } from '@mantine/core';
import { useDisclosure, useMounted } from '@mantine/hooks';
import { IconBook2, IconBuildingWarehouse, IconLayoutDashboard, IconListTree, IconShoppingCart, IconTag } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { BrandMark, BrandWordmark } from '@/components/brand/Brand';
import { useStage } from '@/components/stage/StageProvider';
import { UtilsFor } from '@/components/utils/For';
import { UtilsIf } from '@/components/utils/If';
import { GET_OVERVIEW_KEY, getOverviewService } from '@/resources/overview/services/getOverview';
import { EPurchaseStatus } from '@/resources/purchase/enums/PurchaseStatus';
import { GET_PURCHASES_KEY, getPurchasesService } from '@/resources/purchase/services/getPurchases';
import { ESaleStatus } from '@/resources/sale/enums/SaleStatus';
import { GET_SALES_KEY, getSalesService } from '@/resources/sale/services/getSales';
import { ROUTES } from '@/shared/constants/routes';
import { cn } from '@/utils/cn';

const ICON = { size: 18, stroke: 1.5, 'aria-hidden': true } as const;

/** A marca no menu e na barra do celular. */
const BRAND = 'flex items-center gap-2.5 text-ink no-underline';

const NAV_LINK =
  'mb-0.5 h-9 rounded-sm px-2.5 text-ink hover:bg-raised data-active:bg-active data-active:font-medium data-active:text-ink data-active:hover:bg-active';

/** A casca das telas de trabalho: o menu lateral (gaveta no celular) e a área do conteúdo. */
export function AppFrame({ children }: { children: ReactNode }) {
  const [opened, { toggle, close }] = useDisclosure(false);
  const pathname = usePathname();
  const { live } = useStage();
  // As telas vivem dos dados da API, que só existem no navegador. Renderizá-las
  // só depois de montar evita que o HTML pré-renderizado ("Carregando…")
  // divirja do primeiro render no cliente quando o cache já tem os dados.
  const mounted = useMounted();

  const { data: overview } = useQuery({ queryKey: GET_OVERVIEW_KEY, queryFn: getOverviewService });
  const { data: sales } = useQuery({ queryKey: GET_SALES_KEY, queryFn: getSalesService });
  const { data: purchases } = useQuery({ queryKey: GET_PURCHASES_KEY, queryFn: getPurchasesService });

  const toReceive = sales?.filter((sale) => sale.status === ESaleStatus.OPEN).length ?? 0;
  const toPay = purchases?.filter((purchase) => purchase.status !== EPurchaseStatus.PAID).length ?? 0;

  // No celular, escolher uma área fecha o menu.
  useEffect(close, [pathname, close]);

  const items = [
    { href: ROUTES.overview, label: 'Visão geral', icon: <IconLayoutDashboard {...ICON} /> },
    { href: ROUTES.journal, label: 'Lançamentos', icon: <IconBook2 {...ICON} /> },
    { href: ROUTES.sales, label: 'Vendas', icon: <IconTag {...ICON} />, count: toReceive > 0 ? `${toReceive} a receber` : null },
    { href: ROUTES.purchases, label: 'Compras', icon: <IconShoppingCart {...ICON} />, count: toPay > 0 ? `${toPay} a pagar` : null },
    { href: ROUTES.inventory, label: 'Estoque', icon: <IconBuildingWarehouse {...ICON} /> },
    { href: ROUTES.accounts, label: 'Plano de contas', icon: <IconListTree {...ICON} /> },
  ];

  return (
    <AppShell
      navbar={{ width: 248, breakpoint: 'md', collapsed: { mobile: !opened } }}
      // A barra de cima só existe no celular e no tablet; no desktop o menu lateral faz o papel dela.
      header={{ height: { base: 56, md: 0 } }}
      layout="alt"
      withBorder
    >
      <AppShell.Header
        className="flex items-center gap-3 bg-ground px-4"
        hiddenFrom="md"
      >
        <Burger
          opened={opened}
          onClick={toggle}
          size="sm"
          aria-label={opened ? 'Fechar o menu' : 'Abrir o menu'}
        />

        <Link
          href={ROUTES.overview}
          className={BRAND}
          aria-label="GoMoney, visão geral"
        >
          <BrandMark size={28} />

          <BrandWordmark size={22} />
        </Link>
      </AppShell.Header>

      {/* O menu fica no mesmo papel da página, separado só por um filete. */}
      <AppShell.Navbar className="bg-ground px-3 pt-5 pb-4">
        <AppShell.Section>
          <Link
            href={ROUTES.overview}
            className={cn(BRAND, 'px-2.5')}
            aria-label="GoMoney, visão geral"
          >
            <BrandMark size={34} />

            <BrandWordmark size={26} />
          </Link>

          <div className="mx-2.5 mt-4.5 mb-5 rounded-md border border-line bg-surface px-3 py-2.5 text-13 leading-[1.4] text-muted">
            <strong className="block text-14 font-semibold text-ink">
              {overview?.company ?? 'Carregando…'}
            </strong>

            Livro em reais · BRL
          </div>
        </AppShell.Section>

        <AppShell.Section
          grow
          component={ScrollArea}
          aria-label="Áreas do sistema"
        >
          <nav>
            <UtilsFor
              each={items}
              eachKey={({ item }) => item.href}
            >
              {({ item }) => {
                const active = item.href === ROUTES.overview ? pathname === item.href : pathname.startsWith(item.href);

                return (
                  <NavLink
                    component={Link}
                    href={item.href}
                    label={<span className="text-14">{item.label}</span>}
                    leftSection={item.icon}
                    rightSection={item.count && <span className="text-12 whitespace-nowrap text-muted tabular-nums">{item.count}</span>}
                    active={active}
                    aria-current={active ? 'page' : undefined}
                    className={NAV_LINK}
                  />
                );
              }}
            </UtilsFor>
          </nav>
        </AppShell.Section>

        <AppShell.Section className="px-2.5 pt-3 text-12 leading-normal text-muted">
          <div className="mb-0.5 flex items-center gap-2 text-13 text-ink">
            <span className={cn('size-1.75 rounded-full', live ? 'bg-positive' : 'bg-control')} />

            {live ? 'Razão ao vivo' : 'Reconectando ao razão…'}
          </div>

          TigerBeetle · cluster 0

          <br />

          <Link
            href={ROUTES.presentation}
            className="mt-2.5 inline-block text-muted underline decoration-control underline-offset-3 hover:text-ink"
          >
            Sobre o GoMoney
          </Link>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main className="bg-ground">
        {/* Grade a 1440px: menu 248 + (32 + conteúdo 1128 + 32) = 1440. */}
        <div className="mx-auto max-w-canvas px-8 pt-9 pb-16 max-sm:px-4 max-sm:pt-5 max-sm:pb-12">
          <UtilsIf condition={mounted}>
            {() => children}
          </UtilsIf>
        </div>
      </AppShell.Main>
    </AppShell>
  );
}
