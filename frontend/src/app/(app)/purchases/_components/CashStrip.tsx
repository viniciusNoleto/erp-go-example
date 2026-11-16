'use client';

import { Paper, Skeleton } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';

import { UtilsFail } from '@/components/utils/Fail';
import { UtilsIf } from '@/components/utils/If';
import { UtilsMoney } from '@/components/utils/Money';
import { UtilsProofIcon } from '@/components/utils/Proof';
import { EAccountId } from '@/resources/account/enums/AccountId';
import { GET_ACCOUNTS_KEY, getAccountsService } from '@/resources/account/services/getAccounts';
import { s } from '@/styles/screens';
import { cn } from '@/utils/cn';
import { moneyFull } from '@/utils/format';

/**
 * A próxima pergunta de quem paga fornecedor: o caixa aguenta? Saldo menos o
 * que já está reservado dá o disponível; ao lado, quanto ainda falta agendar.
 */
export function PurchasesCashStrip({ dueOpen }: { dueOpen: number }) {
  const {
    data: accounts,
    error: accountsError,
    refetch: accountsRefetch,
  } = useQuery({ queryKey: GET_ACCOUNTS_KEY, queryFn: getAccountsService });

  const cash = accounts?.find((account) => account.id === EAccountId.CASH);
  const available = cash ? cash.balanceCents - cash.reservedCents : 0;
  const covers = available >= dueOpen;

  return (
    <Paper
      component="section"
      aria-label="Caixa para pagar"
      mb={16}
      className="bg-surface"
    >
      <UtilsIf
        cases={[
          {
            condition: !!accountsError,
            content: () => (
              <div className="pt-5">
                <UtilsFail
                  error={accountsError}
                  retry={accountsRefetch}
                />
              </div>
            ),
          },
          {
            content: () => (
              <>
                <div className={s.equation4}>
                  <CashCell
                    label="Caixa e bancos"
                    cents={cash?.balanceCents}
                  />

                  <span
                    className={s.eqOp}
                    aria-label="menos"
                  >
                    −
                  </span>

                  <CashCell
                    label="Reservado para pagamentos"
                    cents={cash?.reservedCents}
                  />

                  <span
                    className={s.eqOp}
                    aria-label="igual a"
                  >
                    =
                  </span>

                  <CashCell
                    label="Disponível para pagar"
                    cents={cash ? available : undefined}
                    className={s.eqLead}
                  />

                  <span
                    aria-hidden="true"
                    className={s.eqSpacer}
                  />

                  <CashCell
                    label="A pagar, ainda sem reserva"
                    cents={cash ? dueOpen : undefined}
                    className={s.eqAside}
                  />
                </div>

                <UtilsIf condition={cash}>
                  {() => (
                    <p className={s.eqProof}>
                      <UtilsProofIcon ok={covers} />

                      <span>
                        <UtilsIf
                          cases={[
                            {
                              condition: dueOpen === 0,
                              content: () => (
                                <>
                                  <strong>
                                    Nada por agendar.
                                  </strong>

                                  {' Toda compra em aberto já tem o valor reservado no caixa.'}
                                </>
                              ),
                            },
                            {
                              condition: covers,
                              content: () => (
                                <>
                                  <strong>
                                    O disponível cobre tudo.
                                  </strong>

                                  {` Agendar as compras em aberto ainda deixa ${moneyFull(available - dueOpen)} livres no caixa.`}
                                </>
                              ),
                            },
                            {
                              content: () => (
                                <>
                                  <strong>
                                    {`Faltam ${moneyFull(dueOpen - available)}.`}
                                  </strong>

                                  {' O razão recusa a reserva que passar do disponível: o caixa não pode ficar negativo.'}
                                </>
                              ),
                            },
                          ]}
                        />
                      </span>
                    </p>
                  )}
                </UtilsIf>
              </>
            ),
          },
        ]}
      />
    </Paper>
  );
}

/** Uma célula da faixa: o rótulo e o valor (ou o esqueleto, enquanto carrega). */
function CashCell({ label, cents, className }: { label: string; cents?: number; className?: string }) {
  return (
    <div className={cn(s.eqCell, className)}>
      <span className={s.eqLabel}>
        {label}
      </span>

      <span className={s.eqValue}>
        <UtilsIf
          cases={[
            {
              condition: cents !== undefined,
              content: () => <UtilsMoney cents={cents!} />,
            },
            {
              content: () => (
                <Skeleton
                  height={24}
                  width={140}
                  radius={4}
                />
              ),
            },
          ]}
        />
      </span>
    </div>
  );
}
