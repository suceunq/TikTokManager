import { randomUUID } from 'node:crypto';
import { getStore, persist } from './store';
import type { HistoriqueFiltre, NouvellePublication, Publication } from '../../shared/types';
import type { StatutPublication } from '../../shared/types';
import { cleanupPublicationMedia } from '../media/cleanup';
import { resetForReschedule } from '../publication-state';
import { t } from '../i18n';

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
    rows = rows.filter((p) => p.scheduledAt < filtre.dateFin!);
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
  if (duplicate) throw new Error(t('validation.duplicate'));
  const now = new Date().toISOString();
  const publication: Publication = {
    id: randomUUID(),
    compteId: input.compteId,
    type: input.type,
    titre: input.titre,
    description: input.description,
    hashtags: input.hashtags,
    videoPath: input.videoPath,
    photoPaths: input.photoPaths ?? [],
    thumbnailPath: input.thumbnailPath,
    visibilite: input.visibilite ?? null,
    scheduledAt: input.scheduledAt,
    reminderLeadMinutes: input.reminderLeadMinutes,
    preReminderSentAt: null,
    statut: 'planifie',
    publishedAt: null,
    remoteId: null,
    remoteUrl: null,
    lastError: null,
    attemptCount: 0,
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
  if (!publication) throw new Error(t('validation.publicationMissing'));
  const duplicate = store.publications.find(
    (p) => p.id !== id && p.statut !== 'annule' && p.compteId === input.compteId && p.scheduledAt === input.scheduledAt
  );
  if (duplicate) throw new Error(t('validation.duplicateOther'));
  const previousVideoPath = publication.videoPath;
  const previousThumbnailPath = publication.thumbnailPath;
  resetForReschedule(publication, input.scheduledAt);
  publication.compteId = input.compteId;
  publication.type = input.type;
  publication.titre = input.titre;
  publication.description = input.description;
  publication.hashtags = input.hashtags;
  publication.videoPath = input.videoPath;
  publication.photoPaths = input.photoPaths ?? [];
  publication.thumbnailPath = input.thumbnailPath;
  publication.visibilite = input.visibilite ?? null;
  publication.scheduledAt = input.scheduledAt;
  publication.reminderLeadMinutes = input.reminderLeadMinutes;
  publication.updatedAt = new Date().toISOString();
  persist();
  cleanupPublicationMedia(previousVideoPath, previousThumbnailPath);
  return publication;
}

export function setStatut(id: string, statut: StatutPublication, extra?: { publishedAt?: string }): Publication {
  const store = getStore();
  const publication = store.publications.find((p) => p.id === id);
  if (!publication) throw new Error(t('validation.publicationMissing'));
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

export function duplicate(id: string): Publication | null {
  const source = getById(id);
  if (!source) return null;
  return create({
    compteId: source.compteId,
    type: source.type,
    titre: source.titre,
    description: source.description,
    hashtags: [...source.hashtags],
    videoPath: source.videoPath,
    photoPaths: [...source.photoPaths],
    thumbnailPath: source.thumbnailPath,
    visibilite: source.visibilite,
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    reminderLeadMinutes: source.reminderLeadMinutes,
  });
}

export function markPublishing(id: string): void {
  const store = getStore();
  const publication = store.publications.find((p) => p.id === id);
  if (!publication) return;
  publication.statut = 'en_cours';
  publication.attemptCount += 1;
  publication.lastError = null;
  publication.updatedAt = new Date().toISOString();
  persist();
}

export function markPublishFailed(id: string, error: string): void {
  const store = getStore();
  const publication = store.publications.find((p) => p.id === id);
  if (!publication) return;
  publication.statut = 'echec';
  publication.lastError = error.slice(0, 500);
  publication.updatedAt = new Date().toISOString();
  persist();
}

export function markPublishedRemote(id: string, remoteId: string | null, remoteUrl: string | null): Publication {
  const store = getStore();
  const publication = store.publications.find((p) => p.id === id);
  if (!publication) throw new Error(t('validation.publicationMissing'));
  publication.statut = 'publie';
  publication.publishedAt = new Date().toISOString();
  if (remoteId) publication.remoteId = remoteId;
  if (remoteUrl) publication.remoteUrl = remoteUrl;
  publication.lastError = null;
  publication.updatedAt = new Date().toISOString();
  persist();
  return publication;
}

export function remove(id: string): void {
  const store = getStore();
  const removed = store.publications.find((p) => p.id === id);
  store.publications = store.publications.filter((p) => p.id !== id);
  persist();
  if (removed) cleanupPublicationMedia(removed.videoPath, removed.thumbnailPath);
}
