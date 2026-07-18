import fs from 'node:fs';
import path from 'node:path';
import { getUserDataPath } from '../paths';
import type { Compte, Publication, Settings } from '../../shared/types';
import { app } from 'electron';
import { resolveLocale, translate, type TranslationKey } from '../../shared/i18n';

const systemText = (key: TranslationKey) => translate(resolveLocale('system', app.getLocale()), key);

export interface StoreShape {
  schemaVersion: number;
  comptes: Compte[];
  publications: Publication[];
  settings: Settings;
}

const DEFAULT_SETTINGS: Settings = {
  reminderLeadMinutesDefault: 15,
  notificationsEnabled: true,
  preReminderEnabled: true,
  launchMinimizedToTray: false,
  startOnLogin: false,
  language: 'system',
};

function defaultStore(): StoreShape {
  return {
    schemaVersion: 1,
    comptes: [],
    publications: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

function getStorePath(): string {
  return path.join(getUserDataPath(), 'data.json');
}

function getBackupPath(): string {
  return path.join(getUserDataPath(), 'data.backup.json');
}

function normalizeStore(value: unknown): StoreShape {
  if (!value || typeof value !== 'object') throw new Error(systemText('store.invalid'));
  const parsed = value as Partial<StoreShape>;
  if (parsed.comptes !== undefined && !Array.isArray(parsed.comptes)) throw new Error(systemText('store.accountsInvalid'));
  if (parsed.publications !== undefined && !Array.isArray(parsed.publications)) throw new Error(systemText('store.publicationsInvalid'));
  if (parsed.settings !== undefined && (!parsed.settings || typeof parsed.settings !== 'object')) throw new Error(systemText('store.settingsInvalid'));
  return {
    schemaVersion: typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : 1,
    comptes: parsed.comptes ?? [],
    publications: parsed.publications ?? [],
    settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
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
    cache = normalizeStore(JSON.parse(raw));
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
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
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
