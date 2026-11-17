'use client';

import { useQuery } from '@tanstack/react-query';
import * as yup from 'yup';

import { FormDrawer } from '@/components/form/Drawer';
import { FormMoneyInput } from '@/components/form/MoneyInput';
import { FormSegmentedControl } from '@/components/form/SegmentedControl';
import { FormSelect } from '@/components/form/Select';
import { FormTextInput } from '@/components/form/TextInput';
import { LedgerLegPreview } from '@/components/ledger/LegPreview';
import { LedgerPostingPreview } from '@/components/ledger/PostingPreview';
import { usePostingMutation } from '@/components/stage/usePostingMutation';
import { EAccountId } from '@/resources/account/enums/AccountId';
import { EAccountType } from '@/resources/account/enums/AccountType';
import type { IAccount } from '@/resources/account/models/Account';
import { GET_ACCOUNTS_KEY, getAccountsService } from '@/resources/account/services/getAccounts';
import { useValidatedFormState } from '@/utils/state';

import { EManualEntryKind } from '../enums/ManualEntryKind';
import { createEntryService } from '../services/createEntry';

/** Os três tipos de lançamento avulso, cada um com as contas que fazem sentido para ele. */
const PRESETS: Record<EManualEntryKind, { label: string; debit: EAccountId; credit: EAccountId; memo: string }> = {
  [EManualEntryKind.EXPENSE]: { label: 'Despesa paga', debit: EAccountId.GENERAL_EXPENSES, credit: EAccountId.CASH, memo: 'Ex.: Material de limpeza' },
  [EManualEntryKind.CAPITAL]: { label: 'Aporte', debit: EAccountId.CASH, credit: EAccountId.CAPITAL, memo: 'Ex.: Aporte de novembro' },
  [EManualEntryKind.MANUAL]: { label: 'Manual', debit: EAccountId.CASH, credit: EAccountId.SALES_REVENUE, memo: 'O que este lançamento registra' },
};

const KIND_OPTIONS = Object.values(EManualEntryKind).map((kind) => ({ value: kind, label: PRESETS[kind].label }));

const createEntrySchema = yup.object({
  kind: yup.string().oneOf(Object.values(EManualEntryKind)).default(EManualEntryKind.EXPENSE).required(),
  memo: yup.string().default('').trim().required('Escreva o histórico do lançamento.'),
  amountCents: yup.number().nullable().default(null).test('required', 'Informe o valor.', (value) => value !== null && value !== undefined).min(1, 'O valor precisa ser maior que zero.'),
  debit: yup.string().default(String(PRESETS[EManualEntryKind.EXPENSE].debit)).required('Escolha a conta debitada.'),
  credit: yup
    .string()
    .default(String(PRESETS[EManualEntryKind.EXPENSE].credit))
    .required('Escolha a conta creditada.')
    .notOneOf([yup.ref('debit')], 'Débito e crédito precisam ser contas diferentes.'),
});

/** Cada tipo restringe as contas ao que faz sentido para ele. */
function accountChoices(kind: EManualEntryKind, accounts: IAccount[]) {
  switch (kind) {
    case EManualEntryKind.EXPENSE:
      return {
        debit: accounts.filter((account) => account.type === EAccountType.EXPENSE && account.id !== EAccountId.COGS),
        credit: accounts.filter((account) => account.id === EAccountId.CASH),
      };
    case EManualEntryKind.CAPITAL:
      return {
        debit: accounts.filter((account) => account.id === EAccountId.CASH),
        credit: accounts.filter((account) => account.type === EAccountType.EQUITY),
      };
    default:
      return { debit: accounts, credit: accounts };
  }
}

const accountLabel = (account: IAccount) => `${account.id} · ${account.name}`;

export function useCreateEntryLogicData({ onSuccess }: { onSuccess: () => void }) {
  const createEntryValidatedFormState = useValidatedFormState(createEntrySchema);

  const { data: accounts } = useQuery({ queryKey: GET_ACCOUNTS_KEY, queryFn: getAccountsService });

  const createEntryMutation = usePostingMutation({
    mutationFn: () => {
      const { kind, memo, amountCents, debit, credit } = createEntryValidatedFormState.state;

      return createEntryService({ body: { kind, memo: memo.trim(), amountCents: amountCents ?? 0, debit: Number(debit), credit: Number(credit) } });
    },
    pickPosting: (posting) => posting,
    onSettled: () => {
      createEntryReset();
      onSuccess();
    },
  });

  function createEntryReset() {
    createEntryValidatedFormState.reset();
    createEntryMutation.clearPostingError();
  }

  /** Trocar o tipo troca também as contas sugeridas. */
  function createEntryChooseKind(kind: EManualEntryKind) {
    const preset = PRESETS[kind];

    createEntryValidatedFormState.setState((state) => ({ ...state, kind, debit: String(preset.debit), credit: String(preset.credit) }));
    createEntryValidatedFormState.setErrors({});
  }

  return {
    createEntryValidatedFormState,
    createEntryMutation,
    createEntryReset,
    createEntryChooseKind,
    accounts: accounts ?? [],
  };
}

export function CreateEntryLogicComponent({
  logicData,
  opened,
  onClose,
}: {
  logicData: ReturnType<typeof useCreateEntryLogicData>;
  opened: boolean;
  onClose: () => void;
}) {
  const {
    createEntryValidatedFormState: {
      state: entryState,
      field: entryField,
      validate: entryValidate,
    },
    createEntryMutation: {
      mutate: createEntryMutate,
      isPending: createEntryIsPending,
      postingError: createEntryError,
    },
    createEntryChooseKind,
    accounts,
  } = logicData;

  const choices = accountChoices(entryState.kind, accounts);
  const nameOf = (id: string) => accounts.find((account) => String(account.id) === id)?.name ?? id;

  async function createEntry() {
    if (!(await entryValidate())) return;

    createEntryMutate();
  }

  return (
    <FormDrawer
      opened={opened}
      title="Novo lançamento"
      onClose={onClose}
      submitLabel="Lançar no livro-razão"
      busy={createEntryIsPending}
      error={createEntryError}
      onSubmit={createEntry}
    >
      <FormSegmentedControl
        fullWidth
        aria-label="Tipo de lançamento"
        data={KIND_OPTIONS}
        value={entryState.kind}
        onChange={(kind) => createEntryChooseKind(kind as EManualEntryKind)}
        className="col-span-12"
      />

      <FormTextInput
        label="Histórico"
        placeholder={PRESETS[entryState.kind].memo}
        {...entryField('memo')}
        required
        className="col-span-12"
      />

      <FormMoneyInput
        label="Valor"
        placeholder="0,00"
        {...entryField('amountCents')}
        required
        className="col-span-12"
      />

      <FormSelect
        label="Conta debitada"
        data={choices.debit}
        valueField="id"
        labelField={accountLabel}
        searchable
        {...entryField('debit')}
        onChange={(value) => value && entryField('debit').onChange(value)}
        className="col-span-12"
      />

      <FormSelect
        label="Conta creditada"
        data={choices.credit}
        valueField="id"
        labelField={accountLabel}
        searchable
        {...entryField('credit')}
        onChange={(value) => value && entryField('credit').onChange(value)}
        className="col-span-12"
      />

      <LedgerPostingPreview
        title="O que será lançado no livro-razão"
        className="col-span-12"
      >
        <LedgerLegPreview
          debit={nameOf(entryState.debit)}
          credit={nameOf(entryState.credit)}
          cents={entryState.amountCents ?? 0}
        />
      </LedgerPostingPreview>
    </FormDrawer>
  );
}
