'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type DependencyList } from 'react';

function sameDeps(a: DependencyList, b: DependencyList) {
  return a.length === b.length && a.every((dep, index) => Object.is(dep, b[index]));
}

/**
 * Como `useEffect`, mas não roda na montagem — só quando alguma dependência muda.
 * Compara as deps com as da execução anterior (guardadas em ref), o que mantém
 * o comportamento no StrictMode, que monta, desmonta e remonta em dev.
 */
export function useNotFirstEffect(effect: () => void, deps: DependencyList) {
  const previousDeps = useRef<DependencyList | null>(null);

  useEffect(() => {
    const previous = previousDeps.current;
    previousDeps.current = deps;

    if (previous === null || sameDeps(previous, deps)) return;

    effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- as deps são as do chamador, repassadas como no useEffect.
  }, deps);
}

/**
 * Abre uma gaveta a partir da URL (/sales?new=1, vindo do atalho da visão
 * geral) e limpa o parâmetro em seguida, para o "voltar" não reabrir.
 */
export function useOpenFromQuery(key: string): [boolean, (open: boolean) => void] {
  const params = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!params.get(key)) return;

    setOpen(true);
    router.replace(window.location.pathname, { scroll: false });
  }, [params, key, router]);

  return [open, setOpen];
}

/**
 * Troca o título da aba ("{nome} | GoMoney") quando ele depende de dado da API,
 * como o nome da conta no razonete. O build é estático, então o metadata do
 * Next não conhece a conta: o título fixo do layout vale até o dado chegar.
 */
export function useDocumentTitle(name: string | undefined) {
  useEffect(() => {
    if (name) document.title = `${name} | GoMoney`;
  }, [name]);
}
