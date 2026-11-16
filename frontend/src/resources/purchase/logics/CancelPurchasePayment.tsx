'use client';

import { ActionIcon } from '@mantine/core';
import { IconX } from '@tabler/icons-react';

import { FormButton } from '@/components/form/Button';
import { usePostingMutation } from '@/components/stage/usePostingMutation';

import { cancelPurchasePaymentService } from '../services/cancelPurchasePayment';

/** Cancelar o pagamento agendado: a segunda fase que desfaz a reserva e libera o caixa. */
export function useCancelPurchasePaymentLogicData() {
  const cancelPurchasePaymentMutation = usePostingMutation({
    mutationFn: (purchaseId: number) => cancelPurchasePaymentService({ purchaseId }),
    pickPosting: (res) => res.posting,
  });

  return {
    cancelPurchasePaymentMutation,
  };
}

/** No desktop, "Cancelar" em texto; no celular, só o X (com nome acessível). */
export function CancelPurchasePaymentLogicComponent({
  logicData,
  purchaseId,
  disabled,
}: {
  logicData: ReturnType<typeof useCancelPurchasePaymentLogicData>;
  purchaseId: number;
  /** Outra ação da tela em andamento. */
  disabled?: boolean;
}) {
  const {
    cancelPurchasePaymentMutation: {
      mutate: cancelPurchasePaymentMutate,
      isPending: cancelPurchasePaymentIsPending,
      variables: cancelPurchasePaymentVariables,
    },
  } = logicData;

  const loading = cancelPurchasePaymentIsPending && cancelPurchasePaymentVariables === purchaseId;
  const cancel = () => cancelPurchasePaymentMutate(purchaseId);

  return (
    <>
      <FormButton
        variant="subtle"
        color="gray"
        size="xs"
        className="text-ink"
        visibleFrom="sm"
        disabled={disabled || cancelPurchasePaymentIsPending}
        loading={loading}
        onClick={cancel}
      >
        Cancelar
      </FormButton>

      <ActionIcon
        variant="default"
        size={30}
        hiddenFrom="sm"
        aria-label={`Cancelar o pagamento da compra nº ${purchaseId}`}
        disabled={disabled || cancelPurchasePaymentIsPending}
        loading={loading}
        onClick={cancel}
      >
        <IconX size={14} />
      </ActionIcon>
    </>
  );
}
