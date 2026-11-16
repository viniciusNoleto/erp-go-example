'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as yup from 'yup';

import { FormDrawer } from '@/components/form/Drawer';
import { FormMoneyInput } from '@/components/form/MoneyInput';
import { FormTextInput } from '@/components/form/TextInput';
import { useValidatedFormState } from '@/utils/state';

import { createProductService } from '../services/createProduct';
import { GET_PRODUCTS_KEY } from '../services/getProducts';

const createProductSchema = yup.object({
  sku: yup.string().default('').trim().required('Informe o código do produto.'),
  name: yup.string().default('').trim().required('Informe o nome do produto.'),
  priceCents: yup.number().nullable().default(null).test('required', 'Informe o preço de venda.', (value) => value !== null && value !== undefined).min(1, 'O preço precisa ser maior que zero.'),
});

export function useCreateProductLogicData({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const createProductValidatedFormState = useValidatedFormState(createProductSchema);

  const createProductMutation = useMutation({
    mutationFn: () => {
      const { sku, name, priceCents } = createProductValidatedFormState.state;

      return createProductService({ body: { sku: sku.trim(), name: name.trim(), priceCents: priceCents ?? 0 } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GET_PRODUCTS_KEY });
      createProductReset();
      onSuccess();
    },
  });

  function createProductReset() {
    createProductValidatedFormState.reset();
    createProductMutation.reset();
  }

  return {
    createProductValidatedFormState,
    createProductMutation,
    createProductReset,
  };
}

export function CreateProductLogicComponent({
  logicData,
  opened,
  onClose,
}: {
  logicData: ReturnType<typeof useCreateProductLogicData>;
  opened: boolean;
  onClose: () => void;
}) {
  const {
    createProductValidatedFormState: {
      field: productField,
      validate: productValidate,
    },
    createProductMutation: {
      mutate: createProductMutate,
      isPending: createProductIsPending,
      error: createProductError,
    },
  } = logicData;

  async function createProduct() {
    if (!(await productValidate())) return;

    createProductMutate();
  }

  return (
    <FormDrawer
      opened={opened}
      title="Novo produto"
      onClose={onClose}
      submitLabel="Cadastrar"
      busy={createProductIsPending}
      error={createProductError?.message}
      onSubmit={createProduct}
    >
      <FormTextInput
        label="Código"
        placeholder="Ex.: LAP-12"
        {...productField('sku')}
        required
        className="col-span-12"
      />

      <FormTextInput
        label="Nome"
        placeholder="Ex.: Lápis pastel (caixa com 12)"
        {...productField('name')}
        required
        className="col-span-12"
      />

      <FormMoneyInput
        label="Preço de venda"
        description="O produto entra sem estoque: as unidades e o custo chegam pela primeira compra."
        placeholder="0,00"
        {...productField('priceCents')}
        required
        className="col-span-12"
      />
    </FormDrawer>
  );
}
