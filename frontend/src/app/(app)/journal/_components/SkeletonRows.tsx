import { Skeleton, Table } from '@mantine/core';

import { nFor, UtilsFor } from '@/components/utils/For';

/** As linhas do diário enquanto ele carrega, com as mesmas colunas visíveis por tamanho de tela. */
export function JournalSkeletonRows() {
  return (
    <UtilsFor each={nFor(8)}>
      {() => (
        <Table.Tr>
          <Table.Td>
            <Skeleton
              height={12}
              width={60}
              radius={4}
            />
          </Table.Td>

          <Table.Td>
            <Skeleton
              height={12}
              width="70%"
              radius={4}
            />
          </Table.Td>

          <Table.Td visibleFrom="md">
            <Skeleton
              height={12}
              width="60%"
              radius={4}
            />
          </Table.Td>

          <Table.Td visibleFrom="md">
            <Skeleton
              height={12}
              width="60%"
              radius={4}
            />
          </Table.Td>

          <Table.Td>
            <Skeleton
              height={12}
              width={80}
              radius={4}
              ml="auto"
            />
          </Table.Td>
        </Table.Tr>
      )}
    </UtilsFor>
  );
}
