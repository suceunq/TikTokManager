import { dialog, BrowserWindow } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { IPC } from '../../shared/ipc-contract';
import type { ImportVideoResult } from '../../shared/types';
import { getVideosDir, getThumbnailsDir } from '../paths';
import { generateThumbnail, inspectVideo } from '../media/ffmpeg';
import { handle } from './helpers';

export function registerFilesIpc(getMainWindow: () => BrowserWindow | null): void {
  handle(IPC.FILES.IMPORT_VIDEO, async (): Promise<ImportVideoResult | null> => {
    const win = getMainWindow();
    const dialogOptions: Electron.OpenDialogOptions = {
      title: 'Importer une vidéo',
      properties: ['openFile'],
      filters: [{ name: 'Vidéos', extensions: ['mp4', 'mov', 'webm', 'm4v'] }],
    };
    const result = win
      ? await dialog.showOpenDialog(win, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions);

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const sourcePath = result.filePaths[0];
    const originalName = path.basename(sourcePath);
    const ext = path.extname(sourcePath) || '.mp4';
    const sourceSize = fs.statSync(sourcePath).size;
    if (sourceSize > 4 * 1024 * 1024 * 1024) {
      throw new Error('La vidéo dépasse la limite de sécurité de 4 Go.');
    }
    const id = randomUUID();
    const destPath = path.join(getVideosDir(), `${id}${ext}`);

    fs.copyFileSync(sourcePath, destPath);

    const thumbnailDestPath = path.join(getThumbnailsDir(), `${id}.jpg`);
    const thumbnailOk = await generateThumbnail(destPath, thumbnailDestPath);
    const validation = await inspectVideo(destPath);

    return {
      videoPath: destPath,
      thumbnailPath: thumbnailOk ? thumbnailDestPath : null,
      originalName,
      validation,
    };
  });
}
