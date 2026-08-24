import http from 'node:http';
import crypto from 'node:crypto';
import { shell } from 'electron';

export const OAUTH_PORT = 8731;
export const REDIRECT_URI = `http://127.0.0.1:${OAUTH_PORT}/callback`;
export const REDIRECT_URI_TIKTOK = `http://localhost:${OAUTH_PORT}/callback`;

export const GOOGLE_SCOPES = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly'];
export const TIKTOK_SCOPES = ['user.info.basic', 'video.publish', 'video.upload'];

interface PendingFlow {
  state: string;
  codeVerifier: string | null;
  platform: 'youtube' | 'tiktok';
  resolve: (code: string) => void;
  reject: (err: Error) => void;
  server: http.Server;
  timer: NodeJS.Timeout;
}

let active: PendingFlow | null = null;

function base64Url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function htmlResponse(res: http.ServerResponse, ok: boolean, message: string): void {
  res.writeHead(ok ? 200 : 400, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html><html><head><meta charset="utf-8"><title>Connexion</title></head><body style="font-family:sans-serif;display:grid;place-items:center;height:100vh;margin:0"><p>${ok ? 'Connexion réussie. Vous pouvez fermer cette fenêtre.' : `Échec : ${message}`}</p></body></html>`);
}

async function waitForCode(platform: 'youtube' | 'tiktok', codeVerifier: string | null): Promise<string> {
  if (active) {
    clearTimeout(active.timer);
    active.server.close();
    active.reject(new Error('oauth_cancelled'));
    active = null;
  }
  const state = base64Url(crypto.randomBytes(24));
  return new Promise<string>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://127.0.0.1:${OAUTH_PORT}`);
      if (url.pathname !== '/callback') {
        htmlResponse(res, false, 'chemin inattendu');
        return;
      }
      const error = url.searchParams.get('error');
      const code = url.searchParams.get('code');
      const returnedState = url.searchParams.get('state');
      if (error || !code || returnedState !== state) {
        htmlResponse(res, false, error ?? 'réponse invalide');
        cleanup();
        reject(new Error(error || 'oauth_invalid_response'));
        return;
      }
      htmlResponse(res, true, '');
      cleanup();
      resolve(code);
    });
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('oauth_timeout'));
    }, 5 * 60 * 1000);
    function cleanup(): void {
      clearTimeout(timer);
      server.close();
      if (active?.server === server) active = null;
    }
    server.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    server.listen(OAUTH_PORT, '127.0.0.1');
    active = { state, codeVerifier, platform, resolve, reject, server, timer };
  });
}

export async function startGoogleOAuth(clientId: string): Promise<{ authUrl: string; wait: Promise<string> }> {
  const codeVerifier = base64Url(crypto.randomBytes(48));
  const codeChallenge = base64Url(crypto.createHash('sha256').update(codeVerifier).digest());
  const wait = waitForCode('youtube', codeVerifier);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state: active?.state ?? '',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  await shell.openExternal(authUrl);
  return { authUrl, wait };
}

export async function startTiktokOAuth(clientKey: string): Promise<{ authUrl: string; wait: Promise<string> }> {
  const wait = waitForCode('tiktok', null);
  const params = new URLSearchParams({
    client_key: clientKey,
    scope: TIKTOK_SCOPES.join(','),
    response_type: 'code',
    redirect_uri: REDIRECT_URI_TIKTOK,
    state: active?.state ?? '',
  });
  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
  await shell.openExternal(authUrl);
  return { authUrl, wait };
}

export function cancelActiveFlow(): void {
  if (active) {
    clearTimeout(active.timer);
    active.server.close();
    active.reject(new Error('oauth_cancelled'));
    active = null;
  }
}

export async function exchangeGoogleCode(code: string, codeVerifier: string | null, clientId: string, clientSecret: string): Promise<{ accessToken: string; refreshToken: string; expiresInSeconds: number; scope?: string }> {
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
    ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
  });
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const json = (await response.json()) as { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; error_description?: string };
  if (!response.ok || !json.access_token || !json.refresh_token) {
    throw new Error(json.error_description || 'google_token_exchange_failed');
  }
  return { accessToken: json.access_token, refreshToken: json.refresh_token, expiresInSeconds: json.expires_in ?? 3600, scope: json.scope };
}

export async function refreshGoogleToken(refreshToken: string, clientId: string, clientSecret: string): Promise<{ accessToken: string; expiresInSeconds: number }> {
  const body = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' });
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const json = (await response.json()) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!response.ok || !json.access_token) throw new Error(json.error_description || 'google_refresh_failed');
  return { accessToken: json.access_token, expiresInSeconds: json.expires_in ?? 3600 };
}

export async function exchangeTiktokCode(code: string, clientKey: string, clientSecret: string): Promise<{ accessToken: string; refreshToken: string; expiresInSeconds: number; openId?: string; scope?: string }> {
  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: REDIRECT_URI_TIKTOK,
  });
  const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const json = (await response.json()) as { access_token?: string; refresh_token?: string; expires_in?: number; open_id?: string; scope?: string; error_description?: string };
  if (!response.ok || !json.access_token || !json.refresh_token) {
    const errMsg = (json as { error?: string }).error || json.error_description || 'tiktok_token_exchange_failed';
    throw new Error(errMsg);
  }
  return { accessToken: json.access_token!, refreshToken: json.refresh_token!, expiresInSeconds: json.expires_in ?? 86400, openId: json.open_id, scope: json.scope };
}

export async function refreshTiktokToken(refreshToken: string, clientKey: string, clientSecret: string): Promise<{ accessToken: string; expiresInSeconds: number }> {
  const body = new URLSearchParams({ client_key: clientKey, client_secret: clientSecret, grant_type: 'refresh_token', refresh_token: refreshToken });
  const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const json = (await response.json()) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!response.ok || !json.access_token) throw new Error(json.error_description || 'tiktok_refresh_failed');
  return { accessToken: json.access_token, expiresInSeconds: json.expires_in ?? 86400 };
}
