import { dialog, BrowserWindow } from 'electron';
import path from 'node:path';
import { copyFile, rm, stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { IPC } from '../../shared/ipc-contract';
import type { ImportMediaResult, ImportVideoResult } from '../../shared/types';
import { getVideosDir, getThumbnailsDir, getPhotosDir } from '../paths';
import { generateThumbnail, inspectImage, inspectVideo } from '../media/ffmpeg';
import { handle } from './helpers';
import { t } from '../i18n';

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.m4v'];
const PHOTO_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILE_BYTES = 4 * 1024 * 1024 * 1024;

export function registerFilesIpc(getMainWindow: () => BrowserWindow | null): void {
  handle(IPC.FILES.IMPORT_MEDIA, async (): Promise<ImportMediaResult[]> => {
    const win = getMainWindow();
    const dialogOptions: Electron.OpenDialogOptions = {
      title: t('planning.addMedia'),
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Médias', extensions: ['mp4', 'mov', 'webm', 'm4v', 'jpg', 'jpeg', 'png', 'webp'] },
      ],
    };
    const result = win ? await dialog.showOpenDialog(win, dialogOptions) : await dialog.showOpenDialog(dialogOptions);
    if (result.canceled || result.filePaths.length === 0) return [];
    return importPaths(result.filePaths);
  });

  handle(IPC.FILES.IMPORT_FROM_PATHS, async (paths: unknown): Promise<ImportMediaResult[]> => {
    if (!Array.isArray(paths) || paths.some((p) => typeof p !== 'string') || paths.length > 50) {
      throw new Error(t('validation.invalid', { label: t('validation.video') }));
    }
    return importPaths(paths as string[]);
  });

  handle(IPC.FILES.IMPORT_VIDEO, async (): Promise<ImportVideoResult | null> => {
    const win = getMainWindow();
    const dialogOptions: Electron.OpenDialogOptions = {
      title: t('dialog.importVideo'),
      properties: ['openFile'],
      filters: [{ name: t('dialog.videos'), extensions: ['mp4', 'mov', 'webm', 'm4v'] }],
    };
    const result = win
      ? await dialog.showOpenDialog(win, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions);

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const sourcePath = result.filePaths[0];
    const originalName = path.basename(sourcePath);
    const ext = path.extname(sourcePath).toLowerCase();
    if (!['.mp4', '.mov', '.webm', '.m4v'].includes(ext)) {
      throw new Error(t('validation.invalid', { label: t('validation.video') }));
    }
    const sourceSize = (await stat(sourcePath)).size;
    if (sourceSize > 4 * 1024 * 1024 * 1024) {
      throw new Error(t('validation.fileTooLarge'));
    }
    const id = randomUUID();
    const destPath = path.join(getVideosDir(), `${id}${ext}`);

    const thumbnailDestPath = path.join(getThumbnailsDir(), `${id}.jpg`);
    try {
      await copyFile(sourcePath, destPath);
      const thumbnailOk = await generateThumbnail(destPath, thumbnailDestPath);
      const validation = await inspectVideo(destPath);
      return {
        videoPath: destPath,
        thumbnailPath: thumbnailOk ? thumbnailDestPath : null,
        originalName,
        validation,
      };
    } catch (error) {
      await Promise.allSettled([rm(destPath, { force: true }), rm(thumbnailDestPath, { force: true })]);
      throw error;
    }
  });
}

async function importPaths(sourcePaths: string[]): Promise<ImportMediaResult[]> {
  const results: ImportMediaResult[] = [];
  for (const sourcePath of sourcePaths) {
    const ext = path.extname(sourcePath).toLowerCase();
    const isVideo = VIDEO_EXTENSIONS.includes(ext);
    const isPhoto = PHOTO_EXTENSIONS.includes(ext);
    if (!isVideo && !isPhoto) continue;
    const sourceSize = (await stat(sourcePath)).size;
    if (sourceSize > MAX_FILE_BYTES) throw new Error(t('validation.fileTooLarge'));
    const id = randomUUID();
    if (isVideo) {
      const destPath = path.join(getVideosDir(), `${id}${ext}`);
      const thumbnailDestPath = path.join(getThumbnailsDir(), `${id}.jpg`);
      try {
        await copyFile(sourcePath, destPath);
        const thumbnailOk = await generateThumbnail(destPath, thumbnailDestPath);
        const validation = await inspectVideo(destPath);
        results.push({
          kind: 'video', mediaPath: destPath, originalName: path.basename(sourcePath),
          thumbnailPath: thumbnailOk ? thumbnailDestPath : null,
          sizeBytes: validation.sizeBytes, width: validation.width, height: validation.height,
          durationSeconds: validation.durationSeconds,
        });
      } catch (error) {
        await Promise.allSettled([rm(destPath, { force: true }), rm(thumbnailDestPath, { force: true })]);
        throw error;
      }
    } else {
      const destPath = path.join(getPhotosDir(), `${id}${ext}`);
      try {
        await copyFile(sourcePath, destPath);
        const dimensions = await inspectImage(destPath);
        results.push({
          kind: 'photo', mediaPath: destPath, originalName: path.basename(sourcePath),
          thumbnailPath: null, sizeBytes: sourceSize,
          width: dimensions.width, height: dimensions.height, durationSeconds: null,
        });
      } catch (error) {
        await rm(destPath, { force: true });
        throw error;
      }
    }
  }
  return results;
}
