'use client';

import { SegmentedControl, type SegmentedControlProps } from '@mantine/core';

import { useNotFirstEffect } from '@/utils/hooks';

import type { FormInputPropsOnChange, FormInputPropsOnValidate } from './types';

export type FormSegmentedControlProps = FormInputPropsOnChange<SegmentedControlProps, string> & FormInputPropsOnValidate;

export function FormSegmentedControl({ value, onChange, onValidate, ...props }: FormSegmentedControlProps) {
  useNotFirstEffect(() => {
    onValidate?.();
  }, [value]);

  return (
    <SegmentedControl
      value={value}
      {...props}
      onChange={(next) => onChange?.(next)}
    />
  );
}
