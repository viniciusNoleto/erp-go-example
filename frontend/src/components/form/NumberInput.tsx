'use client';

import { NumberInput, type NumberInputProps } from '@mantine/core';

import { useNotFirstEffect } from '@/utils/hooks';

import type { FormInputPropsOnChange, FormInputPropsOnValidate } from './types';

export type FormNumberInputProps = FormInputPropsOnChange<NumberInputProps, number> & FormInputPropsOnValidate;

/** Campo numérico: onChange recebe number (vazio vira 0). */
export function FormNumberInput({ value, onChange, onValidate, ...props }: FormNumberInputProps) {
  useNotFirstEffect(() => {
    onValidate?.();
  }, [value]);

  return (
    <NumberInput
      {...props}
      value={value}
      onChange={(next) => onChange?.(Number(next) || 0)}
      onBlur={onValidate}
    />
  );
}
