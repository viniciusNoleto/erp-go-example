'use client';

import { FormButton } from '@/components/form/Button';
import { usePostingMutation } from '@/components/stage/usePostingMutation';

import { confirmPurchasePaymentService } from '../services/confirmPurchasePayment';

/** Confirmar o pagamento: a segunda fase, que efetiva a reserva (o dinheiro sai do caixa). */
export function useConfirmPurchasePaymentLogicData() {
  const confirmPurchasePaymentMutation = usePostingMutation({
    mutationFn: (purchaseId: number) => confirmPurchasePaymentService({ purchaseId }),
    pickPosting: (res) => res.posting,
  });

  return {
    confirmPurchasePaymentMutation,
  };
}

export function ConfirmPurchasePaymentLogicComponent({
  logicData,
  purchaseId,
  disabled,
  variant = 'filled',
  fullWidth,
}: {
  logicData: ReturnType<typeof useConfirmPurchasePaymentLogicData>;
  purchaseId: number;
  /** Outra ação da tela em andamento. */
  disabled?: boolean;
  variant?: 'filled' | 'default';
  /** Ocupa a coluna inteira (listas da visão geral); na tabela de compras divide a linha com o Cancelar. */
  fullWidth?: boolean;
}) {
  const {
    confirmPurchasePaymentMutation: {
      mutate: confirmPurchasePaymentMutate,
      isPending: confirmPurchasePaymentIsPending,
      variables: confirmPurchasePaymentVariables,
    },
  } = logicData;

  return (
    <FormButton
      variant={variant}
      size="xs"
      fullWidth={fullWidth}
      className="flex-1"
      loading={confirmPurchasePaymentIsPending && confirmPurchasePaymentVariables === purchaseId}
      disabled={disabled || confirmPurchasePaymentIsPending}
      onClick={() => confirmPurchasePaymentMutate(purchaseId)}
    >
      Confirmar
    </FormButton>
  );
}
