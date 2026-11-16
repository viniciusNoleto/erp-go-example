import { Table } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import Link from 'next/link';

import { UtilsClip } from '@/components/utils/Clip';
import { UtilsIf } from '@/components/utils/If';
import { UtilsMoney } from '@/components/utils/Money';
import type { IAccount } from '@/resources/account/models/Account';
import { ROUTES } from '@/shared/constants/routes';
import { t } from '@/styles/table';
import { moneyFull } from '@/utils/format';

/** Uma conta do plano: a linha inteira leva ao razonete dela. */
export function AccountsAccountRow({ account, onOpen }: { account: IAccount; onOpen: () => void }) {
  return (
    <Table.Tr
      className={t.rowLink}
      onClick={onOpen}
    >
      <Table.Td
        className={t.num}
        c="dimmed"
      >
        {account.id}
      </Table.Td>

      <Table.Td className={t.clip}>
        <UtilsClip>
          <Link
            href={ROUTES.accountLedger(account.id)}
            onClick={(event) => event.stopPropagation()}
          >
            {account.name}
          </Link>
        </UtilsClip>

        <UtilsIf condition={account.noOverdraft}>
          {() => (
            <UtilsClip className={t.sub}>
              <IconLock
                size={11}
                className="mr-1 inline align-[-1px]"
              />

              Não pode ficar negativa

              <UtilsIf condition={account.reservedCents > 0}>
                {() => ` · ${moneyFull(account.reservedCents)} reservados`}
              </UtilsIf>
            </UtilsClip>
          )}
        </UtilsIf>
      </Table.Td>

      <Table.Td
        className={t.num}
        visibleFrom="md"
      >
        <UtilsMoney
          cents={account.debitsCents}
          muted={account.debitsCents === 0}
        />
      </Table.Td>

      <Table.Td
        className={t.num}
        visibleFrom="md"
      >
        <UtilsMoney
          cents={account.creditsCents}
          muted={account.creditsCents === 0}
        />
      </Table.Td>

      <Table.Td className={t.num}>
        <UtilsMoney
          cents={account.balanceCents}
          muted={account.balanceCents === 0}
        />
      </Table.Td>
    </Table.Tr>
  );
}
