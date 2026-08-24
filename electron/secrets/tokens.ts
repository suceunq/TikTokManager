import fs from 'node:fs';
import path from 'node:path';
import { safeStorage } from 'electron';
import { getUserDataPath } from '../paths';

const TOKENS_FILE = 'tokens.bin';

interface StoredTokenSet {
  [compteId: string]: {
    accessToken: string;
    refreshToken: string;
    expiresAtMs: number;
    openId?: string;
    scope?: string;
  };
}

const memoryCache: StoredTokenSet = {};

function tokensPath(): string {
  return path.join(getUserDataPath(), TOKENS_FILE);
}

function readAll(): StoredTokenSet {
  if (Object.keys(memoryCache).length > 0) return memoryCache;
  const file = tokensPath();
  if (!fs.existsSync(file)) return {};
  if (!safeStorage.isEncryptionAvailable()) return {};
  try {
    const encrypted = fs.readFileSync(file);
    const decrypted = safeStorage.decryptString(encrypted);
    const parsed = JSON.parse(decrypted) as StoredTokenSet;
    Object.assign(memoryCache, parsed);
    return memoryCache;
  } catch {
    return {};
  }
}

function writeAll(set: StoredTokenSet): void {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('secure_storage_unavailable');
  for (const key of Object.keys(memoryCache)) delete memoryCache[key];
  Object.assign(memoryCache, set);
  const json = JSON.stringify(set);
  const encrypted = safeStorage.encryptString(json);
  fs.writeFileSync(tokensPath(), encrypted, { mode: 0o600 });
}

export function saveTokens(compteId: string, tokens: { accessToken: string; refreshToken: string; expiresInSeconds: number; openId?: string; scope?: string }): void {
  const all = readAll();
  all[compteId] = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAtMs: Date.now() + Math.max(60, tokens.expiresInSeconds - 120) * 1000,
    openId: tokens.openId,
    scope: tokens.scope,
  };
  writeAll(all);
}

export function getRefreshToken(compteId: string): string | null {
  return readAll()[compteId]?.refreshToken ?? null;
}

export function getValidAccessToken(compteId: string): string | null {
  const entry = readAll()[compteId];
  if (!entry) return null;
  if (Date.now() < entry.expiresAtMs) return entry.accessToken;
  return null;
}

export function updateAccessToken(compteId: string, accessToken: string, expiresInSeconds: number): void {
  const all = readAll();
  const entry = all[compteId];
  if (!entry) return;
  entry.accessToken = accessToken;
  entry.expiresAtMs = Date.now() + Math.max(60, expiresInSeconds - 120) * 1000;
  writeAll(all);
}

export function clearTokens(compteId: string): void {
  const all = readAll();
  delete all[compteId];
  writeAll(all);
}