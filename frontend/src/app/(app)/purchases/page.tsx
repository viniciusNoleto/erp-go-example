'use client';

import { Group, Table } from '@mantine/core';
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
import { UtilsStatus, type StatusTone } from '@/components/utils/Status';
import { EPurchaseStatus } from '@/resources/purchase/enums/PurchaseStatus';
import { CancelPurchasePaymentLogicComponent, useCancelPurchasePaymentLogicData } from '@/resources/purchase/logics/CancelPurchasePayment';
import { ConfirmPurchasePaymentLogicComponent, useConfirmPurchasePaymentLogicData } from '@/resources/purchase/logics/ConfirmPurchasePayment';
import { CreatePurchaseLogicComponent, useCreatePurchaseLogicData } from '@/resources/purchase/logics/CreatePurchase';
import { SchedulePurchasePaymentLogicComponent, useSchedulePurchasePaymentLogicData } from '@/resources/purchase/logics/SchedulePurchasePayment';
import { GET_PURCHASES_KEY, getPurchasesService } from '@/resources/purchase/services/getPurchases';
import { OPEN_CREATE_PARAM } from '@/shared/constants/routes';
import { t } from '@/styles/table';
import { cn } from '@/utils/cn';
import { day, itemsText, moneyFull, plural } from '@/utils/format';
import { useOpenFromQuery } from '@/utils/hooks';

import { PurchasesCashStrip } from './_components/CashStrip';

const STATUS: Record<EPurchaseStatus, { tone: StatusTone; label: string }> = {
  [EPurchaseStatus.OPEN]: { tone: 'wait', label: 'A pagar' },
  [EPurchaseStatus.SCHEDULED]: { tone: 'wait', label: 'Pagamento reservado' },
  [EPurchaseStatus.PAID]: { tone: 'ok', label: 'Paga' },
};

/** Reservadas primeiro (pedem confirmação), depois a pagar, depois pagas. */
const RANK: Record<EPurchaseStatus, number> = {
  [EPurchaseStatus.SCHEDULED]: 0,
  [EPurchaseStatus.OPEN]: 1,
  [EPurchaseStatus.PAID]: 2,
};

export default function PurchasesPage() {
  return (
    <Suspense>
      <Purchases />
    </Suspense>
  );
}

/**
 * Compras. A pergunta: o que devo aos fornecedores, e o que já está reservado?
 * O pagamento é em duas fases no TigerBeetle: agendar reserva o valor no
 * caixa; confirmar efetiva, cancelar libera.
 */
function Purchases() {
  const [createPurchaseOpened, setCreatePurchaseOpened] = useOpenFromQuery(OPEN_CREATE_PARAM);

  const {
    data: purchasesData,
    isLoading: purchasesIsLoading,
    error: purchasesError,
    refetch: purchasesRefetch,
  } = useQuery({ queryKey: GET_PURCHASES_KEY, queryFn: getPurchasesService });

  const createPurchaseLogicData = useCreatePurchaseLogicData({ onSuccess: () => setCreatePurchaseOpened(false) });
  const schedulePurchasePaymentLogicData = useSchedulePurchasePaymentLogicData();
  const confirmPurchasePaymentLogicData = useConfirmPurchasePaymentLogicData();
  const cancelPurchasePaymentLogicData = useCancelPurchasePaymentLogicData();

  const busy =
    schedulePurchasePaymentLogicData.schedulePurchasePaymentMutation.isPending ||
    confirmPurchasePaymentLogicData.confirmPurchasePaymentMutation.isPending ||
    cancelPurchasePaymentLogicData.cancelPurchasePaymentMutation.isPending;

  const purchases = purchasesData ?? [];
  const due = purchases.filter((purchase) => purchase.status !== EPurchaseStatus.PAID);
  const dueTotal = due.reduce((sum, purchase) => sum + purchase.totalCents, 0);
  const reserved = purchases.filter((purchase) => purchase.status === EPurchaseStatus.SCHEDULED).reduce((sum, purchase) => sum + purchase.totalCents, 0);
  const dueOpen = purchases.filter((purchase) => purchase.status === EPurchaseStatus.OPEN).reduce((sum, purchase) => sum + purchase.totalCents, 0);
  const ordered = [...purchases].sort((a, b) => RANK[a.status] - RANK[b.status]);

  function openCreatePurchase() {
    createPurchaseLogicData.createPurchaseReset();
    setCreatePurchaseOpened(true);
  }

  return (
    <>
      <AppPageHeader
        title="Compras"
        actions={
          <FormButton
            leftIcon={<IconPlus size={16} />}
            onClick={openCreatePurchase}
          >
            Nova compra
          </FormButton>
        }
      >
        <UtilsIf
          cases={[
            {
              condition: !!purchasesData && due.length > 0,
              content: () => (
                <>
                  <strong>
                    {`${moneyFull(dueTotal)} a pagar`}
                  </strong>

                  {` em ${plural(due.length, 'compra', 'compras')}`}

                  {reserved > 0 ? `, com ${moneyFull(reserved)} já reservados no caixa.` : '.'}

                  {' Agendar reserva o valor; confirmar tira do caixa.'}
                </>
              ),
            },
            {
              condition: !!purchasesData,
              content: () => 'Nenhuma compra em aberto com fornecedores.',
            },
            {
              content: () => 'Carregando as compras…',
            },
          ]}
        />
      </AppPageHeader>

      <PurchasesCashStrip dueOpen={dueOpen} />

      <UtilsPanel
        title="Compras recebidas"
        meta={purchasesData ? plural(purchases.length, 'compra', 'compras') : null}
        flush
      >
        <UtilsIf
          cases={[
            {
              condition: !!purchasesError,
              content: () => (
                <UtilsFail
                  error={purchasesError}
                  retry={purchasesRefetch}
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
                        Fornecedor
                      </Table.Th>

                      <Table.Th
                        w={104}
                        className={t.num}
                        visibleFrom="sm"
                      >
                        Data
                      </Table.Th>

                      <Table.Th className={cn(t.num, t.colMoney, t.deskCell)}>
                        Total
                      </Table.Th>

                      <Table.Th
                        w={196}
                        visibleFrom="md"
                      >
                        Situação
                      </Table.Th>

                      <Table.Th className={t.colActWide}>
                        <span className="sr-only">
                          Ações
                        </span>
                      </Table.Th>
                    </Table.Tr>
                  </Table.Thead>

                  <Table.Tbody>
                    <UtilsIf condition={purchasesIsLoading}>
                      {() => (
                        <UtilsSkeletonRows
                          rows={5}
                          cols={5}
                        />
                      )}
                    </UtilsIf>

                    <UtilsFor
                      each={ordered}
                      eachKey={({ item }) => item.id}
                    >
                      {({ item: purchase }) => (
                        <Table.Tr>
                          <Table.Td
                            className={t.num}
                            visibleFrom="sm"
                            c="dimmed"
                          >
                            {purchase.id}
                          </Table.Td>

                          <Table.Td className={t.clip}>
                            <span className={t.line1}>
                              <UtilsClip className={t.ident}>
                                {purchase.supplier}
                              </UtilsClip>

                              <span className={t.mob}>
                                <UtilsMoney cents={purchase.totalCents} />
                              </span>
                            </span>

                            <UtilsClip className={t.sub}>
                              <span className={t.desk}>
                                {itemsText(purchase.items)}
                              </span>

                              <span className={t.mob}>
                                {`${STATUS[purchase.status].label} · nº ${purchase.id} · ${day(purchase.createdAt)}`}
                              </span>
                            </UtilsClip>
                          </Table.Td>

                          <Table.Td
                            className={t.num}
                            visibleFrom="sm"
                          >
                            {day(purchase.createdAt)}
                          </Table.Td>

                          <Table.Td className={cn(t.num, t.deskCell)}>
                            <UtilsMoney cents={purchase.totalCents} />
                          </Table.Td>

                          <Table.Td visibleFrom="md">
                            <UtilsStatus tone={STATUS[purchase.status].tone}>
                              {STATUS[purchase.status].label}
                            </UtilsStatus>
                          </Table.Td>

                          <Table.Td>
                            <UtilsIf
                              cases={[
                                {
                                  condition: purchase.status === EPurchaseStatus.OPEN,
                                  content: () => (
                                    <SchedulePurchasePaymentLogicComponent
                                      logicData={schedulePurchasePaymentLogicData}
                                      purchaseId={purchase.id}
                                      disabled={busy}
                                    />
                                  ),
                                },
                                {
                                  condition: purchase.status === EPurchaseStatus.SCHEDULED,
                                  content: () => (
                                    <Group
                                      gap={6}
                                      wrap="nowrap"
                                      justify="flex-end"
                                    >
                                      <CancelPurchasePaymentLogicComponent
                                        logicData={cancelPurchasePaymentLogicData}
                                        purchaseId={purchase.id}
                                        disabled={busy}
                                      />

                                      <ConfirmPurchasePaymentLogicComponent
                                        logicData={confirmPurchasePaymentLogicData}
                                        purchaseId={purchase.id}
                                        disabled={busy}
                                      />
                                    </Group>
                                  ),
                                },
                              ]}
                            />
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

        <UtilsIf condition={purchasesData && purchases.length === 0}>
          {() => (
            <UtilsEmpty>
              Nenhuma compra ainda. Dê entrada na primeira mercadoria para formar o estoque.
            </UtilsEmpty>
          )}
        </UtilsIf>
      </UtilsPanel>

      <CreatePurchaseLogicComponent
        logicData={createPurchaseLogicData}
        opened={createPurchaseOpened}
        onClose={() => setCreatePurchaseOpened(false)}
      />
    </>
  );
}
