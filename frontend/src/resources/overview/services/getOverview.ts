import { appClient } from '@/utils/appClient';
import type { QueryFnCtx } from '@/shared/types/tanstack';
import type { IOverview } from '../models/Overview';

export const GET_OVERVIEW_KEY = ['get-overview'];

export function getOverviewService({ signal }: QueryFnCtx) {
  return appClient.get<IOverview>('/api/overview', { signal });
}
