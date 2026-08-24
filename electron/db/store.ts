import fs from 'node:fs';
import path from 'node:path';
import { getUserDataPath } from '../paths';
import type { Compte, Connexion, Publication, Settings } from '../../shared/types';
import { app } from 'electron';
import { resolveLocale, translate, type TranslationKey } from '../../shared/i18n';
import { SUPPORTED_LOCALES } from '../../shared/i18n';
import { applyAccountMigration, applyPublicationMigration, isPlateforme } from '../../shared/compte';
import { getThumbnailsDir, getVideosDir, getPhotosDir } from '../paths';

const systemText = (key: TranslationKey) => translate(resolveLocale('system', app.getLocale()), key);

export interface StoreShape {
  schemaVersion: number;
  comptes: Compte[];
  publications: Publication[];
  settings: Settings;
  connexions: Record<string, Connexion>;
}

const DEFAULT_SETTINGS: Settings = {
  reminderLeadMinutesDefault: 15,
  notificationsEnabled: true,
  preReminderEnabled: true,
  launchMinimizedToTray: false,
  startOnLogin: false,
  language: 'system',
  showWelcomeOnStartup: true,
};

function defaultStore(): StoreShape {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    comptes: [],
    publications: [],
    settings: { ...DEFAULT_SETTINGS },
    connexions: {},
  };
}

function getStorePath(): string {
  return path.join(getUserDataPath(), 'data.json');
}

function getBackupPath(): string {
  return path.join(getUserDataPath(), 'data.backup.json');
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PUBLICATION_STATUSES = new Set(['planifie', 'rappel_envoye', 'en_cours', 'publie', 'echec', 'manque', 'annule']);
const CONTENT_TYPES = new Set(['video', 'story', 'short', 'photo']);
const SUPPORTED_SCHEMA_VERSIONS = [1, 2, 3];
const CURRENT_SCHEMA_VERSION = 3;
const VISIBILITES = new Set(['public', 'unlisted', 'private', 'selfOnly', 'friends']);

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function isManagedPath(value: unknown, directory: string, nullable = false): boolean {
  if (nullable && value === null) return true;
  if (typeof value !== 'string') return false;
  const relative = path.relative(path.resolve(directory), path.resolve(value));
  return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function isAccount(value: unknown): value is Compte {
  if (!value || typeof value !== 'object') return false;
  const account = value as Partial<Compte>;
  const identifierValid = account.plateforme === 'youtube'
    ? typeof account.chaineYoutube === 'string' && account.chaineYoutube.length > 0 && account.chaineYoutube.length <= 80
    : typeof account.pseudoTiktok === 'string' && account.pseudoTiktok.length > 0 && account.pseudoTiktok.length <= 80;
  return (
    typeof account.id === 'string' && UUID.test(account.id)
    && typeof account.nom === 'string' && account.nom.length > 0 && account.nom.length <= 80
    && isPlateforme(account.plateforme)
    && typeof account.pseudoTiktok === 'string' && account.pseudoTiktok.length <= 80
    && typeof account.chaineYoutube === 'string' && account.chaineYoutube.length <= 80
    && identifierValid
    && typeof account.couleur === 'string' && /^#[0-9a-f]{6}$/i.test(account.couleur)
    && isIsoDate(account.createdAt) && isIsoDate(account.updatedAt)
  );
}

function isPublication(value: unknown): value is Publication {
  if (!value || typeof value !== 'object') return false;
  const publication = value as Partial<Publication>;
  return (
    typeof publication.id === 'string' && UUID.test(publication.id)
    && typeof publication.compteId === 'string' && UUID.test(publication.compteId)
    && typeof publication.type === 'string' && CONTENT_TYPES.has(publication.type)
    && typeof publication.titre === 'string' && publication.titre.length > 0 && publication.titre.length <= 200
    && typeof publication.description === 'string' && publication.description.length <= 4_000
    && Array.isArray(publication.hashtags)
    && publication.hashtags.length <= 50
    && publication.hashtags.every((tag) => typeof tag === 'string' && tag.length <= 100)
    && typeof publication.videoPath === 'string' && (publication.videoPath === '' || isManagedPath(publication.videoPath, getVideosDir()))
    && Array.isArray(publication.photoPaths)
    && publication.photoPaths.every((p) => isManagedPath(p, getPhotosDir()))
    && (publication.thumbnailPath === null || isManagedPath(publication.thumbnailPath, getThumbnailsDir()))
    && (publication.visibilite === null || (typeof publication.visibilite === 'string' && VISIBILITES.has(publication.visibilite)))
    && isIsoDate(publication.scheduledAt)
    && (publication.reminderLeadMinutes === null || (
      typeof publication.reminderLeadMinutes === 'number'
      && Number.isFinite(publication.reminderLeadMinutes)
      && publication.reminderLeadMinutes >= 0
      && publication.reminderLeadMinutes <= 10_080
    ))
    && (publication.preReminderSentAt === null || isIsoDate(publication.preReminderSentAt))
    && typeof publication.statut === 'string' && PUBLICATION_STATUSES.has(publication.statut)
    && (publication.publishedAt === null || isIsoDate(publication.publishedAt))
    && (publication.remoteId === null || typeof publication.remoteId === 'string')
    && (publication.remoteUrl === null || typeof publication.remoteUrl === 'string')
    && (publication.lastError === null || typeof publication.lastError === 'string')
    && typeof publication.attemptCount === 'number' && Number.isInteger(publication.attemptCount) && publication.attemptCount >= 0
    && isIsoDate(publication.createdAt) && isIsoDate(publication.updatedAt)
  );
}

function isConnexion(value: unknown): value is Connexion {
  if (!value || typeof value !== 'object') return false;
  const connexion = value as Partial<Connexion>;
  return (
    isPlateforme(connexion.plateforme)
    && typeof connexion.connecte === 'boolean'
    && (connexion.titreCompte === null || typeof connexion.titreCompte === 'string')
    && (connexion.avatarUrl === null || typeof connexion.avatarUrl === 'string')
    && Array.isArray(connexion.scopes)
    && connexion.scopes.every((s) => typeof s === 'string')
    && (connexion.connectedAt === null || isIsoDate(connexion.connectedAt))
    && (connexion.expiresAt === null || isIsoDate(connexion.expiresAt))
  );
}

function sanitizeConnexions(value: unknown): Record<string, Connexion> {
  if (!value || typeof value !== 'object') return {};
  const input = value as Record<string, Connexion>;
  const result: Record<string, Connexion> = {};
  for (const [key, val] of Object.entries(input)) {
    if (isConnexion(val)) result[key] = val;
  }
  return result;
}

function isSettings(value: Settings): boolean {
  return (
    Number.isFinite(value.reminderLeadMinutesDefault)
    && value.reminderLeadMinutesDefault >= 0
    && value.reminderLeadMinutesDefault <= 10_080
    && typeof value.notificationsEnabled === 'boolean'
    && typeof value.preReminderEnabled === 'boolean'
    && typeof value.launchMinimizedToTray === 'boolean'
    && typeof value.startOnLogin === 'boolean'
    && typeof value.showWelcomeOnStartup === 'boolean'
    && (value.language === 'system' || SUPPORTED_LOCALES.includes(value.language))
  );
}

function normalizeStore(value: unknown): StoreShape {
  if (!value || typeof value !== 'object') throw new Error(systemText('store.invalid'));
  const parsed = value as Partial<StoreShape>;
  if (parsed.comptes !== undefined && !Array.isArray(parsed.comptes)) throw new Error(systemText('store.accountsInvalid'));
  if (parsed.publications !== undefined && !Array.isArray(parsed.publications)) throw new Error(systemText('store.publicationsInvalid'));
  if (parsed.settings !== undefined && (!parsed.settings || typeof parsed.settings !== 'object')) throw new Error(systemText('store.settingsInvalid'));
  const settings = { ...DEFAULT_SETTINGS, ...parsed.settings } as Settings & { donationUrl?: unknown };
  // Remove the legacy editable PayPal link introduced in v1.3.0/v1.3.1.
  delete settings.donationUrl;
  const comptes = (parsed.comptes ?? []).map((compte) => applyAccountMigration(compte as unknown as Compte));
  const publications = (parsed.publications ?? []).map((publication) => applyPublicationMigration(publication as unknown as Publication));
  const connexions = sanitizeConnexions(parsed.connexions);
  if (!Number.isInteger(parsed.schemaVersion ?? 1) || !SUPPORTED_SCHEMA_VERSIONS.includes((parsed.schemaVersion ?? 1) as number)) {
    throw new Error(systemText('store.invalid'));
  }
  if (!comptes.every(isAccount) || new Set(comptes.map((account) => account.id)).size !== comptes.length) {
    throw new Error(systemText('store.accountsInvalid'));
  }
  const accountIds = new Set(comptes.map((account) => account.id));
  if (
    !publications.every(isPublication)
    || new Set(publications.map((publication) => publication.id)).size !== publications.length
    || publications.some((publication) => !accountIds.has(publication.compteId))
  ) {
    throw new Error(systemText('store.publicationsInvalid'));
  }
  if (!isSettings(settings)) throw new Error(systemText('store.settingsInvalid'));
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    comptes,
    publications,
    settings,
    connexions,
  };
}

let cache: StoreShape | null = null;

function load(): StoreShape {
  if (cache) return cache;

  const storePath = getStorePath();
  if (!fs.existsSync(storePath)) {
    cache = defaultStore();
    save(cache);
    return cache;
  }

  try {
    const raw = fs.readFileSync(storePath, 'utf-8');
    const parsed = JSON.parse(raw);
    const parsedSchemaVersion = (parsed as { schemaVersion?: number } | null)?.schemaVersion ?? 1;
    cache = normalizeStore(parsed);
    if (parsedSchemaVersion !== CURRENT_SCHEMA_VERSION) save(cache);
  } catch (err) {
    console.error('[store] Fichier principal illisible, tentative de restauration:', err);
    try {
      cache = normalizeStore(JSON.parse(fs.readFileSync(getBackupPath(), 'utf-8')));
      const corruptPath = `${storePath}.corrupt-${Date.now()}`;
      fs.renameSync(storePath, corruptPath);
      save(cache);
      console.warn(`[store] Données restaurées depuis la sauvegarde. Fichier conservé: ${corruptPath}`);
    } catch (backupError) {
      const corruptPath = `${storePath}.corrupt-${Date.now()}`;
      try { fs.renameSync(storePath, corruptPath); } catch { /* Conserver autant que possible. */ }
      console.error('[store] Sauvegarde également illisible, création d’un magasin vide:', backupError);
      cache = defaultStore();
      save(cache);
    }
  }

  return cache;
}

function save(data: StoreShape): void {
  const storePath = getStorePath();
  const tmpPath = `${storePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), { encoding: 'utf-8', mode: 0o600 });
  if (fs.existsSync(storePath)) {
    fs.copyFileSync(storePath, getBackupPath());
  }
  fs.renameSync(tmpPath, storePath);
}

export function getStore(): StoreShape {
  return load();
}

export function persist(): void {
  if (cache) save(cache);
}
