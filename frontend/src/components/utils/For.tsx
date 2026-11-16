import { Fragment, type Key, type ReactNode } from 'react';

export type UtilsForProps<T> = {
  each: readonly T[];
  children: (ctx: { item: T; index: number }) => ReactNode;
  eachKey?: (ctx: { item: T; index: number }) => Key;
  empty?: ReactNode;
};

/** Uma lista de 0 a n−1: para repetir esqueletos de carregamento. */
export const nFor = (n: number) => Array.from({ length: n }, (_, i) => i);

/** Iteração de array no JSX, com chave e fallback para a lista vazia. */
export function UtilsFor<T>({ each = [], eachKey = ({ index }) => index, children, empty }: UtilsForProps<T>) {
  if (!Array.isArray(each) || each.length === 0) return empty ?? null;

  return (
    <>
      {each.map((item, index) => (
        <Fragment key={eachKey({ item, index })}>
          {children({ item, index })}
        </Fragment>
      ))}
    </>
  );
}
