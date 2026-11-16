'use client';

import { NumberInput, type NumberInputProps } from '@mantine/core';

import { useNotFirstEffect } from '@/utils/hooks';

import type { FormInputPropsOnChange, FormInputPropsOnValidate } from './types';

export type FormMoneyInputProps = FormInputPropsOnChange<NumberInputProps, number | null> & FormInputPropsOnValidate;

/**
 * Campo de dinheiro em reais: aceita "1.234,56" do jeito que se digita no
 * Brasil, mostra o separador de milhar e devolve CENTAVOS (inteiro), que é
 * como a API e o TigerBeetle guardam dinheiro. Vazio vira null.
 */
export function FormMoneyInput({ value, onChange, onValidate, ...props }: FormMoneyInputProps) {
  useNotFirstEffect(() => {
    onValidate?.();
  }, [value]);

  return (
    <NumberInput
      {...props}
      value={value === null || value === undefined ? '' : value / 100}
      onChange={(next) => onChange?.(next === '' || next === null ? null : Math.round(Number(next) * 100))}
      onBlur={onValidate}
      decimalSeparator=","
      thousandSeparator="."
      decimalScale={2}
      fixedDecimalScale
      allowNegative={false}
      hideControls
      leftSection={<span className="text-13 text-muted">R$</span>}
      inputMode="decimal"
      classNames={{ input: 'tabular-nums' }}
    />
  );
}
