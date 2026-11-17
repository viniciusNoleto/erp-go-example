'use client';

import { Button } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { AppPageHeader } from '@/components/layout/PageHeader';
import { UtilsIf } from '@/components/utils/If';
import { EAccountId } from '@/resources/account/enums/AccountId';
import { GET_OVERVIEW_KEY, getOverviewService } from '@/resources/overview/services/getOverview';
import { GET_PRODUCTS_KEY, getProductsService } from '@/resources/product/services/getProducts';
import { EPurchaseStatus } from '@/resources/purchase/enums/PurchaseStatus';
import { GET_PURCHASES_KEY, getPurchasesService } from '@/resources/purchase/services/getPurchases';
import { ESaleStatus } from '@/resources/sale/enums/SaleStatus';
import { GET_SALES_KEY, getSalesService } from '@/resources/sale/services/getSales';
import { OPEN_CREATE_PARAM, ROUTES } from '@/shared/constants/routes';
import { s } from '@/styles/screens';
import { moneyFull, plural } from '@/utils/format';

import { OverviewBalancesPanel, type OverviewBalanceTab } from './_components/BalancesPanel';
import { OverviewDuesPanel, overviewDues } from './_components/DuesPanel';
import { OverviewRecentEntriesPanel } from './_components/RecentEntriesPanel';
import { OverviewResultPanel } from './_components/ResultPanel';

/**
 * Visão geral. A pergunta da tela: quanto a loja tem agora, e o que pede ação?
 *  - a frase do cabeçalho responde (caixa, reserva, resultado);
 *  - o bloco maior são os saldos das quatro contas que giram o negócio, cada
 *    um uma aba do gráfico;
 *  - ao lado, o resultado e a prova de que o balancete fecha;
 *  - embaixo, o que precisa ser feito (receber, agendar, confirmar), com o
 *    botão na própria linha, e os últimos lançamentos do livro-razão.
 */
export default function OverviewPage() {
  const {
    data: overview,
    error: overviewError,
    refetch: overviewRefetch,
  } = useQuery({ queryKey: GET_OVERVIEW_KEY, queryFn: getOverviewService });
  const { data: sales } = useQuery({ queryKey: GET_SALES_KEY, queryFn: getSalesService });
  const { data: purchases } = useQuery({ queryKey: GET_PURCHASES_KEY, queryFn: getPurchasesService });
  const { data: products } = useQuery({ queryKey: GET_PRODUCTS_KEY, queryFn: getProductsService });

  const openSales = sales?.filter((sale) => sale.status === ESaleStatus.OPEN) ?? [];
  const duePurchases = purchases?.filter((purchase) => purchase.status !== EPurchaseStatus.PAID) ?? [];
  const scheduled = duePurchases.filter((purchase) => purchase.status === EPurchaseStatus.SCHEDULED);
  const cash = overview?.accounts.find((account) => account.id === EAccountId.CASH);
  const units = products?.reduce((sum, product) => sum + product.stock, 0) ?? 0;
  const dues = overviewDues({ sales, purchases });

  const tabs: OverviewBalanceTab[] = [
    {
      id: EAccountId.CASH,
      label: 'Caixa e bancos',
      note: cash && cash.reservedCents > 0 ? `${moneyFull(cash.reservedCents)} reservados` : 'Tudo disponível',
    },
    { id: EAccountId.RECEIVABLE, label: 'Clientes a receber', note: plural(openSales.length, 'venda em aberto', 'vendas em aberto') },
    { id: EAccountId.INVENTORY, label: 'Estoque', note: plural(units, 'unidade', 'unidades') },
    { id: EAccountId.PAYABLE, label: 'Fornecedores a pagar', note: plural(duePurchases.length, 'compra a pagar', 'compras a pagar') },
  ];

  return (
    <>
      <AppPageHeader
        title="Visão geral"
        actions={
          <>
            <Button
              component={Link}
              href={`${ROUTES.journal}?${OPEN_CREATE_PARAM}=1`}
              variant="default"
            >
              Novo lançamento
            </Button>

            <Button
              component={Link}
              href={`${ROUTES.sales}?${OPEN_CREATE_PARAM}=1`}
              leftSection={<IconPlus size={16} />}
            >
              Nova venda
            </Button>
          </>
        }
      >
        <UtilsIf
          cases={[
            {
              condition: !!(overview && cash),
              content: () => (
                <>
                  <strong>
                    {`${moneyFull(cash!.balanceCents)} em caixa`}
                  </strong>

                  {scheduled.length > 0 ? `, com ${moneyFull(cash!.reservedCents)} reservados para ${scheduled[0].supplier}. ` : '. '}

                  {dues.length > 0 ? `${plural(dues.length, 'pendência espera', 'pendências esperam')} uma ação. ` : ''}

                  {`Resultado de ${moneyFull(overview!.netCents)} desde a abertura.`}
                </>
              ),
            },
            {
              content: () => 'Lendo os saldos no livro-razão…',
            },
          ]}
        />
      </AppPageHeader>

      <div className={s.grid}>
        <OverviewBalancesPanel
          overview={overview}
          error={overviewError}
          retry={overviewRefetch}
          tabs={tabs}
        />

        <OverviewResultPanel overview={overview} />

        <OverviewDuesPanel
          dues={dues}
          loaded={!!(sales && purchases)}
        />

        <OverviewRecentEntriesPanel />
      </div>
    </>
  );
}
