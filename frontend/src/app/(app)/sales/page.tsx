'use client';

import { Table } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Suspense } from 'react';

import { FormButton } from '@/components/form/Button';
import { AppPageHeader } from '@/components/layout/PageHeader';
import { UtilsClip } from '@/components/utils/Clip';
import { UtilsEmpty } from '@/components/utils/Empty';
import { UtilsFail } from '@/components/utils/Fail';
import { UtilsFor } from '@/components/utils/For';
import { UtilsIf } from '@/components/utils/If';
import { UtilsMoney } from '@/components/utils/Money';
import { UtilsPanel } from '@/components/utils/Panel';
import { UtilsSkeletonRows } from '@/components/utils/SkeletonRows';
import { UtilsStatus } from '@/components/utils/Status';
import { ESaleStatus } from '@/resources/sale/enums/SaleStatus';
import { CreateSaleLogicComponent, useCreateSaleLogicData } from '@/resources/sale/logics/CreateSale';
import { ReceiveSaleLogicComponent, useReceiveSaleLogicData } from '@/resources/sale/logics/ReceiveSale';
import { GET_SALES_KEY, getSalesService } from '@/resources/sale/services/getSales';
import { OPEN_CREATE_PARAM } from '@/shared/constants/routes';
import { t } from '@/styles/table';
import { cn } from '@/utils/cn';
import { day, itemsText, moneyFull, percent, plural } from '@/utils/format';
import { useOpenFromQuery } from '@/utils/hooks';

export default function SalesPage() {
  return (
    <Suspense>
      <Sales />
    </Suspense>
  );
}

/**
 * Vendas. A pergunta: quem ainda me deve, e quanto?
 * As vendas a receber vêm primeiro; o botão "Receber" fica na própria linha.
 */
function Sales() {
  const [createSaleOpened, setCreateSaleOpened] = useOpenFromQuery(OPEN_CREATE_PARAM);

  const {
    data: salesData,
    isLoading: salesIsLoading,
    error: salesError,
    refetch: salesRefetch,
  } = useQuery({ queryKey: GET_SALES_KEY, queryFn: getSalesService });

  const createSaleLogicData = useCreateSaleLogicData({ onSuccess: () => setCreateSaleOpened(false) });
  const receiveSaleLogicData = useReceiveSaleLogicData();

  const sales = salesData ?? [];
  const openSales = sales.filter((sale) => sale.status === ESaleStatus.OPEN);
  const openTotal = openSales.reduce((sum, sale) => sum + sale.totalCents, 0);
  // A receber primeiro; dentro de cada grupo, a mais recente em cima.
  const ordered = [...openSales, ...sales.filter((sale) => sale.status !== ESaleStatus.OPEN)];

  function openCreateSale() {
    createSaleLogicData.createSaleReset();
    setCreateSaleOpened(true);
  }

  return (
    <>
      <AppPageHeader
        title="Vendas"
        actions={
          <FormButton
            leftIcon={<IconPlus size={16} />}
            onClick={openCreateSale}
          >
            Nova venda
          </FormButton>
        }
      >
        <UtilsIf
          cases={[
            {
              condition: !!salesData && openSales.length > 0,
              content: () => (
                <>
                  <strong>
                    {`${moneyFull(openTotal)} a receber`}
                  </strong>

                  {` em ${plural(openSales.length, 'venda', 'vendas')}. Receber leva o valor de clientes a receber para o caixa.`}
                </>
              ),
            },
            {
              condition: !!salesData,
              content: () => `Todas as ${plural(sales.length, 'venda foi recebida', 'vendas foram recebidas')}.`,
            },
            {
              content: () => 'Carregando as vendas…',
            },
          ]}
        />
      </AppPageHeader>

      <UtilsPanel
        title="Vendas faturadas"
        meta={salesData ? plural(sales.length, 'venda', 'vendas') : null}
        flush
      >
        <UtilsIf
          cases={[
            {
              condition: !!salesError,
              content: () => (
                <UtilsFail
                  error={salesError}
                  retry={salesRefetch}
                />
              ),
            },
            {
              content: () => (
                <Table
                  stickyHeader
                  layout="fixed"
                >
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th
                        w={64}
                        className={t.num}
                        visibleFrom="sm"
                      >
                        Nº
                      </Table.Th>

                      <Table.Th>
                        Cliente
                      </Table.Th>

                      <Table.Th
                        w={104}
                        className={t.num}
                        visibleFrom="sm"
                      >
                        Data
                      </Table.Th>

                      <Table.Th
                        w={96}
                        className={t.num}
                        visibleFrom="md"
                      >
                        Margem
                      </Table.Th>

                      <Table.Th className={cn(t.num, t.colMoney)}>
                        Total
                      </Table.Th>

                      <Table.Th
                        w={132}
                        visibleFrom="sm"
                      >
                        Situação
                      </Table.Th>

                      <Table.Th className={t.colAct}>
                        <span className="sr-only">
                          Ação
                        </span>
                      </Table.Th>
                    </Table.Tr>
                  </Table.Thead>

                  <Table.Tbody>
                    <UtilsIf condition={salesIsLoading}>
                      {() => <UtilsSkeletonRows />}
                    </UtilsIf>

                    <UtilsFor
                      each={ordered}
                      eachKey={({ item }) => item.id}
                    >
                      {({ item: sale }) => (
                        <Table.Tr>
                          <Table.Td
                            className={t.num}
                            visibleFrom="sm"
                            c="dimmed"
                          >
                            {sale.id}
                          </Table.Td>

                          <Table.Td className={t.clip}>
                            <UtilsClip className={t.ident}>
                              {sale.customer}
                            </UtilsClip>

                            <UtilsClip className={t.sub}>
                              <span className={t.desk}>
                                {itemsText(sale.items)}
                              </span>

                              <span className={t.mob}>
                                {`${sale.status === ESaleStatus.OPEN ? 'A receber' : 'Recebida'} · nº ${sale.id} · ${day(sale.createdAt)}`}
                              </span>
                            </UtilsClip>
                          </Table.Td>

                          <Table.Td
                            className={t.num}
                            visibleFrom="sm"
                          >
                            {day(sale.createdAt)}
                          </Table.Td>

                          <Table.Td
                            className={t.num}
                            visibleFrom="md"
                          >
                            {sale.totalCents > 0 ? percent((sale.totalCents - sale.costCents) / sale.totalCents) : '—'}
                          </Table.Td>

                          <Table.Td className={t.num}>
                            <UtilsMoney cents={sale.totalCents} />
                          </Table.Td>

                          <Table.Td visibleFrom="sm">
                            <UtilsStatus tone={sale.status === ESaleStatus.OPEN ? 'wait' : 'ok'}>
                              {sale.status === ESaleStatus.OPEN ? 'A receber' : 'Recebida'}
                            </UtilsStatus>
                          </Table.Td>

                          <Table.Td>
                            <UtilsIf condition={sale.status === ESaleStatus.OPEN}>
                              {() => (
                                <ReceiveSaleLogicComponent
                                  logicData={receiveSaleLogicData}
                                  saleId={sale.id}
                                />
                              )}
                            </UtilsIf>
                          </Table.Td>
                        </Table.Tr>
                      )}
                    </UtilsFor>
                  </Table.Tbody>
                </Table>
              ),
            },
          ]}
        />

        <UtilsIf condition={salesData && sales.length === 0}>
          {() => (
            <UtilsEmpty>
              Nenhuma venda ainda. A primeira aparece aqui assim que for faturada.
            </UtilsEmpty>
          )}
        </UtilsIf>
      </UtilsPanel>

      <CreateSaleLogicComponent
        logicData={createSaleLogicData}
        opened={createSaleOpened}
        onClose={() => setCreateSaleOpened(false)}
      />
    </>
  );
}
