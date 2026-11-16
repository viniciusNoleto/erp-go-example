---
paths:
  - "frontend/**"
---

# Componentes utilitários (`components/utils/`)

## UtilsIf — renderização condicional

Substitui `{cond && <X />}` e ternários que escolhem o que renderizar. `children`/`content` são sempre **render functions**.

```tsx
<UtilsIf condition={isLoading}>
  {() => <UtilsSkeletonRows />}
</UtilsIf>

<UtilsIf
  cases={[
    {
      condition: !!error,
      content: () => <UtilsFail error={error} retry={refetch} />,
    },
    {
      condition: list.length === 0,
      content: () => <UtilsEmpty>Nada ainda.</UtilsEmpty>,
    },
    {
      // sem a chave condition = else
      content: () => <Table>...</Table>,
    },
  ]}
/>
```

- O **else** é o caso **sem a chave** `condition`. `condition: undefined` conta como falso — mesmo assim, passe sempre um booleano (`!!data`), nunca uma prop opcional crua.
- Nunca misture `condition` e `cases` no mesmo `UtilsIf`.
- Ternário continua valendo em **valores** de props e strings (`className={a ? x : y}`, `{data ? plural(...) : ''}`); o `UtilsIf` é para escolher **o que renderizar**.

## UtilsFor — iteração no JSX

Substitui `.map()` no JSX. `eachKey` dá a key (padrão: o índice); `empty` é o fallback da lista vazia. `nFor(n)` gera `[0..n-1]` para repetir esqueletos.

```tsx
<UtilsFor
  each={sales}
  eachKey={({ item }) => item.id}
>
  {({ item: sale }) => (
    <Table.Tr>...</Table.Tr>
  )}
</UtilsFor>
```

Exceção: filhos de `<AnimatePresence>` (ver `frontend-tsx-patterns.md`).

## Blocos de tela

| Componente | Para quê |
|---|---|
| `UtilsPanel` | O bloco branco de toda tela: `title`, `meta` (nota à direita), `flush` (sem recuo, para tabelas e listas), `label` (nome acessível sem título) |
| `UtilsEmpty` | Bloco vazio: mantém a moldura e diz numa frase o que vai aparecer ali |
| `UtilsFail` | Falha ao carregar um bloco: a mensagem e "Tentar de novo" (`retry={refetch}`) |
| `UtilsProof` / `UtilsProofIcon` | A prova de que os números fecham: visto verde ou alerta vermelho (`ok`) + a frase |
| `UtilsSkeletonRows` | Linhas cinzas da tabela enquanto carrega (`rows`, `cols`) |
| `UtilsMoney` | Dinheiro: "R$" pequeno e cinza, número tabular, sinal de menos tipográfico (`cents`, `sign`, `muted`) |
| `UtilsStatus` | Selo de situação: `tone` = `wait` (pede ação), `ok`, `off`, `bad` |
| `UtilsClip` | Texto de uma linha com reticências; mostra o texto inteiro no hover quando corta |

E em `components/layout/`: `AppPageHeader` (título serifado + frase com o fato principal em `<strong>` + `actions` + `back`), e `AppFrame` (a casca, usada só no layout).
