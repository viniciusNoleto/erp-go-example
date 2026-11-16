import { appClient } from '@/utils/appClient';
import type { PayloadBody } from '@/shared/types/api';
import type { EAccountType } from '../enums/AccountType';
import type { IAccount } from '../models/Account';

export type CreateAccountServicePayload = {
  id: number;
  name: string;
  type: EAccountType;
};

export function createAccountService({ body }: PayloadBody<CreateAccountServicePayload>) {
  return appClient.post<IAccount>('/api/accounts', { body });
}
