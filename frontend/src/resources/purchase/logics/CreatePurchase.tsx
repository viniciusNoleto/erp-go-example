'use client';

import { Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import * as yup from 'yup';

import { FormDrawer } from '@/components/form/Drawer';
import { emptyItemLine, FormItemLines, type FormItemLine } from '@/components/form/ItemLines';
import { FormTextInput } from '@/components/form/TextInput';
import { LedgerLegPreview } from '@/components/ledger/LegPreview';
import { LedgerPostingPreview } from '@/components/ledger/PostingPreview';
import { usePostingMutation } from '@/components/stage/usePostingMutation';
import { GET_PRODUCTS_KEY, getProductsService } from '@/resources/product/services/getProducts';
import { moneyFull } from '@/utils/format';
import { useValidatedFormState } from '@/utils/state';

import { createPurchaseService } from '../services/createPurchase';

const createPurchaseSchema = yup.object({
  supplier: yup.string().default('').trim().required('Informe o fornecedor.'),
  items: yup
    .mixed<FormItemLine[]>()
    .default(() => [])
    .required()
    .test('not-empty', 'Adicione ao menos um item.', (items) => items.length > 0)
    .test('qty', 'Cada item precisa de ao menos uma unidade.', (items) => items.every((line) => line.qty >= 1))
    .test('cost', 'Informe o custo unitário de cada item.', (items) => items.every((line) => (line.cost ?? 0) > 0)),
});

export function useCreatePurchaseLogicData({ onSuccess }: { onSuccess: () => void }) {
  const createPurchaseValidatedFormState = useValidatedFormState(createPurchaseSchema);

  const { data: products } = useQuery({ queryKey: GET_PRODUCTS_KEY, queryFn: getProductsService });

  const createPurchaseMutation = usePostingMutation({
    mutationFn: () => {
      const { supplier, items } = createPurchaseValidatedFormState.state;

      return createPurchaseService({
        body: {
          supplier: supplier.trim(),
          items: items.map((line) => ({ productId: line.productId, qty: line.qty, unitCostCents: line.cost ?? 0 })),
        },
      });
    },
    pickPosting: (res) => res.posting,
    onSettled: () => {
      createPurchaseReset();
      onSuccess();
    },
  });

  // Assim que os produtos chegam (e depois de cada reset), a compra começa com uma linha.
  const { state: purchaseState, setValue: purchaseSetValue } = createPurchaseValidatedFormState;
  useEffect(() => {
    if (purchaseState.items.length === 0 && products?.length) purchaseSetValue('items', [emptyItemLine(products)]);
  }, [products, purchaseState.items.length, purchaseSetValue]);

  function createPurchaseReset() {
    createPurchaseValidatedFormState.reset();
    createPurchaseMutation.clearPostingError();
  }

  return {
    createPurchaseValidatedFormState,
    createPurchaseMutation,
    createPurchaseReset,
    products: products ?? [],
  };
}

export function CreatePurchaseLogicComponent({
  logicData,
  opened,
  onClose,
}: {
  logicData: ReturnType<typeof useCreatePurchaseLogicData>;
  opened: boolean;
  onClose: () => void;
}) {
  const {
    createPurchaseValidatedFormState: {
      state: purchaseState,
      field: purchaseField,
      validate: purchaseValidate,
    },
    createPurchaseMutation: {
      mutate: createPurchaseMutate,
      isPending: createPurchaseIsPending,
      postingError: createPurchaseError,
    },
    products,
  } = logicData;

  const total = purchaseState.items.reduce((sum, line) => sum + (line.cost ?? 0) * line.qty, 0);

  async function createPurchase() {
    if (!(await purchaseValidate())) return;

    createPurchaseMutate();
  }

  return (
    <FormDrawer
      opened={opened}
      title="Nova compra"
      onClose={onClose}
      submitLabel="Dar entrada"
      busy={createPurchaseIsPending}
      error={createPurchaseError}
      summary={total > 0 ? { label: 'Total', value: moneyFull(total) } : null}
      onSubmit={createPurchase}
    >
      <FormTextInput
        label="Fornecedor"
        placeholder="Nome ou razão social"
        {...purchaseField('supplier')}
        required
        className="col-span-12"
      />

      <FormItemLines
        products={products}
        withCost
        {...purchaseField('items')}
        className="col-span-12"
      />

      <Text
        size="xs"
        c="dimmed"
        mt={-8}
        className="col-span-12"
      >
        O custo médio de cada produto é recalculado na entrada.
      </Text>

      <LedgerPostingPreview
        title="O que será lançado no livro-razão"
        className="col-span-12"
      >
        <LedgerLegPreview
          debit="Estoque de mercadorias"
          credit="Fornecedores a pagar"
          cents={total}
        />
      </LedgerPostingPreview>
    </FormDrawer>
  );
}
