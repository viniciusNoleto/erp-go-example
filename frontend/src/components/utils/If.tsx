import type { ReactNode } from 'react';

export type UtilsIfProps =
  | {
      cases: Array<{
        condition?: boolean;
        content: () => ReactNode;
      }>;
      condition?: never;
      children?: never;
    }
  | {
      cases?: never;
      condition: unknown;
      children: () => ReactNode;
    };

/**
 * Renderização condicional sem `&&` nem ternário no JSX. `condition` + children
 * para "mostra ou não"; `cases` para if / else if / else.
 *
 * O else é o caso SEM a chave `condition`. Um `condition: undefined` (uma prop
 * opcional que não veio) conta como falso, e não como else.
 */
export function UtilsIf({ cases, condition, children }: UtilsIfProps): ReactNode {
  if (children) return condition ? children() : null;

  const match = cases!.find((c) => !('condition' in c) || c.condition);

  if (!match) return null;

  return match.content();
}
