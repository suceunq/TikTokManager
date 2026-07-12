import { IPC } from '../../shared/ipc-contract';
import type { HistoriqueFiltre, NouvellePublication } from '../../shared/types';
import * as publicationsRepo from '../db/publications.repo';
import { handle } from './helpers';

export function registerPublicationsIpc(): void {
  handle(IPC.PUBLICATIONS.LIST, () => publicationsRepo.list());

  handle(IPC.PUBLICATIONS.LIST_BETWEEN, (startIso: string, endIso: string) =>
    publicationsRepo.listBetween(startIso, endIso)
  );

  handle(IPC.PUBLICATIONS.LIST_HISTORIQUE, (filtre: HistoriqueFiltre) =>
    publicationsRepo.listHistorique(filtre)
  );

  handle(IPC.PUBLICATIONS.GET, (id: string) => publicationsRepo.getById(id));

  handle(IPC.PUBLICATIONS.CREATE, (input: NouvellePublication) => publicationsRepo.create(input));

  handle(IPC.PUBLICATIONS.UPDATE, (id: string, input: NouvellePublication) =>
    publicationsRepo.update(id, input)
  );

  handle(IPC.PUBLICATIONS.REMOVE, (id: string) => {
    publicationsRepo.remove(id);
  });

  handle(IPC.PUBLICATIONS.MARK_PUBLISHED, (id: string) =>
    publicationsRepo.setStatut(id, 'publie', { publishedAt: new Date().toISOString() })
  );

  handle(IPC.PUBLICATIONS.CANCEL, (id: string) => publicationsRepo.setStatut(id, 'annule'));
}
