---
paths:
  - "frontend/**"
---

# Componentes de formulário (`components/form/`)

Wrappers finos do Mantine. Diferença principal: **`onChange` recebe o valor já extraído**, não o evento, e todos aceitam `onValidate` (chamado quando o valor muda e no blur). Por isso o spread de `field(path)` do `useValidatedFormState` funciona direto.

| Componente | Import | Valor |
|---|---|---|
| `Form` | `@/components/form/Form` | `onSubmit()` sem evento; o `preventDefault` já é feito |
| `FormDrawer` | `@/components/form/Drawer` | a gaveta de criação (abaixo) |
| `FormTextInput` | `@/components/form/TextInput` | `string`; `mask` filtra o digitado (`(v) => v.replace(/\D/g, '')`) |
| `FormNumberInput` | `@/components/form/NumberInput` | `number` |
| `FormMoneyInput` | `@/components/form/MoneyInput` | `number \| null` em **centavos**; aceita "1.234,56" |
| `FormSelect` | `@/components/form/Select` | `string \| null`; `data` com `valueField`/`labelField` (campo ou função) ou no formato do Mantine |
| `FormSegmentedControl` | `@/components/form/SegmentedControl` | `string` |
| `FormItemLines` | `@/components/form/ItemLines` | `FormItemLine[]` (itens de venda/compra; `withCost` liga o custo unitário) |
| `FormButton` | `@/components/form/Button` | botão com `tooltip`, `leftIcon`/`rightIcon` (ícone do `@tabler/icons-react`) e `label` |

Botão que é link (`component={Link}`) usa o `Button` do Mantine direto: o `FormButton` não é polimórfico.

## FormDrawer — a gaveta de criação

Todo formulário de criação abre numa gaveta à direita. Ela já tem o `Form`, a grade dos campos, o alerta de erro da API e o rodapé com o resumo e o botão de enviar:

```tsx
<FormDrawer
  opened={opened}
  title="Nova venda"
  onClose={onClose}
  submitLabel="Faturar venda"
  busy={createSaleIsPending}
  error={createSaleError}
  summary={total > 0 ? `Margem de ${percent(margin)}` : null}
  onSubmit={createSale}
>
  <FormTextInput
    label="Cliente"
    {...saleField('customer')}
    required
    className="col-span-12"
  />
</FormDrawer>
```

## Grade — `form-grid`

Os filhos da gaveta ficam numa `.form-grid` (`styles/globals.css`: 12 colunas, gap de 16px). Regras:

- Todo filho direto declara o span, inclusive `col-span-12`.
- As colunas da grade nunca mudam; a responsividade vem só do span (`col-span-12 sm:col-span-6`).
- A gaveta é estreita (480px): um campo por linha, tudo `col-span-12`. Lado a lado só em formulário grande.
- Nada de grid ad-hoc (`grid grid-cols-2`) nem `flex-wrap` com larguras fixas para dispor campos.
