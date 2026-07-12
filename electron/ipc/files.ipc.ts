import { dialog, BrowserWindow } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { v4 as uuid } from 'uuid';
import { IPC } from '../../shared/ipc-contract';
import type { ImportVideoResult } from '../../shared/types';
import { getVideosDir, getThumbnailsDir } from '../paths';
import { generateThumbnail } from '../media/ffmpeg';
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
    const id = uuid();
    const destPath = path.join(getVideosDir(), `${id}${ext}`);

    fs.copyFileSync(sourcePath, destPath);

    const thumbnailDestPath = path.join(getThumbnailsDir(), `${id}.jpg`);
    const thumbnailOk = await generateThumbnail(destPath, thumbnailDestPath);

    return {
      videoPath: destPath,
      thumbnailPath: thumbnailOk ? thumbnailDestPath : null,
      originalName,
    };
  });
}
