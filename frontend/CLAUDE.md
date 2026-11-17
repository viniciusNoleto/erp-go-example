# Front-end (Next + Mantine + Tailwind)

As regras do front ficam em `../.claude/rules/frontend-*.md` e carregam sozinhas ao mexer em `frontend/**`. Cada uma documenta a interface exata e o padrão de um componente ou convenção. **Não infira a API pelo nome do componente**: os wrappers divergem do Mantine puro (ex.: `onChange` recebe o valor já extraído, não o evento). Leia a regra **antes** de escrever ou revisar código que toque no assunto.

| Ao mexer em... | Leia |
|---|---|
| Qualquer `.tsx` | `frontend-tsx-patterns.md` (atributos em linha própria, texto em linha própria, linha em branco entre irmãos) |
| Rotas, links, query string | `frontend-routes.md` (rotas **sempre em inglês**, `ROUTES`) |
| Onde criar um arquivo | `frontend-file-organization.md` (`components/{contexto}`, `_components`, `resources/`) |
| `&&`/ternário de renderização, `.map()` no JSX, painéis, dinheiro, selos | `frontend-components-utils.md` (`UtilsIf`, `UtilsFor`, `UtilsPanel`…) |
| Campos, gaveta de criação, grade do formulário | `frontend-components-form.md` |
| Formulário com validação | `frontend-validated-form.md` (Yup + `useValidatedFormState`) |
| `resources/*/models` | `frontend-resources-models.md` e `frontend-api-format.md` |
| `resources/*/enums` | `frontend-resources-enums.md` |
| `resources/*/services` | `frontend-resources-services.md` |
| `resources/*/logics` | `frontend-resources-logic.md` (hook + componente; `usePostingMutation` para o que grava no livro-razão) |

O visual segue o tema de `src/theme.ts` e os tokens de `src/tokens.ts` (o mesmo arquivo que o Tailwind lê). O único CSS é `src/styles/globals.css`.
