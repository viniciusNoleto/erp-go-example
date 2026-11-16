---
paths:
  - "frontend/**"
---

# Formulário validado — useValidatedFormState + Yup

`useValidatedFormState(schema)` (`src/utils/state.ts`) guarda o estado do formulário e os erros por campo. Use em todo formulário que envia para a API (na prática, dentro de um logic — ver `frontend-resources-logic.md`).

## Regras

- Schema Yup declarado fora do componente, `{acao}Schema` em camelCase, com `.default()` em todo campo (é dele que sai o estado inicial e o `reset()`).
- Mensagens de erro em português, escritas no próprio schema (`.required('Informe o cliente.')`); nada de mensagem padrão do Yup em inglês.
- Desestruture com o prefixo da ação, nunca `state`/`field` genéricos.
- Validação na função de submit, **antes** do `mutate()` — nunca dentro do `mutationFn`.
- `setValue(path, '')` para limpar texto, nunca `undefined`.
- Dinheiro é `yup.number().nullable().default(null)` (centavos; vazio = `null`), com `.test('required', ...)` em vez de `.required()` para o tipo continuar `number | null` e casar com o `FormMoneyInput`.
- Campo de lista (itens da venda) é `yup.mixed<FormItemLine[]>().default(() => []).required()` com `.test(...)` por regra; o erro aparece no próprio `FormItemLines`.
- Campo que depende de outro (débito ≠ crédito) usa `yup.ref` ou `.test` com `this.parent`.

## O que o hook devolve

```ts
const {
  state: saleState,       // o objeto do formulário
  setState: saleSetState, // troca vários campos de uma vez (ex.: trocar o tipo troca as contas)
  field: saleField,       // spread no input: { value, onChange, error, onValidate }
  setValue: saleSetValue, // um campo, imperativamente
  setErrors: saleSetErrors,
  validate: saleValidate, // Promise<boolean>
  reset: saleReset,       // volta ao default do schema e limpa os erros
} = useValidatedFormState(createSaleSchema);
```

`field(path)` já traz `onValidate`, chamado pelos componentes de `components/form` quando o valor muda e no blur. `required` é separado (é o asterisco visual do Mantine, não vem do Yup).
