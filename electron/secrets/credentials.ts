import fs from 'node:fs';
import path from 'node:path';
import { safeStorage } from 'electron';
import type { CredentialsApi } from '../../shared/types';
import { getUserDataPath } from '../paths';

const CREDENTIALS_FILE = 'credentials.bin';

function credentialsPath(): string {
  return path.join(getUserDataPath(), CREDENTIALS_FILE);
}

export function credentialsConfigured(): boolean {
  const creds = loadCredentials();
  return Boolean(creds?.googleClientId && creds?.googleClientSecret && creds?.tiktokClientKey && creds?.tiktokClientSecret);
}

export function saveCredentials(input: CredentialsApi): void {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('secure_storage_unavailable');
  const json = JSON.stringify({
    googleClientId: String(input.googleClientId ?? '').trim(),
    googleClientSecret: String(input.googleClientSecret ?? '').trim(),
    tiktokClientKey: String(input.tiktokClientKey ?? '').trim(),
    tiktokClientSecret: String(input.tiktokClientSecret ?? '').trim(),
  });
  const encrypted = safeStorage.encryptString(json);
  fs.writeFileSync(credentialsPath(), encrypted, { mode: 0o600 });
}

export function loadCredentials(): CredentialsApi | null {
  const file = credentialsPath();
  if (!fs.existsSync(file)) return null;
  if (!safeStorage.isEncryptionAvailable()) return null;
  try {
    const encrypted = fs.readFileSync(file);
    const decrypted = safeStorage.decryptString(encrypted);
    const parsed = JSON.parse(decrypted) as Partial<CredentialsApi>;
    if (!parsed.googleClientId || !parsed.googleClientSecret || !parsed.tiktokClientKey || !parsed.tiktokClientSecret) return null;
    return {
      googleClientId: parsed.googleClientId,
      googleClientSecret: parsed.googleClientSecret,
      tiktokClientKey: parsed.tiktokClientKey,
      tiktokClientSecret: parsed.tiktokClientSecret,
    };
  } catch {
    return null;
  }
}

export function clearCredentials(): void {
  const file = credentialsPath();
  if (fs.existsSync(file)) fs.rmSync(file, { force: true });
}