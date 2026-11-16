'use client';

import { Button, Tooltip, type ButtonProps } from '@mantine/core';
import type { MouseEventHandler, ReactNode } from 'react';

import { UtilsIf } from '@/components/utils/If';

export type FormButtonProps = ButtonProps & {
  /** Texto do botão (alternativa a children). */
  label?: string;
  /** Texto do Tooltip que envolve o botão; vira também o nome acessível do botão só de ícone. */
  tooltip?: string;
  /** Ícone à esquerda (um ícone do @tabler/icons-react). */
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  type?: 'button' | 'submit' | 'reset';
  onClick?: MouseEventHandler<HTMLButtonElement>;
  'aria-label'?: string;
};

export function FormButton({ label, tooltip, leftIcon, rightIcon, children, ...props }: FormButtonProps) {
  const button = (
    <Button
      {...props}
      leftSection={leftIcon ?? props.leftSection}
      rightSection={rightIcon ?? props.rightSection}
    >
      {children ?? label}
    </Button>
  );

  return (
    <UtilsIf
      cases={[
        {
          condition: !!tooltip,
          content: () => (
            <Tooltip label={tooltip}>
              {button}
            </Tooltip>
          ),
        },
        {
          content: () => button,
        },
      ]}
    />
  );
}
