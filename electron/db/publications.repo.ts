import { v4 as uuid } from 'uuid';
import { getStore, persist } from './store';
import type { HistoriqueFiltre, NouvellePublication, Publication } from '../../shared/types';
import type { StatutPublication } from '../../shared/types';

function sortByScheduledAtAsc(a: Publication, b: Publication): number {
  return a.scheduledAt.localeCompare(b.scheduledAt);
}

export function list(): Publication[] {
  return [...getStore().publications].sort(sortByScheduledAtAsc);
}

export function getById(id: string): Publication | null {
  return getStore().publications.find((p) => p.id === id) ?? null;
}

export function listBetween(startIso: string, endIso: string): Publication[] {
  return getStore()
    .publications.filter((p) => p.scheduledAt >= startIso && p.scheduledAt <= endIso)
    .sort(sortByScheduledAtAsc);
}

export function listHistorique(filtre: HistoriqueFiltre): Publication[] {
  let rows = getStore().publications.slice();

  if (filtre.compteId) {
    rows = rows.filter((p) => p.compteId === filtre.compteId);
  }
  if (filtre.statut) {
    rows = rows.filter((p) => p.statut === filtre.statut);
  } else {
    rows = rows.filter((p) => p.statut !== 'planifie' && p.statut !== 'rappel_envoye');
  }
  if (filtre.dateDebut) {
    rows = rows.filter((p) => p.scheduledAt >= filtre.dateDebut!);
  }
  if (filtre.dateFin) {
    rows = rows.filter((p) => p.scheduledAt <= filtre.dateFin!);
  }

  return rows.sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
}

export function listNeedingPreReminder(nowIso: string, defaultLeadMinutes: number): Publication[] {
  return getStore().publications.filter((p) => {
    if (p.statut !== 'planifie' || p.preReminderSentAt) return false;
    const leadMinutes = p.reminderLeadMinutes ?? defaultLeadMinutes;
    const reminderTime = new Date(new Date(p.scheduledAt).getTime() - leadMinutes * 60_000).toISOString();
    return reminderTime <= nowIso && p.scheduledAt > nowIso;
  });
}

export function listDuePublications(nowIso: string): Publication[] {
  return getStore().publications.filter(
    (p) => (p.statut === 'planifie' || p.statut === 'rappel_envoye') && p.scheduledAt <= nowIso
  );
}

export function listStale(cutoffIso: string): Publication[] {
  return getStore().publications.filter(
    (p) => (p.statut === 'planifie' || p.statut === 'rappel_envoye') && p.scheduledAt <= cutoffIso
  );
}

export function create(input: NouvellePublication): Publication {
  const duplicate = getStore().publications.find(
    (p) => p.statut !== 'annule' && p.compteId === input.compteId && p.scheduledAt === input.scheduledAt
  );
  if (duplicate) throw new Error('Une publication est déjà programmée pour ce compte à cette date et cette heure.');
  const now = new Date().toISOString();
  const publication: Publication = {
    id: uuid(),
    compteId: input.compteId,
    type: input.type,
    titre: input.titre,
    description: input.description,
    hashtags: input.hashtags,
    videoPath: input.videoPath,
    thumbnailPath: input.thumbnailPath,
    scheduledAt: input.scheduledAt,
    reminderLeadMinutes: input.reminderLeadMinutes,
    preReminderSentAt: null,
    statut: 'planifie',
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  getStore().publications.push(publication);
  persist();
  return publication;
}

export function update(id: string, input: NouvellePublication): Publication {
  const store = getStore();
  const publication = store.publications.find((p) => p.id === id);
  if (!publication) throw new Error('Publication introuvable');
  const duplicate = store.publications.find(
    (p) => p.id !== id && p.statut !== 'annule' && p.compteId === input.compteId && p.scheduledAt === input.scheduledAt
  );
  if (duplicate) throw new Error('Une autre publication utilise déjà ce créneau pour ce compte.');
  publication.compteId = input.compteId;
  publication.type = input.type;
  publication.titre = input.titre;
  publication.description = input.description;
  publication.hashtags = input.hashtags;
  publication.videoPath = input.videoPath;
  publication.thumbnailPath = input.thumbnailPath;
  publication.scheduledAt = input.scheduledAt;
  publication.reminderLeadMinutes = input.reminderLeadMinutes;
  publication.updatedAt = new Date().toISOString();
  persist();
  return publication;
}

export function setStatut(id: string, statut: StatutPublication, extra?: { publishedAt?: string }): Publication {
  const store = getStore();
  const publication = store.publications.find((p) => p.id === id);
  if (!publication) throw new Error('Publication introuvable');
  publication.statut = statut;
  if (extra?.publishedAt) publication.publishedAt = extra.publishedAt;
  publication.updatedAt = new Date().toISOString();
  persist();
  return publication;
}

export function markPreReminderSent(id: string): void {
  const store = getStore();
  const publication = store.publications.find((p) => p.id === id);
  if (!publication) return;
  publication.preReminderSentAt = new Date().toISOString();
  persist();
}

export function remove(id: string): void {
  const store = getStore();
  store.publications = store.publications.filter((p) => p.id !== id);
  persist();
}
