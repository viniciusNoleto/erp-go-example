'use client';

import { Alert, Button, Drawer, Group, Stack, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import type { ReactNode } from 'react';

import { UtilsIf } from '@/components/utils/If';

import { Form } from './Form';

type FormDrawerProps = {
  opened: boolean;
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
  busy?: boolean;
  /** Erro da API que não é de um campo (os dos campos aparecem em cada campo). */
  error?: string | null;
  /** O resumo à esquerda do botão (total, margem). */
  summary?: ReactNode;
  children: ReactNode;
};

/**
 * A gaveta dos formulários (nova venda, nova compra, novo lançamento…): abre
 * pela direita, prende o foco e fecha no Esc (tudo do Drawer do Mantine). Em
 * cima, os campos; embaixo, um resumo e o botão que grava.
 */
export function FormDrawer({ opened, title, onClose, onSubmit, submitLabel, busy, error, summary, children }: FormDrawerProps) {
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={title}
      classNames={{
        title: 'font-serif text-26 leading-[1.1] font-normal',
        header: 'pb-2',
        body: 'flex min-h-[calc(100%-72px)] flex-col',
      }}
      closeButtonProps={{ 'aria-label': 'Fechar' }}
    >
      <Form
        onSubmit={onSubmit}
        className="flex flex-1 flex-col gap-6"
      >
        <Stack
          gap="md"
          className="flex-1"
        >
          <div className="form-grid">
            {children}
          </div>

          <UtilsIf condition={error}>
            {() => (
              <Alert
                color="red"
                variant="light"
                icon={<IconAlertCircle size={16} />}
                role="alert"
              >
                {error}
              </Alert>
            )}
          </UtilsIf>
        </Stack>

        <Group
          justify="space-between"
          wrap="nowrap"
          pt="md"
          className="sticky bottom-0 border-t border-line bg-surface pb-1"
        >
          <Text
            size="sm"
            c="dimmed"
          >
            {summary}
          </Text>

          <Button
            type="submit"
            loading={busy}
          >
            {submitLabel}
          </Button>
        </Group>
      </Form>
    </Drawer>
  );
}
