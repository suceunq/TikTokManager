import fs from 'node:fs';
import path from 'node:path';
import type { HistoriqueFiltre, NouveauCompte, NouvellePublication, Settings } from '../shared/types';
import { getVideosDir, getThumbnailsDir } from './paths';
import { SUPPORTED_LOCALES } from '../shared/i18n';
import { t } from './i18n';

function requiredText(value: unknown, label: string, max: number): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(t('validation.required', { label }));
  if (value.trim().length > max) throw new Error(t('validation.tooLong', { label, max }));
  return value.trim();
}

function assertManagedFile(filePath: unknown, directory: string, label: string, nullable = false): void {
  if (nullable && filePath === null) return;
  if (typeof filePath !== 'string') throw new Error(t('validation.invalid', { label }));
  const parent = path.resolve(directory);
  const resolved = path.resolve(filePath);
  const relative = path.relative(parent, resolved);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || !fs.existsSync(resolved)) {
    throw new Error(t('validation.managedFile', { label }));
  }
}

export function validateAccount(input: NouveauCompte): NouveauCompte {
  const couleur = typeof input?.couleur === 'string' && /^#[0-9a-f]{6}$/i.test(input.couleur)
    ? input.couleur : (() => { throw new Error(t('validation.invalid', { label: t('validation.color') })); })();
  return {
    nom: requiredText(input?.nom, t('validation.name'), 80), pseudoTiktok: requiredText(input?.pseudoTiktok, t('validation.handle'), 80),
    couleur,
  };
}

export function validatePublication(input: NouvellePublication): NouvellePublication {
  if (!input || (input.type !== 'video' && input.type !== 'story')) throw new Error(t('validation.invalid', { label: t('validation.contentType') }));
  const date = new Date(input.scheduledAt);
  if (!Number.isFinite(date.getTime())) throw new Error(t('validation.invalid', { label: t('validation.publicationDate') }));
  if (!Array.isArray(input.hashtags) || input.hashtags.length > 50 || input.hashtags.some((h) => typeof h !== 'string' || h.length > 100)) {
    throw new Error(t('validation.invalid', { label: t('validation.hashtags') }));
  }
  if (input.reminderLeadMinutes !== null && (!Number.isFinite(input.reminderLeadMinutes) || input.reminderLeadMinutes < 0 || input.reminderLeadMinutes > 10080)) {
    throw new Error(t('validation.reminder'));
  }
  assertManagedFile(input.videoPath, getVideosDir(), t('validation.video')); assertManagedFile(input.thumbnailPath, getThumbnailsDir(), t('validation.thumbnail'), true);
  return {
    ...input,
    titre: requiredText(input.titre, t('validation.title'), 200), description: typeof input.description === 'string' && input.description.length <= 4000 ? input.description : (() => { throw new Error(t('validation.invalid', { label: t('validation.description') })); })(),
    hashtags: input.hashtags.map((h) => h.trim()).filter(Boolean),
    scheduledAt: date.toISOString(),
  };
}

export function validateSettings(partial: Partial<Settings>): Partial<Settings> {
  const allowed = new Set(['reminderLeadMinutesDefault', 'notificationsEnabled', 'preReminderEnabled', 'launchMinimizedToTray', 'startOnLogin', 'language']);
  if (!partial || Object.keys(partial).some((key) => !allowed.has(key))) throw new Error(t('validation.settings'));
  if (partial.reminderLeadMinutesDefault !== undefined && (!Number.isFinite(partial.reminderLeadMinutesDefault) || partial.reminderLeadMinutesDefault < 0 || partial.reminderLeadMinutesDefault > 10080)) {
    throw new Error(t('validation.defaultReminder'));
  }
  for (const key of ['notificationsEnabled', 'preReminderEnabled', 'launchMinimizedToTray', 'startOnLogin'] as const) {
    if (partial[key] !== undefined && typeof partial[key] !== 'boolean') throw new Error(t('validation.boolean'));
  }
  if (partial.language !== undefined && partial.language !== 'system' && !SUPPORTED_LOCALES.includes(partial.language)) throw new Error(t('validation.language'));
  return partial;
}

export function validateHistoryFilter(filter: HistoriqueFiltre): HistoriqueFiltre {
  if (!filter || typeof filter !== 'object') throw new Error(t('validation.filters'));
  for (const value of [filter.dateDebut, filter.dateFin]) {
    if (value && !Number.isFinite(new Date(value).getTime())) throw new Error(t('validation.filterDate'));
  }
  return filter;
}

export function validateId(id: unknown): string {
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error(t('validation.id'));
  return id;
}

export function validateDateRange(startIso: unknown, endIso: unknown): [string, string] {
  if (typeof startIso !== 'string' || typeof endIso !== 'string') throw new Error(t('validation.dateRange'));
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start > end) throw new Error(t('validation.dateRange'));
  return [start.toISOString(), end.toISOString()];
}
