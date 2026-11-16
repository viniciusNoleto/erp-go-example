'use client';

import { FormButton } from '@/components/form/Button';
import { usePostingMutation } from '@/components/stage/usePostingMutation';

import { receiveSaleService } from '../services/receiveSale';

/** Receber a venda: leva o valor de clientes a receber para o caixa. */
export function useReceiveSaleLogicData() {
  const receiveSaleMutation = usePostingMutation({
    mutationFn: (saleId: number) => receiveSaleService({ saleId }),
    pickPosting: (res) => res.posting,
  });

  return {
    receiveSaleMutation,
  };
}

/** O botão "Receber" na linha da venda; o carregando aparece só no botão da venda enviada. */
export function ReceiveSaleLogicComponent({
  logicData,
  saleId,
  disabled,
}: {
  logicData: ReturnType<typeof useReceiveSaleLogicData>;
  saleId: number;
  /** Outra ação da tela em andamento. */
  disabled?: boolean;
}) {
  const {
    receiveSaleMutation: {
      mutate: receiveSaleMutate,
      isPending: receiveSaleIsPending,
      variables: receiveSaleVariables,
    },
  } = logicData;

  return (
    <FormButton
      variant="default"
      size="xs"
      fullWidth
      loading={receiveSaleIsPending && receiveSaleVariables === saleId}
      disabled={disabled || receiveSaleIsPending}
      onClick={() => receiveSaleMutate(saleId)}
    >
      Receber
    </FormButton>
  );
}
