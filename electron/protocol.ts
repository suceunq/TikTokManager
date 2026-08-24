import { protocol, net } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { APP_MEDIA_PROTOCOL } from '../shared/ipc-contract';
import { getVideosDir, getThumbnailsDir, getPhotosDir } from './paths';
import { t } from './i18n';

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
        corsEnabled: false,
      },
    },
  ]);
}

export function registerAppMediaProtocolHandler(): void {
  protocol.handle(APP_MEDIA_PROTOCOL, async (request) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response(t('protocol.denied'), { status: 405 });
    }
    const url = new URL(request.url);
    const encodedPath = url.pathname.replace(/^\/+/, '');
    let absolutePath: string;
    try {
      absolutePath = decodeURIComponent(encodedPath);
    } catch {
      return new Response(t('protocol.invalidPath'), { status: 400 });
    }

    const videosDir = path.resolve(getVideosDir());
    const thumbnailsDir = path.resolve(getThumbnailsDir());
    const photosDir = path.resolve(getPhotosDir());
    const resolved = path.resolve(absolutePath);

    const isInside = (parent: string, candidate: string): boolean => {
      const rel = path.relative(parent, candidate);
      return rel.length > 0 && !rel.startsWith('..') && !path.isAbsolute(rel);
    };
    const isAllowed = isInside(videosDir, resolved) || isInside(thumbnailsDir, resolved) || isInside(photosDir, resolved);
    if (!isAllowed) {
      return new Response(t('protocol.denied'), { status: 403 });
    }

    try {
      const realPath = await import('node:fs/promises').then((fs) => fs.realpath(resolved));
      if (!isInside(videosDir, realPath) && !isInside(thumbnailsDir, realPath) && !isInside(photosDir, realPath)) {
        return new Response(t('protocol.denied'), { status: 403 });
      }
      return net.fetch(pathToFileURL(realPath).toString());
    } catch {
      return new Response(t('protocol.invalidPath'), { status: 404 });
    }
  });
}
