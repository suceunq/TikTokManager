import { IPC } from '../../shared/ipc-contract';
import type { NouveauCompte } from '../../shared/types';
import * as accountsRepo from '../db/accounts.repo';
import { handle } from './helpers';

export function registerAccountsIpc(): void {
  handle(IPC.ACCOUNTS.LIST, () => accountsRepo.list());

  handle(IPC.ACCOUNTS.CREATE, (input: NouveauCompte) => accountsRepo.create(input));

  handle(IPC.ACCOUNTS.UPDATE, (id: string, input: NouveauCompte) => accountsRepo.update(id, input));

  handle(IPC.ACCOUNTS.REMOVE, (id: string) => {
    const removedPublications = accountsRepo.countPublicationsForAccount(id);
    accountsRepo.remove(id);
    return { removedPublications };
  });
}
