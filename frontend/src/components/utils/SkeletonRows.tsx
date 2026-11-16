'use client';

import { Skeleton, Table } from '@mantine/core';

import { nFor, UtilsFor } from './For';

/** Enquanto a tabela carrega: barras cinzas no tamanho das linhas reais (nada pula quando os dados chegam). */
export function UtilsSkeletonRows({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <UtilsFor each={nFor(rows)}>
      {() => (
        <Table.Tr>
          <UtilsFor each={nFor(cols)}>
            {({ index }) => (
              <Table.Td>
                <Skeleton
                  height={12}
                  width={index === 1 ? '70%' : '60%'}
                  radius={4}
                />
              </Table.Td>
            )}
          </UtilsFor>
        </Table.Tr>
      )}
    </UtilsFor>
  );
}
