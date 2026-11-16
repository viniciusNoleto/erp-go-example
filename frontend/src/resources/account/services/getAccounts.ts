import { appClient } from '@/utils/appClient';
import type { QueryFnCtx } from '@/shared/types/tanstack';
import type { IAccount } from '../models/Account';

export const GET_ACCOUNTS_KEY = ['get-accounts'];

export function getAccountsService({ signal }: QueryFnCtx) {
  return appClient.get<IAccount[]>('/api/accounts', { signal });
}
