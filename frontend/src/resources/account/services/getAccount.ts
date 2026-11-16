import { appClient } from '@/utils/appClient';
import type { QueryFnCtx } from '@/shared/types/tanstack';
import type { IAccountDetail } from '../models/Account';

export const GET_ACCOUNT_KEY = (accountId: number) => ['get-account', accountId];

export function getAccountService({ signal, accountId }: QueryFnCtx & { accountId: number }) {
  return appClient.get<IAccountDetail>(`/api/accounts/${accountId}`, { signal });
}
