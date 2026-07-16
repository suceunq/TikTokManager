import fs from 'node:fs';
import path from 'node:path';
import type { HistoriqueFiltre, NouveauCompte, NouvellePublication, Settings } from '../shared/types';
import { getVideosDir, getThumbnailsDir } from './paths';

function requiredText(value: unknown, label: string, max: number): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} est obligatoire.`);
  if (value.trim().length > max) throw new Error(`${label} dépasse ${max} caractères.`);
  return value.trim();
}

function assertManagedFile(filePath: unknown, directory: string, label: string, nullable = false): void {
  if (nullable && filePath === null) return;
  if (typeof filePath !== 'string') throw new Error(`${label} invalide.`);
  const parent = path.resolve(directory);
  const resolved = path.resolve(filePath);
  const relative = path.relative(parent, resolved);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || !fs.existsSync(resolved)) {
    throw new Error(`${label} doit être un fichier importé par l’application.`);
  }
}

export function validateAccount(input: NouveauCompte): NouveauCompte {
  const couleur = typeof input?.couleur === 'string' && /^#[0-9a-f]{6}$/i.test(input.couleur)
    ? input.couleur : (() => { throw new Error('Couleur invalide.'); })();
  return {
    nom: requiredText(input?.nom, 'Le nom', 80),
    pseudoTiktok: requiredText(input?.pseudoTiktok, 'Le pseudo TikTok', 80),
    couleur,
  };
}

export function validatePublication(input: NouvellePublication): NouvellePublication {
  if (!input || (input.type !== 'video' && input.type !== 'story')) throw new Error('Type de contenu invalide.');
  const date = new Date(input.scheduledAt);
  if (!Number.isFinite(date.getTime())) throw new Error('Date de publication invalide.');
  if (!Array.isArray(input.hashtags) || input.hashtags.length > 50 || input.hashtags.some((h) => typeof h !== 'string' || h.length > 100)) {
    throw new Error('Liste de hashtags invalide.');
  }
  if (input.reminderLeadMinutes !== null && (!Number.isFinite(input.reminderLeadMinutes) || input.reminderLeadMinutes < 0 || input.reminderLeadMinutes > 10080)) {
    throw new Error('Le rappel doit être compris entre 0 et 10 080 minutes.');
  }
  assertManagedFile(input.videoPath, getVideosDir(), 'Vidéo');
  assertManagedFile(input.thumbnailPath, getThumbnailsDir(), 'Miniature', true);
  return {
    ...input,
    titre: requiredText(input.titre, 'Le titre', 200),
    description: typeof input.description === 'string' && input.description.length <= 4000 ? input.description : (() => { throw new Error('Description invalide.'); })(),
    hashtags: input.hashtags.map((h) => h.trim()).filter(Boolean),
    scheduledAt: date.toISOString(),
  };
}

export function validateSettings(partial: Partial<Settings>): Partial<Settings> {
  const allowed = new Set(['reminderLeadMinutesDefault', 'notificationsEnabled', 'preReminderEnabled', 'launchMinimizedToTray', 'startOnLogin']);
  if (!partial || Object.keys(partial).some((key) => !allowed.has(key))) throw new Error('Paramètres invalides.');
  if (partial.reminderLeadMinutesDefault !== undefined && (!Number.isFinite(partial.reminderLeadMinutesDefault) || partial.reminderLeadMinutesDefault < 0 || partial.reminderLeadMinutesDefault > 10080)) {
    throw new Error('Le délai de rappel est invalide.');
  }
  for (const key of ['notificationsEnabled', 'preReminderEnabled', 'launchMinimizedToTray', 'startOnLogin'] as const) {
    if (partial[key] !== undefined && typeof partial[key] !== 'boolean') throw new Error('Paramètre booléen invalide.');
  }
  return partial;
}

export function validateHistoryFilter(filter: HistoriqueFiltre): HistoriqueFiltre {
  if (!filter || typeof filter !== 'object') throw new Error('Filtres invalides.');
  for (const value of [filter.dateDebut, filter.dateFin]) {
    if (value && !Number.isFinite(new Date(value).getTime())) throw new Error('Date de filtre invalide.');
  }
  return filter;
}

export function validateId(id: unknown): string {
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Identifiant invalide.');
  return id;
}

export function validateDateRange(startIso: unknown, endIso: unknown): [string, string] {
  if (typeof startIso !== 'string' || typeof endIso !== 'string') throw new Error('Plage de dates invalide.');
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start > end) throw new Error('Plage de dates invalide.');
  return [start.toISOString(), end.toISOString()];
}
