'use client';

import { FormButton } from '@/components/form/Button';
import { usePostingMutation } from '@/components/stage/usePostingMutation';

import { schedulePurchasePaymentService } from '../services/schedulePurchasePayment';

/** Agendar o pagamento: a primeira fase, que reserva o valor no caixa. */
export function useSchedulePurchasePaymentLogicData() {
  const schedulePurchasePaymentMutation = usePostingMutation({
    mutationFn: (purchaseId: number) => schedulePurchasePaymentService({ purchaseId }),
    pickPosting: (res) => res.posting,
  });

  return {
    schedulePurchasePaymentMutation,
  };
}

export function SchedulePurchasePaymentLogicComponent({
  logicData,
  purchaseId,
  disabled,
  short,
}: {
  logicData: ReturnType<typeof useSchedulePurchasePaymentLogicData>;
  purchaseId: number;
  /** Outra ação da tela em andamento. */
  disabled?: boolean;
  /** Só "Agendar" (listas estreitas); senão "Agendar pagamento" no desktop. */
  short?: boolean;
}) {
  const {
    schedulePurchasePaymentMutation: {
      mutate: schedulePurchasePaymentMutate,
      isPending: schedulePurchasePaymentIsPending,
      variables: schedulePurchasePaymentVariables,
    },
  } = logicData;

  return (
    <FormButton
      variant="default"
      size="xs"
      fullWidth
      loading={schedulePurchasePaymentIsPending && schedulePurchasePaymentVariables === purchaseId}
      disabled={disabled || schedulePurchasePaymentIsPending}
      onClick={() => schedulePurchasePaymentMutate(purchaseId)}
    >
      Agendar

      <span className={short ? 'hidden' : 'max-sm:hidden'}>
        &nbsp;pagamento
      </span>
    </FormButton>
  );
}
