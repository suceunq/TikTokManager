import { app } from 'electron';
import path from 'node:path';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import ffmpegStaticPath from 'ffmpeg-static';
import type { ValidationVideo } from '../../shared/types';

function resolveFfmpegPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'ffmpeg-static', 'ffmpeg.exe');
  }
  return ffmpegStaticPath as unknown as string;
}

export async function inspectVideo(videoPath: string): Promise<ValidationVideo> {
  const sizeBytes = fs.statSync(videoPath).size;
  const ffmpegPath = resolveFfmpegPath();
  const output = await new Promise<string>((resolve) => {
    const child = spawn(ffmpegPath, ['-i', videoPath, '-f', 'null', '-']);
    let stderr = '';
    child.stderr?.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', () => resolve(stderr));
    child.on('close', () => resolve(stderr));
  });
  const resolution = output.match(/Video:.*?\b(\d{2,5})x(\d{2,5})\b/);
  const duration = output.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  const width = resolution ? Number(resolution[1]) : null;
  const height = resolution ? Number(resolution[2]) : null;
  const durationSeconds = duration ? Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]) : null;
  const hasAudio = output.includes('Audio:') ? true : null;
  const warnings: string[] = [];
  if (width && height && height <= width) warnings.push('La vidéo n’est pas verticale (format 9:16 recommandé).');
  if (width && height && (width < 720 || height < 1280)) warnings.push('Résolution faible : 1080 × 1920 est recommandé.');
  if (durationSeconds && durationSeconds > 600) warnings.push('La vidéo dépasse 10 minutes.');
  if (hasAudio !== true) warnings.push('Aucune piste audio détectée.');
  if (sizeBytes > 4 * 1024 * 1024 * 1024) warnings.push('Le fichier dépasse 4 Go.');
  return { width, height, durationSeconds, sizeBytes, hasAudio, ready: warnings.length === 0, warnings };
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
