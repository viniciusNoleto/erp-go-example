import { Skeleton } from '@mantine/core';

import { s } from '@/styles/screens';

/** Uma linha de lista enquanto os dados não chegam. */
export function OverviewSkeletonRow() {
  return (
    <li className={s.row}>
      <div>
        <Skeleton
          height={14}
          width="60%"
          radius={4}
        />

        <Skeleton
          height={10}
          width="40%"
          radius={4}
          mt={8}
        />
      </div>

      <Skeleton
        height={14}
        width={90}
        radius={4}
      />
    </li>
  );
}
