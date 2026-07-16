import fs from 'node:fs';
import path from 'node:path';
import { getStore } from '../db/store';
import { getThumbnailsDir, getVideosDir } from '../paths';

function removeIfUnused(filePath: string | null): void {
  if (!filePath) return;
  const used = getStore().publications.some((publication) =>
    publication.videoPath === filePath || publication.thumbnailPath === filePath
  );
  if (!used) {
    try { fs.rmSync(filePath, { force: true }); } catch (error) { console.error('[media] Nettoyage impossible:', error); }
  }
}

export function cleanupPublicationMedia(videoPath: string, thumbnailPath: string | null): void {
  removeIfUnused(videoPath);
  removeIfUnused(thumbnailPath);
}

export function cleanupOrphanMedia(maxAgeMs = 24 * 60 * 60 * 1000): void {
  const referenced = new Set(getStore().publications.flatMap((p) => [p.videoPath, p.thumbnailPath].filter(Boolean) as string[]));
  const cutoff = Date.now() - maxAgeMs;
  for (const directory of [getVideosDir(), getThumbnailsDir()]) {
    for (const name of fs.readdirSync(directory)) {
      const filePath = path.join(directory, name);
      try {
        const stat = fs.statSync(filePath);
        if (stat.isFile() && stat.mtimeMs < cutoff && !referenced.has(filePath)) fs.rmSync(filePath, { force: true });
      } catch (error) {
        console.error('[media] Inspection impossible:', error);
      }
    }
  }
}
