import { appClient } from '@/utils/appClient';
import type { PayloadQuery } from '@/shared/types/api';
import type { QueryFnCtx } from '@/shared/types/tanstack';
import type { IEntry } from '../models/Entry';

export type GetEntriesServiceQuery = {
  limit?: number;
};

/** A chave leva o limite: a visão geral (5) e o diário (200) são consultas diferentes. */
export const GET_ENTRIES_KEY = (limit: number) => ['get-entries', limit];

export function getEntriesService({ signal, query }: QueryFnCtx & PayloadQuery<GetEntriesServiceQuery>) {
  const params = new URLSearchParams();

  if (query?.limit) params.set('limit', String(query.limit));

  const qs = params.toString();

  return appClient.get<IEntry[]>(`/api/journal${qs ? `?${qs}` : ''}`, { signal });
}
