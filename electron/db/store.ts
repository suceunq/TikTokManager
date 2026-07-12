import fs from 'node:fs';
import path from 'node:path';
import { getUserDataPath } from '../paths';
import type { Compte, Publication, Settings } from '../../shared/types';

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
    const parsed = JSON.parse(raw) as Partial<StoreShape>;
    cache = {
      schemaVersion: parsed.schemaVersion ?? 1,
      comptes: parsed.comptes ?? [],
      publications: parsed.publications ?? [],
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
    };
  } catch (err) {
    console.error('[store] Fichier de données corrompu, réinitialisation:', err);
    cache = defaultStore();
    save(cache);
  }

  return cache;
}

function save(data: StoreShape): void {
  const storePath = getStorePath();
  const tmpPath = `${storePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpPath, storePath);
}

export function getStore(): StoreShape {
  return load();
}

export function persist(): void {
  if (cache) save(cache);
}
