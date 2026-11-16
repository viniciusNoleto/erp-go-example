'use client';

import { UtilsClip } from '@/components/utils/Clip';
import { UtilsEmpty } from '@/components/utils/Empty';
import { nFor, UtilsFor } from '@/components/utils/For';
import { UtilsIf } from '@/components/utils/If';
import { UtilsMoney } from '@/components/utils/Money';
import { UtilsPanel } from '@/components/utils/Panel';
import { UtilsStatus } from '@/components/utils/Status';
import { EPurchaseStatus } from '@/resources/purchase/enums/PurchaseStatus';
import { ConfirmPurchasePaymentLogicComponent, useConfirmPurchasePaymentLogicData } from '@/resources/purchase/logics/ConfirmPurchasePayment';
import { SchedulePurchasePaymentLogicComponent, useSchedulePurchasePaymentLogicData } from '@/resources/purchase/logics/SchedulePurchasePayment';
import type { IPurchase } from '@/resources/purchase/models/Purchase';
import { ReceiveSaleLogicComponent, useReceiveSaleLogicData } from '@/resources/sale/logics/ReceiveSale';
import { ESaleStatus } from '@/resources/sale/enums/SaleStatus';
import type { ISale } from '@/resources/sale/models/Sale';
import { s } from '@/styles/screens';
import { plural } from '@/utils/format';

import { OverviewSkeletonRow } from './SkeletonRow';

type Due = {
  key: string;
  title: string;
  who: string;
  cents: number;
  /** O selo ao lado do título (só nas reservas). */
  status: string | null;
  action: 'confirm' | 'receive' | 'schedule';
  id: number;
};

/** As listas da visão geral mostram poucas linhas e levam para a tela completa. */
export const OVERVIEW_ROWS = 5;

/**
 * O que pede uma ação: receber, agendar ou confirmar, com o botão na própria
 * linha. Os pagamentos reservados vêm primeiro (o dinheiro já está preso).
 */
export function overviewDues({ sales, purchases }: { sales?: ISale[]; purchases?: IPurchase[] }): Due[] {
  const openSales = sales?.filter((sale) => sale.status === ESaleStatus.OPEN) ?? [];
  const duePurchases = purchases?.filter((purchase) => purchase.status !== EPurchaseStatus.PAID) ?? [];

  return [
    ...duePurchases
      .filter((purchase) => purchase.status === EPurchaseStatus.SCHEDULED)
      .map((purchase) => ({
        key: `p${purchase.id}`,
        title: `Compra nº ${purchase.id}`,
        who: purchase.supplier,
        cents: purchase.totalCents,
        status: 'Reservado',
        action: 'confirm' as const,
        id: purchase.id,
      })),
    ...openSales.map((sale) => ({
      key: `s${sale.id}`,
      title: `Venda nº ${sale.id}`,
      who: sale.customer,
      cents: sale.totalCents,
      status: null,
      action: 'receive' as const,
      id: sale.id,
    })),
    ...duePurchases
      .filter((purchase) => purchase.status === EPurchaseStatus.OPEN)
      .map((purchase) => ({
        key: `p${purchase.id}`,
        title: `Compra nº ${purchase.id}`,
        who: purchase.supplier,
        cents: purchase.totalCents,
        status: null,
        action: 'schedule' as const,
        id: purchase.id,
      })),
  ];
}

export function OverviewDuesPanel({ dues, loaded }: { dues: Due[]; loaded: boolean }) {
  const receiveSaleLogicData = useReceiveSaleLogicData();
  const schedulePurchasePaymentLogicData = useSchedulePurchasePaymentLogicData();
  const confirmPurchasePaymentLogicData = useConfirmPurchasePaymentLogicData();

  const busy =
    receiveSaleLogicData.receiveSaleMutation.isPending ||
    schedulePurchasePaymentLogicData.schedulePurchasePaymentMutation.isPending ||
    confirmPurchasePaymentLogicData.confirmPurchasePaymentMutation.isPending;

  return (
    <UtilsPanel
      title="A receber e a pagar"
      meta={loaded ? plural(dues.length, 'pendência', 'pendências') : null}
      flush
      className={s.span6}
    >
      <UtilsIf
        cases={[
          {
            condition: loaded && dues.length === 0,
            content: () => (
              <UtilsEmpty>
                Nada em aberto: toda venda foi recebida e toda compra, paga.
              </UtilsEmpty>
            ),
          },
          {
            content: () => (
              <ul className={s.rows}>
                <UtilsFor
                  each={dues.slice(0, OVERVIEW_ROWS)}
                  eachKey={({ item }) => item.key}
                >
                  {({ item: due }) => (
                    <li className={s.rowAct}>
                      <div className={s.rowMain}>
                        <div className={s.rowTitle}>
                          <UtilsClip>
                            {due.title}
                          </UtilsClip>

                          <UtilsIf condition={due.status}>
                            {() => (
                              <UtilsStatus tone="wait">
                                {due.status}
                              </UtilsStatus>
                            )}
                          </UtilsIf>
                        </div>

                        <UtilsClip className={s.rowSub}>
                          {due.who}
                        </UtilsClip>
                      </div>

                      <span className={s.rowNum}>
                        <UtilsMoney cents={due.cents} />
                      </span>

                      <UtilsIf
                        cases={[
                          {
                            condition: due.action === 'confirm',
                            content: () => (
                              <ConfirmPurchasePaymentLogicComponent
                                logicData={confirmPurchasePaymentLogicData}
                                purchaseId={due.id}
                                disabled={busy}
                                variant="default"
                                fullWidth
                              />
                            ),
                          },
                          {
                            condition: due.action === 'receive',
                            content: () => (
                              <ReceiveSaleLogicComponent
                                logicData={receiveSaleLogicData}
                                saleId={due.id}
                                disabled={busy}
                              />
                            ),
                          },
                          {
                            content: () => (
                              <SchedulePurchasePaymentLogicComponent
                                logicData={schedulePurchasePaymentLogicData}
                                purchaseId={due.id}
                                disabled={busy}
                                short
                              />
                            ),
                          },
                        ]}
                      />
                    </li>
                  )}
                </UtilsFor>

                <UtilsIf condition={!loaded}>
                  {() => (
                    <UtilsFor each={nFor(OVERVIEW_ROWS)}>
                      {() => <OverviewSkeletonRow />}
                    </UtilsFor>
                  )}
                </UtilsIf>
              </ul>
            ),
          },
        ]}
      />
    </UtilsPanel>
  );
}
