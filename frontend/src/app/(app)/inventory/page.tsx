'use client';

import { Table } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { FormButton } from '@/components/form/Button';
import { AppPageHeader } from '@/components/layout/PageHeader';
import { UtilsClip } from '@/components/utils/Clip';
import { UtilsEmpty } from '@/components/utils/Empty';
import { UtilsFail } from '@/components/utils/Fail';
import { UtilsFor } from '@/components/utils/For';
import { UtilsIf } from '@/components/utils/If';
import { UtilsMoney } from '@/components/utils/Money';
import { UtilsPanel } from '@/components/utils/Panel';
import { UtilsProof } from '@/components/utils/Proof';
import { UtilsSkeletonRows } from '@/components/utils/SkeletonRows';
import { EAccountId } from '@/resources/account/enums/AccountId';
import { GET_ACCOUNTS_KEY, getAccountsService } from '@/resources/account/services/getAccounts';
import { CreateProductLogicComponent, useCreateProductLogicData } from '@/resources/product/logics/CreateProduct';
import { GET_PRODUCTS_KEY, getProductsService } from '@/resources/product/services/getProducts';
import { s } from '@/styles/screens';
import { t } from '@/styles/table';
import { cn } from '@/utils/cn';
import { count, moneyFull, percent, plural } from '@/utils/format';

/** Abaixo disto o produto pede reposição. */
const LOW_STOCK = 5;

/**
 * Estoque. A pergunta: quanto tenho em mercadoria, e o que está acabando?
 * Embaixo, a prova: a soma dos produtos (Postgres) confere com a conta de
 * estoque no razão (TigerBeetle).
 */
export default function InventoryPage() {
  const [createProductOpened, setCreateProductOpened] = useState(false);

  const {
    data: productsData,
    isLoading: productsIsLoading,
    error: productsError,
    refetch: productsRefetch,
  } = useQuery({ queryKey: GET_PRODUCTS_KEY, queryFn: getProductsService });
  const { data: accounts } = useQuery({ queryKey: GET_ACCOUNTS_KEY, queryFn: getAccountsService });

  const createProductLogicData = useCreateProductLogicData({ onSuccess: () => setCreateProductOpened(false) });

  const products = productsData ?? [];
  const units = products.reduce((sum, product) => sum + product.stock, 0);
  const value = products.reduce((sum, product) => sum + product.stockValueCents, 0);
  const ledger = accounts?.find((account) => account.id === EAccountId.INVENTORY)?.balanceCents;
  const low = products.filter((product) => product.stock <= LOW_STOCK);
  // O cadastro e o razão contam o mesmo estoque por caminhos diferentes. A
  // diferença, quando há, são os centavos que o custo médio perde ao arredondar.
  const drift = ledger === undefined ? 0 : ledger - value;
  // Arredondar o custo médio a cada entrada perde no máximo meio centavo por
  // unidade movimentada: até R$ 5 (ou 0,1% do estoque) é arredondamento.
  const matches = Math.abs(drift) <= Math.max(500, value * 0.001);
  // Os que pedem reposição primeiro.
  const ordered = [...low, ...products.filter((product) => product.stock > LOW_STOCK)];

  function openCreateProduct() {
    createProductLogicData.createProductReset();
    setCreateProductOpened(true);
  }

  return (
    <>
      <AppPageHeader
        title="Estoque"
        actions={
          <FormButton
            leftIcon={<IconPlus size={16} />}
            onClick={openCreateProduct}
          >
            Novo produto
          </FormButton>
        }
      >
        <UtilsIf
          cases={[
            {
              condition: !!productsData,
              content: () => (
                <>
                  <strong>
                    {`${moneyFull(ledger ?? value)} em mercadorias`}
                  </strong>

                  {`, ${plural(units, 'unidade', 'unidades')} em ${plural(products.length, 'produto', 'produtos')}.`}

                  <UtilsIf condition={low.length > 0}>
                    {() => ` ${low.length === 1 ? `${low[0].name} está` : `${low.length} produtos estão`} com ${LOW_STOCK} unidades ou menos.`}
                  </UtilsIf>
                </>
              ),
            },
            {
              content: () => 'Carregando os produtos…',
            },
          ]}
        />
      </AppPageHeader>

      <UtilsPanel
        title="Produtos"
        meta="custo médio ponderado"
        flush
      >
        <UtilsIf
          cases={[
            {
              condition: !!productsError,
              content: () => (
                <UtilsFail
                  error={productsError}
                  retry={productsRefetch}
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
                        w={112}
                        visibleFrom="sm"
                      >
                        Código
                      </Table.Th>

                      <Table.Th>
                        Produto
                      </Table.Th>

                      <Table.Th
                        w={112}
                        className={t.num}
                      >
                        Em estoque
                      </Table.Th>

                      <Table.Th
                        w={128}
                        className={t.num}
                        visibleFrom="md"
                      >
                        Custo médio
                      </Table.Th>

                      <Table.Th
                        w={128}
                        className={t.num}
                        visibleFrom="sm"
                      >
                        Preço
                      </Table.Th>

                      <Table.Th
                        w={96}
                        className={t.num}
                        visibleFrom="md"
                      >
                        Margem
                      </Table.Th>

                      <Table.Th
                        w={148}
                        className={t.num}
                      >
                        Valor em estoque
                      </Table.Th>
                    </Table.Tr>
                  </Table.Thead>

                  <Table.Tbody>
                    <UtilsIf condition={productsIsLoading}>
                      {() => (
                        <UtilsSkeletonRows
                          rows={7}
                          cols={4}
                        />
                      )}
                    </UtilsIf>

                    <UtilsFor
                      each={ordered}
                      eachKey={({ item }) => item.id}
                    >
                      {({ item: product }) => (
                        <Table.Tr>
                          <Table.Td
                            visibleFrom="sm"
                            c="dimmed"
                          >
                            {product.sku}
                          </Table.Td>

                          <Table.Td className={t.clip}>
                            <UtilsClip className={t.ident}>
                              {product.name}
                            </UtilsClip>

                            <span className={cn(t.sub, t.legs)}>
                              {product.sku}
                            </span>
                          </Table.Td>

                          <Table.Td className={t.num}>
                            {count(product.stock)}

                            <span className="text-12 text-muted">
                              {' un.'}
                            </span>

                            <UtilsIf condition={product.stock <= LOW_STOCK}>
                              {() => (
                                <span className={cn(t.sub, 'text-negative')}>
                                  {product.stock === 0 ? 'Esgotado' : 'Repor'}
                                </span>
                              )}
                            </UtilsIf>
                          </Table.Td>

                          <Table.Td
                            className={t.num}
                            visibleFrom="md"
                          >
                            <UtilsIf
                              cases={[
                                {
                                  condition: product.avgCostCents > 0,
                                  content: () => <UtilsMoney cents={product.avgCostCents} />,
                                },
                                {
                                  content: () => <span className="text-muted">—</span>,
                                },
                              ]}
                            />
                          </Table.Td>

                          <Table.Td
                            className={t.num}
                            visibleFrom="sm"
                          >
                            <UtilsMoney cents={product.priceCents} />
                          </Table.Td>

                          <Table.Td
                            className={t.num}
                            visibleFrom="md"
                          >
                            <UtilsIf
                              cases={[
                                {
                                  condition: product.avgCostCents > 0,
                                  content: () => percent((product.priceCents - product.avgCostCents) / product.priceCents),
                                },
                                {
                                  content: () => <span className="text-muted">—</span>,
                                },
                              ]}
                            />
                          </Table.Td>

                          <Table.Td className={t.num}>
                            <UtilsMoney
                              cents={product.stockValueCents}
                              muted={product.stockValueCents === 0}
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

        <UtilsIf condition={productsData && products.length === 0}>
          {() => (
            <UtilsEmpty>
              Nenhum produto cadastrado. Cadastre o primeiro e dê entrada numa compra para formar o estoque.
            </UtilsEmpty>
          )}
        </UtilsIf>

        <UtilsIf condition={ledger !== undefined && products.length > 0}>
          {() => (
            <div className="px-6 pt-1 pb-5 max-sm:px-4 max-sm:pb-4">
              <UtilsProof
                ok={matches}
                className={s.proof}
              >
                <strong>
                  {matches ? 'Confere com o razão.' : 'Não confere com o razão.'}
                </strong>

                {` A soma dos produtos dá ${moneyFull(value)}; a conta 1103 Estoque de mercadorias tem ${moneyFull(ledger!)}.`}

                <UtilsIf condition={drift !== 0 && matches}>
                  {() => ` Os ${moneyFull(Math.abs(drift))} de diferença são centavos arredondados no custo médio.`}
                </UtilsIf>
              </UtilsProof>
            </div>
          )}
        </UtilsIf>
      </UtilsPanel>

      <CreateProductLogicComponent
        logicData={createProductLogicData}
        opened={createProductOpened}
        onClose={() => setCreateProductOpened(false)}
      />
    </>
  );
}
