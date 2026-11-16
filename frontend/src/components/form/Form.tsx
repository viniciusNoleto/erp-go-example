import type { ComponentPropsWithoutRef, ReactNode } from 'react';

export type FormProps = Omit<ComponentPropsWithoutRef<'form'>, 'onSubmit'> & {
  children: ReactNode;
  /** Sem evento: o preventDefault já é feito aqui. */
  onSubmit?: () => void;
};

export function Form({ children, onSubmit, ...props }: FormProps) {
  return (
    <form
      noValidate
      {...props}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
    >
      {children}
    </form>
  );
}
