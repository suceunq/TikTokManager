import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

function ensureDir(dir: string): string {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getUserDataPath(): string {
  return app.getPath('userData');
}

export function getVideosDir(): string {
  return ensureDir(path.join(getUserDataPath(), 'videos'));
}

export function getThumbnailsDir(): string {
  return ensureDir(path.join(getUserDataPath(), 'thumbnails'));
}
