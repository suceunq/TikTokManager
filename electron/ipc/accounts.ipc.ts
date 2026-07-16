import { IPC } from '../../shared/ipc-contract';
import type { NouveauCompte } from '../../shared/types';
import * as accountsRepo from '../db/accounts.repo';
import { handle } from './helpers';
import { validateAccount, validateId } from '../validation';

export function registerAccountsIpc(): void {
  handle(IPC.ACCOUNTS.LIST, () => accountsRepo.list());

  handle(IPC.ACCOUNTS.CREATE, (input: NouveauCompte) => accountsRepo.create(validateAccount(input)));

  handle(IPC.ACCOUNTS.UPDATE, (id: string, input: NouveauCompte) => accountsRepo.update(validateId(id), validateAccount(input)));

  handle(IPC.ACCOUNTS.REMOVE, (id: string) => {
    const validId = validateId(id);
    const removedPublications = accountsRepo.countPublicationsForAccount(validId);
    accountsRepo.remove(validId);
    return { removedPublications };
  });
}
