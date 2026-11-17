'use client';

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
import { percent } from '@/utils/format';
import { useValidatedFormState } from '@/utils/state';

import { createSaleService } from '../services/createSale';

const createSaleSchema = yup.object({
  customer: yup.string().default('').trim().required('Informe o cliente.'),
  items: yup
    .mixed<FormItemLine[]>()
    .default(() => [])
    .required()
    .test('not-empty', 'Adicione ao menos um item.', (items) => items.length > 0)
    .test('qty', 'Cada item precisa de ao menos uma unidade.', (items) => items.every((line) => line.qty >= 1)),
});

export function useCreateSaleLogicData({ onSuccess }: { onSuccess: () => void }) {
  const createSaleValidatedFormState = useValidatedFormState(createSaleSchema);

  const { data: products } = useQuery({ queryKey: GET_PRODUCTS_KEY, queryFn: getProductsService });

  const createSaleMutation = usePostingMutation({
    mutationFn: () => {
      const { customer, items } = createSaleValidatedFormState.state;

      return createSaleService({ body: { customer: customer.trim(), items: items.map((line) => ({ productId: line.productId, qty: line.qty })) } });
    },
    pickPosting: (res) => res.posting,
    onSettled: () => {
      createSaleReset();
      onSuccess();
    },
  });

  // Assim que os produtos chegam (e depois de cada reset), a venda começa com uma linha.
  const { state: saleState, setValue: saleSetValue } = createSaleValidatedFormState;
  useEffect(() => {
    if (saleState.items.length === 0 && products?.length) saleSetValue('items', [emptyItemLine(products)]);
  }, [products, saleState.items.length, saleSetValue]);

  function createSaleReset() {
    createSaleValidatedFormState.reset();
    createSaleMutation.clearPostingError();
  }

  return {
    createSaleValidatedFormState,
    createSaleMutation,
    createSaleReset,
    products: products ?? [],
  };
}

export function CreateSaleLogicComponent({
  logicData,
  opened,
  onClose,
}: {
  logicData: ReturnType<typeof useCreateSaleLogicData>;
  opened: boolean;
  onClose: () => void;
}) {
  const {
    createSaleValidatedFormState: {
      state: saleState,
      field: saleField,
      validate: saleValidate,
    },
    createSaleMutation: {
      mutate: createSaleMutate,
      isPending: createSaleIsPending,
      postingError: createSaleError,
    },
    products,
  } = logicData;

  const productOf = (id: number) => products.find((product) => product.id === id);
  const total = saleState.items.reduce((sum, line) => sum + (productOf(line.productId)?.priceCents ?? 0) * line.qty, 0);
  const cost = saleState.items.reduce((sum, line) => sum + (productOf(line.productId)?.avgCostCents ?? 0) * line.qty, 0);

  async function createSale() {
    if (!(await saleValidate())) return;

    createSaleMutate();
  }

  return (
    <FormDrawer
      opened={opened}
      title="Nova venda"
      onClose={onClose}
      submitLabel="Faturar venda"
      busy={createSaleIsPending}
      error={createSaleError}
      summary={total > 0 ? { label: 'Margem', value: percent((total - cost) / total) } : null}
      onSubmit={createSale}
    >
      <FormTextInput
        label="Cliente"
        placeholder="Nome ou razão social"
        {...saleField('customer')}
        required
        className="col-span-12"
      />

      <FormItemLines
        products={products}
        {...saleField('items')}
        className="col-span-12"
      />

      <LedgerPostingPreview
        title="O que será lançado no livro-razão, de uma vez só"
        className="col-span-12"
      >
        <LedgerLegPreview
          debit="Clientes a receber"
          credit="Receita de vendas"
          cents={total}
        />

        <LedgerLegPreview
          debit="Custo das mercadorias vendidas"
          credit="Estoque de mercadorias"
          cents={cost}
        />
      </LedgerPostingPreview>
    </FormDrawer>
  );
}
