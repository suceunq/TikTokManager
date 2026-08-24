import type { ConnexionResult } from '../../shared/types';
import * as accountsRepo from '../db/accounts.repo';
import { loadCredentials } from '../secrets/credentials';
import { clearTokens, saveTokens } from '../secrets/tokens';
import {
  exchangeGoogleCode,
  exchangeTiktokCode,
  GOOGLE_SCOPES,
  startGoogleOAuth,
  startTiktokOAuth,
  TIKTOK_SCOPES,
} from './flow';
import { queryCreatorInfo } from '../publish/tiktok';

async function fetchYoutubeChannel(accessToken: string): Promise<{ title: string; avatarUrl: string | null }> {
  const response = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`youtube_channel_${response.status}`);
  const json = (await response.json()) as {
    items?: Array<{ snippet?: { title?: string; thumbnails?: { default?: { url?: string } } } }>;
  };
  const snippet = json.items?.[0]?.snippet;
  return { title: snippet?.title ?? 'YouTube', avatarUrl: snippet?.thumbnails?.default?.url ?? null };
}

export async function connectCompte(compteId: string): Promise<ConnexionResult> {
  const compte = accountsRepo.getById(compteId);
  if (!compte) return { ok: false, errorKey: 'validation.accountMissing' };

  const credentials = loadCredentials();
  if (!credentials) return { ok: false, errorKey: 'connexion.missingCredentials' };

  try {
    if (compte.plateforme === 'youtube') {
      const flow = await startGoogleOAuth(credentials.googleClientId);
      const code = await flow.wait;
      const tokens = await exchangeGoogleCode(code, null, credentials.googleClientId, credentials.googleClientSecret);
      saveTokens(compteId, { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, expiresInSeconds: tokens.expiresInSeconds, scope: tokens.scope });
      const channel = await fetchYoutubeChannel(tokens.accessToken);
      const connexion = {
        plateforme: 'youtube' as const,
        connecte: true,
        titreCompte: channel.title,
        avatarUrl: channel.avatarUrl,
        scopes: GOOGLE_SCOPES,
        connectedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + tokens.expiresInSeconds * 1000).toISOString(),
      };
      accountsRepo.setConnexion(compteId, connexion);
      return { ok: true, titreCompte: channel.title, avatarUrl: channel.avatarUrl };
    }

    const flow = await startTiktokOAuth(credentials.tiktokClientKey);
    const code = await flow.wait;
    const tokens = await exchangeTiktokCode(code, credentials.tiktokClientKey, credentials.tiktokClientSecret);
    saveTokens(compteId, { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, expiresInSeconds: tokens.expiresInSeconds, openId: tokens.openId, scope: tokens.scope });
    let username = compte.chaineYoutube || 'TikTok';
    let avatar: string | null = null;
    try {
      const creator = await queryCreatorInfo(tokens.accessToken);
      username = creator.creator_username;
      avatar = creator.creator_avatar_url;
    } catch {
      // Les infos créateur peuvent être indisponibles ; la connexion reste valide.
    }
    const connexion = {
      plateforme: 'tiktok' as const,
      connecte: true,
      titreCompte: username,
      avatarUrl: avatar,
      scopes: TIKTOK_SCOPES,
      connectedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + tokens.expiresInSeconds * 1000).toISOString(),
    };
    accountsRepo.setConnexion(compteId, connexion);
    return { ok: true, titreCompte: username, avatarUrl: avatar };
  } catch (error) {
    return { ok: false, errorKey: 'connexion.failed', detail: error instanceof Error ? error.message : String(error) };
  }
}

export function disconnectCompte(compteId: string): void {
  clearTokens(compteId);
  accountsRepo.clearConnexion(compteId);
}
