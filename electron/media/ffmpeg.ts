import { app } from 'electron';
import path from 'node:path';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { stat } from 'node:fs/promises';
import ffmpegStaticPath from 'ffmpeg-static';
import type { ValidationVideo } from '../../shared/types';
import { t } from '../i18n';

function resolveFfmpegPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'ffmpeg-static', 'ffmpeg.exe');
  }
  return ffmpegStaticPath as unknown as string;
}

export async function inspectVideo(videoPath: string): Promise<ValidationVideo> {
  const sizeBytes = (await stat(videoPath)).size;
  const ffmpegPath = resolveFfmpegPath();
  const output = await new Promise<string>((resolve) => {
    const child = spawn(ffmpegPath, ['-i', videoPath, '-f', 'null', '-'], { windowsHide: true });
    let stderr = '';
    let settled = false;
    const finish = () => { if (!settled) { settled = true; clearTimeout(timeout); resolve(stderr); } };
    const timeout = setTimeout(() => { child.kill(); finish(); }, 60_000);
    child.stderr?.on('data', (chunk) => { stderr = (stderr + chunk.toString()).slice(-128 * 1024); });
    child.on('error', finish);
    child.on('close', finish);
  });
  const resolution = output.match(/Video:.*?\b(\d{2,5})x(\d{2,5})\b/);
  const duration = output.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  const width = resolution ? Number(resolution[1]) : null;
  const height = resolution ? Number(resolution[2]) : null;
  const durationSeconds = duration ? Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]) : null;
  const hasAudio = output.includes('Audio:') ? true : null;
  const warnings: string[] = [];
  if (width && height && height <= width) warnings.push(t('video.warningVertical'));
  if (width && height && (width < 720 || height < 1280)) warnings.push(t('video.warningResolution'));
  if (durationSeconds && durationSeconds > 600) warnings.push(t('video.warningDuration'));
  if (hasAudio !== true) warnings.push(t('video.warningAudio'));
  if (sizeBytes > 4 * 1024 * 1024 * 1024) warnings.push(t('video.warningSize'));
  return { width, height, durationSeconds, sizeBytes, hasAudio, ready: warnings.length === 0, warnings };
}

export async function inspectImage(imagePath: string): Promise<{ width: number | null; height: number | null }> {
  const ffmpegPath = resolveFfmpegPath();
  const output = await new Promise<string>((resolve) => {
    const child = spawn(ffmpegPath, ['-i', imagePath], { windowsHide: true });
    let stderr = '';
    let settled = false;
    const finish = () => { if (!settled) { settled = true; clearTimeout(timeout); resolve(stderr); } };
    const timeout = setTimeout(() => { child.kill(); finish(); }, 30_000);
    child.stderr?.on('data', (chunk) => { stderr = (stderr + chunk.toString()).slice(-64 * 1024); });
    child.on('error', finish);
    child.on('close', finish);
  });
  const resolution = output.match(/Video:.*?\b(\d{2,5})x(\d{2,5})\b/);
  return { width: resolution ? Number(resolution[1]) : null, height: resolution ? Number(resolution[2]) : null };
}

export async function generateThumbnail(videoPath: string, outputPath: string): Promise<boolean> {
  const ffmpegPath = resolveFfmpegPath();
  if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
    console.error('[ffmpeg] binaire introuvable:', ffmpegPath);
    return false;
  }

  return new Promise((resolve) => {
    const args = ['-y', '-ss', '00:00:00.5', '-i', videoPath, '-frames:v', '1', '-q:v', '3', outputPath];
    const child = spawn(ffmpegPath, args, { windowsHide: true });

    let stderr = '';
    let settled = false;
    const finish = (success: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(success);
    };
    const timeout = setTimeout(() => {
      child.kill();
      console.error('[ffmpeg] délai dépassé pendant la génération de miniature');
      finish(false);
    }, 60_000);
    child.stderr?.on('data', (chunk) => {
      stderr = (stderr + chunk.toString()).slice(-64 * 1024);
    });

    child.on('error', (err) => {
      console.error('[ffmpeg] erreur de lancement:', err);
      finish(false);
    });

    child.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        finish(true);
      } else {
        console.error('[ffmpeg] échec génération miniature, code:', code, stderr.slice(-500));
        finish(false);
      }
    });
  });
}
