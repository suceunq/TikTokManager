import { app } from 'electron';
import path from 'node:path';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import ffmpegStaticPath from 'ffmpeg-static';

function resolveFfmpegPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'ffmpeg-static', 'ffmpeg.exe');
  }
  return ffmpegStaticPath as unknown as string;
}

export async function generateThumbnail(videoPath: string, outputPath: string): Promise<boolean> {
  const ffmpegPath = resolveFfmpegPath();
  if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
    console.error('[ffmpeg] binaire introuvable:', ffmpegPath);
    return false;
  }

  return new Promise((resolve) => {
    const args = ['-y', '-ss', '00:00:00.5', '-i', videoPath, '-frames:v', '1', '-q:v', '3', outputPath];
    const child = spawn(ffmpegPath, args);

    let stderr = '';
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      console.error('[ffmpeg] erreur de lancement:', err);
      resolve(false);
    });

    child.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        resolve(true);
      } else {
        console.error('[ffmpeg] échec génération miniature, code:', code, stderr.slice(-500));
        resolve(false);
      }
    });
  });
}
