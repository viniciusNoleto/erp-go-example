'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as yup from 'yup';

import { FormDrawer } from '@/components/form/Drawer';
import { FormSelect } from '@/components/form/Select';
import { FormTextInput } from '@/components/form/TextInput';
import { useValidatedFormState } from '@/utils/state';

import { ACCOUNT_TYPE_LABEL, ACCOUNT_TYPE_ORDER, EAccountType } from '../enums/AccountType';
import { createAccountService } from '../services/createAccount';

/** O primeiro dígito do número da conta, pela natureza (1 ativo, 2 passivo…). */
const TYPE_DIGIT: Record<EAccountType, number> = {
  [EAccountType.ASSET]: 1,
  [EAccountType.LIABILITY]: 2,
  [EAccountType.EQUITY]: 3,
  [EAccountType.REVENUE]: 4,
  [EAccountType.EXPENSE]: 5,
};

const TYPE_OPTIONS = ACCOUNT_TYPE_ORDER.map((type) => ({ value: type, label: ACCOUNT_TYPE_LABEL[type] }));

const createAccountSchema = yup.object({
  type: yup.string().oneOf(Object.values(EAccountType)).default(EAccountType.EXPENSE).required(),
  id: yup
    .string()
    .default('')
    .required('Informe o número da conta.')
    .matches(/^\d{4}$/, 'O número tem quatro dígitos.')
    .test('type-digit', 'O primeiro dígito não bate com a natureza.', function (value) {
      return value.startsWith(String(TYPE_DIGIT[this.parent.type as EAccountType]));
    }),
  name: yup.string().default('').trim().required('Informe o nome da conta.'),
});

export function useCreateAccountLogicData({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const createAccountValidatedFormState = useValidatedFormState(createAccountSchema);

  const createAccountMutation = useMutation({
    mutationFn: () => {
      const { id, name, type } = createAccountValidatedFormState.state;

      return createAccountService({ body: { id: Number(id), name: name.trim(), type } });
    },
    onSuccess: () => {
      // A conta nova aparece no plano, na visão geral e nos selects do lançamento.
      queryClient.invalidateQueries();
      createAccountReset();
      onSuccess();
    },
  });

  function createAccountReset() {
    createAccountValidatedFormState.reset();
    createAccountMutation.reset();
  }

  return {
    createAccountValidatedFormState,
    createAccountMutation,
    createAccountReset,
  };
}

export function CreateAccountLogicComponent({
  logicData,
  opened,
  onClose,
}: {
  logicData: ReturnType<typeof useCreateAccountLogicData>;
  opened: boolean;
  onClose: () => void;
}) {
  const {
    createAccountValidatedFormState: {
      state: accountState,
      field: accountField,
      validate: accountValidate,
    },
    createAccountMutation: {
      mutate: createAccountMutate,
      isPending: createAccountIsPending,
      error: createAccountError,
    },
  } = logicData;

  const digit = TYPE_DIGIT[accountState.type];

  async function createAccount() {
    if (!(await accountValidate())) return;

    createAccountMutate();
  }

  return (
    <FormDrawer
      opened={opened}
      title="Nova conta"
      onClose={onClose}
      submitLabel="Abrir conta"
      busy={createAccountIsPending}
      error={createAccountError?.message}
      onSubmit={createAccount}
    >
      <FormSelect
        label="Natureza"
        data={TYPE_OPTIONS}
        {...accountField('type')}
        onChange={(value) => value && accountField('type').onChange(value as EAccountType)}
        className="col-span-12"
      />

      <FormTextInput
        label="Número"
        description={`Quatro dígitos, começando com ${digit} para ${ACCOUNT_TYPE_LABEL[accountState.type].toLowerCase()}.`}
        inputMode="numeric"
        maxLength={4}
        placeholder={`${digit}202`}
        mask={(value) => value.replace(/\D/g, '')}
        {...accountField('id')}
        required
        className="col-span-12"
      />

      <FormTextInput
        label="Nome"
        description="A conta é aberta também no TigerBeetle, onde os saldos ficam guardados."
        placeholder="Ex.: Despesas com frete"
        {...accountField('name')}
        required
        className="col-span-12"
      />
    </FormDrawer>
  );
}
