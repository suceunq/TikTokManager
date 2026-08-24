import type { Publication } from '../../shared/types';
import { isManualOnly } from '../../shared/compte';
import * as accountsRepo from '../db/accounts.repo';
import * as publicationsRepo from '../db/publications.repo';
import { loadCredentials } from '../secrets/credentials';
import { getRefreshToken, getValidAccessToken, updateAccessToken, clearTokens } from '../secrets/tokens';
import { refreshGoogleToken, refreshTiktokToken } from '../oauth/flow';
import { publishYoutubeVideo } from './youtube';
import { fetchPublishStatus, publishTiktokPhotos, publishTiktokVideo } from './tiktok';

export interface PublishOutcome {
  ok: boolean;
  errorKey?: string;
  detail?: string;
}

async function getAccessToken(compteId: string): Promise<string> {
  const cached = getValidAccessToken(compteId);
  if (cached) return cached;

  const refreshToken = getRefreshToken(compteId);
  const connexion = accountsRepo.getConnexion(compteId);
  if (!refreshToken || !connexion?.connecte) throw new Error('not_connected');

  const credentials = loadCredentials();
  if (!credentials) throw new Error('credentials_missing');

  try {
    const result = connexion.plateforme === 'youtube'
      ? await refreshGoogleToken(refreshToken, credentials.googleClientId, credentials.googleClientSecret)
      : await refreshTiktokToken(refreshToken, credentials.tiktokClientKey, credentials.tiktokClientSecret);
    updateAccessToken(compteId, result.accessToken, result.expiresInSeconds);
    accountsRepo.setConnexion(compteId, {
      ...connexion,
      expiresAt: new Date(Date.now() + result.expiresInSeconds * 1000).toISOString(),
    });
    return result.accessToken;
  } catch (error) {
    clearTokens(compteId);
    accountsRepo.setConnexion(compteId, { ...connexion, connecte: false });
    throw new Error(`token_expired:${error instanceof Error ? error.message : 'unknown'}`);
  }
}

function assertConnected(publication: Publication): void {
  const connexion = accountsRepo.getConnexion(publication.compteId);
  if (!connexion?.connecte) throw new Error('not_connected');
  if (isManualOnly(publication.type)) throw new Error('manual_only');
}

export async function publishPublication(publicationId: string): Promise<PublishOutcome> {
  const publication = publicationsRepo.getById(publicationId);
  if (!publication) return { ok: false, errorKey: 'validation.publicationMissing' };

  try {
    assertConnected(publication);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    publicationsRepo.markPublishFailed(publicationId, message);
    return { ok: false, errorKey: message };
  }

  publicationsRepo.markPublishing(publicationId);

  try {
    const accessToken = await getAccessToken(publication.compteId);
    const compte = accountsRepo.getById(publication.compteId);
    let remoteId: string | null = null;

    if (compte?.plateforme === 'youtube') {
      const result = await publishYoutubeVideo(accessToken, publication);
      remoteId = result.remoteId;
    } else if (publication.type === 'photo') {
      const result = await publishTiktokPhotos(accessToken, publication);
      remoteId = result.remoteId;
    } else {
      const result = await publishTiktokVideo(accessToken, publication);
      remoteId = result.remoteId;
    }

    if (remoteId && compte?.plateforme === 'tiktok') {
      for (let attempt = 0; attempt < 12; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const status = await fetchPublishStatus(accessToken, remoteId).catch(() => null);
        if (!status) continue;
        if (status.status === 'SUCCESS') break;
        if (status.status === 'PUBLISH_FAILED') {
          throw new Error(`tiktok_publish_failed: ${status.failReason ?? ''}`);
        }
      }
    }

    publicationsRepo.markPublishedRemote(publicationId, remoteId, null);
    return { ok: true };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    publicationsRepo.markPublishFailed(publicationId, detail);
    return { ok: false, detail };
  }
}
