'use client';

import { Button } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

/** Falha ao carregar um bloco: a mensagem e o "tentar de novo", dentro do próprio bloco. */
export function UtilsFail({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <div
      className="mx-6 mb-5 flex items-center justify-between gap-4 text-14 max-sm:mx-4 max-sm:mb-4"
      role="alert"
    >
      <span className="flex items-center gap-2">
        <IconAlertCircle
          size={16}
          stroke={1.6}
          className="text-negative"
        />

        {error instanceof Error ? error.message : 'Não foi possível carregar.'}
      </span>

      <Button
        variant="subtle"
        color="ink"
        size="xs"
        onClick={retry}
      >
        Tentar de novo
      </Button>
    </div>
  );
}
