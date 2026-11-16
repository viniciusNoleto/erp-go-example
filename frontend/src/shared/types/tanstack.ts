/** O contexto que o TanStack Query passa ao queryFn (o signal cancela a requisição). */
export type QueryFnCtx = {
  signal?: AbortSignal;
};
