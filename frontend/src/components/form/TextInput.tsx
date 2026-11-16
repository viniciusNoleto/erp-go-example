'use client';

import { TextInput, type TextInputProps } from '@mantine/core';

import { useNotFirstEffect } from '@/utils/hooks';

import type { FormInputPropsOnChange, FormInputPropsOnValidate } from './types';

export type FormTextInputProps = FormInputPropsOnChange<TextInputProps, string> &
  FormInputPropsOnValidate & {
    /** Filtra o texto digitado antes de guardar (ex.: só dígitos). */
    mask?: (value: string) => string;
  };

export function FormTextInput({ value, onChange, onValidate, mask, ...props }: FormTextInputProps) {
  useNotFirstEffect(() => {
    onValidate?.();
  }, [value]);

  return (
    <TextInput
      value={value ?? ''}
      {...props}
      onChange={(event) => onChange?.(mask ? mask(event.currentTarget.value) : event.currentTarget.value)}
      onBlur={onValidate}
    />
  );
}
