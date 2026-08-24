import { IPC } from '../../shared/ipc-contract';
import { handle } from './helpers';
import { validateId } from '../validation';
import { getStore } from '../db/store';
import { connectCompte, disconnectCompte } from '../oauth/service';
import { credentialsConfigured, loadCredentials, saveCredentials } from '../secrets/credentials';
import { OAUTH_PORT } from '../oauth/flow';

export function registerConnexionsIpc(): void {
  handle(IPC.CONNEXIONS.LIST, () => getStore().connexions);

  handle(IPC.CONNEXIONS.CONNECT, async (compteId: string) => connectCompte(validateId(compteId)));

  handle(IPC.CONNEXIONS.DISCONNECT, (compteId: string) => {
    disconnectCompte(validateId(compteId));
    return true;
  });

  handle(IPC.CREDENTIALS.STATUS, () => ({
    configured: credentialsConfigured(),
    redirectUris: [
      `http://127.0.0.1:${OAUTH_PORT}/callback`,
      `http://localhost:${OAUTH_PORT}/callback`,
    ],
  }));

  handle(IPC.CREDENTIALS.SAVE, (input: Record<string, unknown>) => {
    const value = (key: string) => (typeof input?.[key] === 'string' ? (input[key] as string).trim() : '');
    const existing = loadCredentials();
    const merged = {
      googleClientId: value('googleClientId') || existing?.googleClientId || '',
      googleClientSecret: value('googleClientSecret') || existing?.googleClientSecret || '',
      tiktokClientKey: value('tiktokClientKey') || existing?.tiktokClientKey || '',
      tiktokClientSecret: value('tiktokClientSecret') || existing?.tiktokClientSecret || '',
    };
    if (!merged.googleClientId || !merged.googleClientSecret || !merged.tiktokClientKey || !merged.tiktokClientSecret) {
      throw new Error('credentials_incomplete');
    }
    saveCredentials(merged);
    return true;
  });
}
