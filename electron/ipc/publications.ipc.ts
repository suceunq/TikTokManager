import { IPC } from '../../shared/ipc-contract';
import type { HistoriqueFiltre, NouvellePublication } from '../../shared/types';
import * as publicationsRepo from '../db/publications.repo';
import { handle } from './helpers';
import * as accountsRepo from '../db/accounts.repo';
import { validateDateRange, validateHistoryFilter, validateId, validatePublication } from '../validation';
import { t } from '../i18n';

export function registerPublicationsIpc(): void {
  handle(IPC.PUBLICATIONS.LIST, () => publicationsRepo.list());

  handle(IPC.PUBLICATIONS.LIST_BETWEEN, (startIso: string, endIso: string) => {
    const [start, end] = validateDateRange(startIso, endIso);
    return publicationsRepo.listBetween(start, end);
  });

  handle(IPC.PUBLICATIONS.LIST_HISTORIQUE, (filtre: HistoriqueFiltre) =>
    publicationsRepo.listHistorique(validateHistoryFilter(filtre))
  );

  handle(IPC.PUBLICATIONS.GET, (id: string) => publicationsRepo.getById(validateId(id)));

  handle(IPC.PUBLICATIONS.CREATE, (input: NouvellePublication) => {
    const valid = validatePublication(input);
    if (!accountsRepo.getById(valid.compteId)) throw new Error(t('validation.accountMissing'));
    return publicationsRepo.create(valid);
  });

  handle(IPC.PUBLICATIONS.UPDATE, (id: string, input: NouvellePublication) => {
    const valid = validatePublication(input);
    if (!accountsRepo.getById(valid.compteId)) throw new Error(t('validation.accountMissing'));
    return publicationsRepo.update(validateId(id), valid);
  });

  handle(IPC.PUBLICATIONS.REMOVE, (id: string) => {
    publicationsRepo.remove(validateId(id));
  });

  handle(IPC.PUBLICATIONS.MARK_PUBLISHED, (id: string) =>
    publicationsRepo.setStatut(validateId(id), 'publie', { publishedAt: new Date().toISOString() })
  );

  handle(IPC.PUBLICATIONS.CANCEL, (id: string) => publicationsRepo.setStatut(validateId(id), 'annule'));
}
