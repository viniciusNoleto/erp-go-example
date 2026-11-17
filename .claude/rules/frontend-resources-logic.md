---
paths:
  - "frontend/**"
---

# Resources — Logics

Um Logic encapsula **uma ação sobre um recurso**: hook com estado + mutação, e o componente de UI. Fica em `resources/{recurso}/logics/{Acao}.tsx`, um arquivo por ação, e exporta duas coisas:

1. `use{Acao}LogicData(...)` — estado, mutação e helpers;
2. `{Acao}LogicComponent({ logicData, ... })` — a UI, que recebe o retorno do hook.

```
resources/purchase/logics/
├── CreatePurchase.tsx            gaveta de formulário
├── SchedulePurchasePayment.tsx   botão de linha
├── ConfirmPurchasePayment.tsx    botão de linha
└── CancelPurchasePayment.tsx     botão de linha
```

## Mutação que grava no livro-razão → `usePostingMutation`

Toda ação que gera lançamento (venda, compra, recebimento, pagamento, lançamento avulso) usa `usePostingMutation` (`components/stage/usePostingMutation.ts`) no lugar do `useMutation`. Ele devolve o próprio objeto do `useMutation` e acrescenta `postingError`:

- sucesso → toca a cena no palco (que também invalida as consultas) e chama `onSettled`;
- recusa do livro-razão (`ApiError.refused`) → toca a cena de recusa e chama `onSettled`;
- outro erro → guarda a mensagem em `postingError` para a gaveta mostrar.

Ação que não grava no livro-razão (criar conta, criar produto) usa `useMutation` e invalida as queries no `onSuccess`.

## Padrão 1 — Ação de linha (sem formulário)

O hook recebe o id pela variável da mutação; o componente é o botão e mostra o carregando só na linha enviada.

```tsx
export function useReceiveSaleLogicData() {
  const receiveSaleMutation = usePostingMutation({
    mutationFn: (saleId: number) => receiveSaleService({ saleId }),
    pickPosting: (res) => res.posting,
  });

  return {
    receiveSaleMutation,
  };
}

export function ReceiveSaleLogicComponent({ logicData, saleId, disabled }: { logicData: ReturnType<typeof useReceiveSaleLogicData>; saleId: number; disabled?: boolean }) {
  const {
    receiveSaleMutation: {
      mutate: receiveSaleMutate,
      isPending: receiveSaleIsPending,
      variables: receiveSaleVariables,
    },
  } = logicData;

  return (
    <FormButton
      variant="default"
      size="xs"
      loading={receiveSaleIsPending && receiveSaleVariables === saleId}
      disabled={disabled || receiveSaleIsPending}
      onClick={() => receiveSaleMutate(saleId)}
    >
      Receber
    </FormButton>
  );
}
```

A tela instancia o hook **uma vez** e passa o mesmo `logicData` para o componente de cada linha. Quando a tela tem várias ações, ela calcula `busy` (qualquer `isPending`) e passa em `disabled`.

## Padrão 2 — Ação com formulário (create)

O `LogicComponent` de formulário **é a gaveta**: renderiza `FormDrawer` e recebe `opened`/`onClose` da tela. Schema Yup fora do componente; validação na função de submit, antes do `mutate` (ver `frontend-validated-form.md`).

```tsx
const createProductSchema = yup.object({
  sku: yup.string().default('').trim().required('Informe o código do produto.'),
  priceCents: yup.number().nullable().default(null).test('required', 'Informe o preço de venda.', (value) => value !== null && value !== undefined),
});

export function useCreateProductLogicData({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const createProductValidatedFormState = useValidatedFormState(createProductSchema);

  const createProductMutation = useMutation({
    mutationFn: () => createProductService({ body: { ... } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GET_PRODUCTS_KEY });
      createProductReset();
      onSuccess();
    },
  });

  function createProductReset() {
    createProductValidatedFormState.reset();
    createProductMutation.reset();
  }

  return {
    createProductValidatedFormState,
    createProductMutation,
    createProductReset,
  };
}

export function CreateProductLogicComponent({ logicData, opened, onClose }: { logicData: ReturnType<typeof useCreateProductLogicData>; opened: boolean; onClose: () => void }) {
  const {
    createProductValidatedFormState: {
      field: productField,
      validate: productValidate,
    },
    createProductMutation: {
      mutate: createProductMutate,
      isPending: createProductIsPending,
      error: createProductError,
    },
  } = logicData;

  async function createProduct() {
    if (!(await productValidate())) return;

    createProductMutate();
  }

  return (
    <FormDrawer
      opened={opened}
      title="Novo produto"
      onClose={onClose}
      submitLabel="Cadastrar"
      busy={createProductIsPending}
      error={createProductError?.message}
      onSubmit={createProduct}
    >
      <FormTextInput
        label="Código"
        {...productField('sku')}
        required
        className="col-span-12"
      />
    </FormDrawer>
  );
}
```

Dados que o formulário consulta (produtos, contas) são buscados no hook e devolvidos junto (`products`, `accounts`).

## Como consumir na tela

```tsx
const [createSaleOpened, setCreateSaleOpened] = useOpenFromQuery(OPEN_CREATE_PARAM);
const createSaleLogicData = useCreateSaleLogicData({ onSuccess: () => setCreateSaleOpened(false) });

function openCreateSale() {
  createSaleLogicData.createSaleReset();
  setCreateSaleOpened(true);
}

<CreateSaleLogicComponent
  logicData={createSaleLogicData}
  opened={createSaleOpened}
  onClose={() => setCreateSaleOpened(false)}
/>
```

## Nomenclatura

| Elemento | Padrão | Exemplo |
|---|---|---|
| Arquivo | `{Acao}.tsx` | `SchedulePurchasePayment.tsx` |
| Hook | `use{Acao}LogicData` | `useSchedulePurchasePaymentLogicData` |
| Componente | `{Acao}LogicComponent` | `SchedulePurchasePaymentLogicComponent` |
| Campos do retorno | `{acao}{Tipo}` | `createSaleMutation`, `createSaleReset`, `createSaleValidatedFormState` |
| Props | inline, com `ReturnType<typeof use...LogicData>` | — |

## Regras

- Um arquivo por ação; nunca agrupe ações.
- O hook não conhece o componente; o componente não tem mutação própria. `onSuccess`/`onError` ficam no hook.
- Desestruture `isPending`, `mutate` etc. com o prefixo da ação (`createSaleIsPending`) para não colidir quando a tela usa vários logics.
- Schema usado por mais de um logic vai para `resources/{recurso}/schemas/`; exclusivo, fica inline no logic.
