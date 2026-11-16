'use client';

import { Select, type SelectProps } from '@mantine/core';
import { useMemo } from 'react';

import { getter, type Hook } from '@/utils/data';
import { useNotFirstEffect } from '@/utils/hooks';

import type { FormInputPropsOnChange, FormInputPropsOnValidate } from './types';

export type FormSelectProps<T> = Omit<FormInputPropsOnChange<SelectProps, string | null>, 'data'> &
  FormInputPropsOnValidate & {
    /** Array de entidades (com valueField/labelField) ou dados no formato do Mantine. */
    data?: T[] | SelectProps['data'];
    valueField?: Hook<T>;
    labelField?: Hook<T>;
  };

export function FormSelect<T>({ value, onChange, onValidate, valueField, labelField, data, ...props }: FormSelectProps<T>) {
  useNotFirstEffect(() => {
    onValidate?.();
  }, [value]);

  const options = useMemo(() => {
    if (!Array.isArray(data)) return [];

    if (valueField || labelField) {
      return (data as T[]).map((item) => ({
        value: String(getter(item as object, valueField)),
        label: String(getter(item as object, labelField)),
      }));
    }

    return data as SelectProps['data'];
  }, [data, valueField, labelField]);

  return (
    <Select
      {...props}
      value={value ?? null}
      data={options}
      onChange={(next) => onChange?.(next)}
      onBlur={onValidate}
      onDropdownClose={onValidate}
    />
  );
}
