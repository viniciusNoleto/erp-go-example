'use client';

import { Table } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { FormButton } from '@/components/form/Button';
import { AppPageHeader } from '@/components/layout/PageHeader';
import { UtilsFail } from '@/components/utils/Fail';
import { UtilsFor } from '@/components/utils/For';
import { UtilsIf } from '@/components/utils/If';
import { UtilsMoney } from '@/components/utils/Money';
import { UtilsPanel } from '@/components/utils/Panel';
import { UtilsSkeletonRows } from '@/components/utils/SkeletonRows';
import { ACCOUNT_TYPE_LABEL, ACCOUNT_TYPE_ORDER, EAccountType } from '@/resources/account/enums/AccountType';
import { CreateAccountLogicComponent, useCreateAccountLogicData } from '@/resources/account/logics/CreateAccount';
import { GET_ACCOUNTS_KEY, getAccountsService } from '@/resources/account/services/getAccounts';
import { ROUTES } from '@/shared/constants/routes';
import { t } from '@/styles/table';
import { plural } from '@/utils/format';

import { AccountsAccountRow } from './_components/AccountRow';
import { AccountsEquationPanel } from './_components/EquationPanel';

/**
 * Plano de contas. A pergunta: onde está o dinheiro, e os dois lados batem?
 * As contas agrupadas por natureza, com o total de cada grupo, e ao lado a
 * equação patrimonial fechando.
 */
export default function AccountsPage() {
  const router = useRouter();
  const [createAccountOpened, setCreateAccountOpened] = useState(false);

  const {
    data: accountsData,
    isLoading: accountsIsLoading,
    error: accountsError,
    refetch: accountsRefetch,
  } = useQuery({ queryKey: GET_ACCOUNTS_KEY, queryFn: getAccountsService });

  const createAccountLogicData = useCreateAccountLogicData({ onSuccess: () => setCreateAccountOpened(false) });

  const accounts = accountsData ?? [];
  const groups = ACCOUNT_TYPE_ORDER.map((type) => ({ type, accounts: accounts.filter((account) => account.type === type) })).filter(
    (group) => group.accounts.length > 0,
  );
  const total = (type: EAccountType) => accounts.filter((account) => account.type === type).reduce((sum, account) => sum + account.balanceCents, 0);

  function openCreateAccount() {
    createAccountLogicData.createAccountReset();
    setCreateAccountOpened(true);
  }

  return (
    <>
      <AppPageHeader
        title="Plano de contas"
        actions={
          <FormButton
            leftIcon={<IconPlus size={16} />}
            onClick={openCreateAccount}
          >
            Nova conta
          </FormButton>
        }
      >
        <UtilsIf
          cases={[
            {
              condition: !!accountsData,
              content: () => (
                <>
                  <strong>
                    {plural(accounts.length, 'conta', 'contas')}
                  </strong>

                  {' no livro em reais. Os saldos vêm do TigerBeetle; abra uma conta para ver o razonete dela.'}
                </>
              ),
            },
            {
              content: () => 'Lendo os saldos no livro-razão…',
            },
          ]}
        />
      </AppPageHeader>

      <AccountsEquationPanel
        loading={!accountsData}
        totals={{
          assets: total(EAccountType.ASSET),
          liabilities: total(EAccountType.LIABILITY),
          equity: total(EAccountType.EQUITY),
          net: total(EAccountType.REVENUE) - total(EAccountType.EXPENSE),
        }}
      />

      <UtilsPanel
        title="Contas"
        meta="saldos no TigerBeetle"
        flush
      >
        <UtilsIf
          cases={[
            {
              condition: !!accountsError,
              content: () => (
                <UtilsFail
                  error={accountsError}
                  retry={accountsRefetch}
                />
              ),
            },
            {
              content: () => (
                <Table
                  layout="fixed"
                  highlightOnHover
                >
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th
                        w={88}
                        className={t.num}
                      >
                        Número
                      </Table.Th>

                      <Table.Th>
                        Conta
                      </Table.Th>

                      <Table.Th
                        w={160}
                        className={t.num}
                        visibleFrom="md"
                      >
                        Débitos
                      </Table.Th>

                      <Table.Th
                        w={160}
                        className={t.num}
                        visibleFrom="md"
                      >
                        Créditos
                      </Table.Th>

                      <Table.Th
                        w={160}
                        className={t.num}
                      >
                        Saldo
                      </Table.Th>
                    </Table.Tr>
                  </Table.Thead>

                  <Table.Tbody>
                    <UtilsIf condition={accountsIsLoading}>
                      {() => (
                        <UtilsSkeletonRows
                          rows={8}
                          cols={3}
                        />
                      )}
                    </UtilsIf>

                    <UtilsFor
                      each={groups}
                      eachKey={({ item }) => item.type}
                    >
                      {({ item: group }) => (
                        <>
                          <Table.Tr className={t.group}>
                            <Table.Td />

                            <Table.Td>
                              {ACCOUNT_TYPE_LABEL[group.type]}
                            </Table.Td>

                            <Table.Td visibleFrom="md" />

                            <Table.Td visibleFrom="md" />

                            <Table.Td className={t.num}>
                              <UtilsMoney cents={total(group.type)} />
                            </Table.Td>
                          </Table.Tr>

                          <UtilsFor
                            each={group.accounts}
                            eachKey={({ item }) => item.id}
                          >
                            {({ item: account }) => (
                              <AccountsAccountRow
                                account={account}
                                onOpen={() => router.push(ROUTES.accountLedger(account.id))}
                              />
                            )}
                          </UtilsFor>
                        </>
                      )}
                    </UtilsFor>
                  </Table.Tbody>
                </Table>
              ),
            },
          ]}
        />
      </UtilsPanel>

      <CreateAccountLogicComponent
        logicData={createAccountLogicData}
        opened={createAccountOpened}
        onClose={() => setCreateAccountOpened(false)}
      />
    </>
  );
}
