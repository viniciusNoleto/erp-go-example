/** Troca o onChange(evento) do Mantine por onChange(valor já extraído). */
export type FormInputPropsOnChange<T extends object = object, U = any> = Omit<T, 'onChange' | 'value'> & {
  onChange?: (value: U) => any;
  value?: U;
};

/** O gancho de validação individual do useValidatedFormState. */
export type FormInputPropsOnValidate = {
  onValidate?: () => any;
};
