import { protocol, net } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { APP_MEDIA_PROTOCOL } from '../shared/ipc-contract';
import { getVideosDir, getThumbnailsDir } from './paths';

export function registerAppMediaProtocolScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: APP_MEDIA_PROTOCOL,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        bypassCSP: false,
        corsEnabled: true,
      },
    },
  ]);
}

export function registerAppMediaProtocolHandler(): void {
  protocol.handle(APP_MEDIA_PROTOCOL, (request) => {
    const url = new URL(request.url);
    const encodedPath = url.pathname.replace(/^\/+/, '');
    let absolutePath: string;
    try {
      absolutePath = decodeURIComponent(encodedPath);
    } catch {
      return new Response('Chemin invalide', { status: 400 });
    }

    const videosDir = path.resolve(getVideosDir());
    const thumbnailsDir = path.resolve(getThumbnailsDir());
    const resolved = path.resolve(absolutePath);

    const isAllowed = resolved.startsWith(videosDir + path.sep) || resolved.startsWith(thumbnailsDir + path.sep);
    if (!isAllowed) {
      return new Response('Accès refusé', { status: 403 });
    }

    return net.fetch(pathToFileURL(resolved).toString());
  });
}
