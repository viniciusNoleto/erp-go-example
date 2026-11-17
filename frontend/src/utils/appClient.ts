/**
 * O cliente HTTP da API Go. Diferente de um envelope { success, data }, a API
 * devolve o próprio recurso no corpo, e os erros de negócio como
 * { error: { code, message } } com status 4xx/5xx.
 */

/** Erro devolvido pela API (ou a falta de conexão com ela). */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }

  /** O livro-razão (ou o estoque) recusou: vira a animação de recusa no palco. */
  get refused() {
    return this.code === 'insufficient_funds' || this.code === 'insufficient_stock';
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  let res: Response;

  try {
    res = await fetch(url, options);
  } catch (err) {
    // Requisição cancelada pelo TanStack Query: repassa o AbortError como veio.
    if (err instanceof DOMException && err.name === 'AbortError') throw err;

    throw new ApiError('offline', 'Sem conexão com o servidor. Confira se a API está no ar.');
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(data?.error?.code ?? 'internal', data?.error?.message ?? 'Algo deu errado. Tente de novo.');
  }

  return data as T;
}

export const appClient = {
  get<T>(url: string, options?: { signal?: AbortSignal }): Promise<T> {
    return request<T>(url, { signal: options?.signal });
  },
  post<T>(url: string, options: { body: unknown; signal?: AbortSignal }): Promise<T> {
    return request<T>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options.body),
      signal: options.signal,
    });
  },
};
