import { createHash, timingSafeEqual } from 'node:crypto';
import { createReadStream } from 'node:fs';
import * as nodeFs from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

/**
 * Dans Electron, le module `fs` standard traite tout fichier `.asar` comme un dossier virtuel :
 * copier ou supprimer l'installation (qui contient resources/app.asar) échouait alors avec
 * « Invalid package ... app.asar » et la mise à jour ne démarrait jamais. `original-fs` voit
 * `app.asar` comme un simple fichier. Repli sur `fs` hors d'Electron (tests Node).
 */
const fsp: typeof nodeFs = (() => {
  try {
    return (require('original-fs') as typeof import('node:fs')).promises as unknown as typeof nodeFs;
  } catch {
    return nodeFs;
  }
})();
const { copyFile, cp, mkdir, readdir, rm, stat, statfs } = fsp;

export interface RecoveryPlan {
  installDir: string;
  backupDir: string;
  executableRelativePath: string;
  healthFile: string;
  rollbackResultPath: string;
  guardScriptPath: string;
  logPath: string;
  targetVersion: string;
}

export interface RollbackResult {
  failedVersion: string;
  rolledBackAt: string;
  failedInstallDir?: string;
  reason: string;
}

function isPathInside(parent: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative.length > 0 && !relative.startsWith('..') && !path.isAbsolute(relative);
}

async function directorySize(directory: string): Promise<bigint> {
  let total = 0n;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) total += await directorySize(entryPath);
    else if (entry.isFile()) total += BigInt((await stat(entryPath)).size);
  }
  return total;
}

export async function sha512Base64(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha512');
    const stream = createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('base64')));
  });
}

export async function verifySha512(filePath: string, expectedBase64: string): Promise<void> {
  const actual = Buffer.from(await sha512Base64(filePath), 'base64');
  const expected = Buffer.from(expectedBase64, 'base64');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error('SHA-512 mismatch for downloaded update');
  }
}

export async function prepareRecoveryPlan(options: {
  installDir: string;
  executablePath: string;
  recoveryRoot: string;
  guardScriptSource: string;
  logPath: string;
  targetVersion: string;
}): Promise<RecoveryPlan> {
  const installDir = path.resolve(options.installDir);
  const executablePath = path.resolve(options.executablePath);
  const recoveryRoot = path.resolve(options.recoveryRoot);
  if (!isPathInside(installDir, executablePath)) throw new Error('Application executable is outside the installation directory');
  if (isPathInside(installDir, recoveryRoot) || installDir === recoveryRoot) throw new Error('Recovery directory must be outside the installation directory');

  const safeVersion = options.targetVersion.replace(/[^0-9A-Za-z._-]/g, '_');
  const backupDir = path.join(recoveryRoot, `backup-before-${safeVersion}`);
  const healthFile = path.join(recoveryRoot, `healthy-${safeVersion}.json`);
  const rollbackResultPath = path.join(recoveryRoot, 'rollback-result.json');
  const guardScriptPath = path.join(recoveryRoot, 'update-rollback.ps1');
  await mkdir(recoveryRoot, { recursive: true });
  await rm(backupDir, { recursive: true, force: true });
  await rm(healthFile, { force: true });
  await rm(rollbackResultPath, { force: true });

  const requiredBytes = await directorySize(installDir);
  const volume = await statfs(recoveryRoot, { bigint: true });
  const freeBytes = volume.bavail * volume.bsize;
  const reserveBytes = 128n * 1024n * 1024n;
  if (freeBytes < requiredBytes + reserveBytes) throw new Error('Insufficient disk space to prepare automatic rollback');

  await cp(installDir, backupDir, { recursive: true, force: true, errorOnExist: false, dereference: false });
  await copyFile(options.guardScriptSource, guardScriptPath);

  return {
    installDir,
    backupDir,
    executableRelativePath: path.relative(installDir, executablePath),
    healthFile,
    rollbackResultPath,
    guardScriptPath,
    logPath: path.resolve(options.logPath),
    targetVersion: options.targetVersion,
  };
}

export function launchRollbackGuard(plan: RecoveryPlan, timeoutSeconds = 600): void {
  if (process.platform !== 'win32') return;
  const child = spawn('powershell.exe', [
    '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden',
    '-File', plan.guardScriptPath,
    '-InstallDir', plan.installDir,
    '-BackupDir', plan.backupDir,
    '-ExecutableRelativePath', plan.executableRelativePath,
    '-HealthFile', plan.healthFile,
    '-RollbackResultPath', plan.rollbackResultPath,
    '-LogPath', plan.logPath,
    '-TargetVersion', plan.targetVersion,
    '-TimeoutSeconds', String(timeoutSeconds),
  ], { detached: true, windowsHide: true, stdio: 'ignore' });
  child.unref();
}

export async function readRollbackResult(filePath: string): Promise<RollbackResult | null> {
  try {
    const value = JSON.parse(await readFile(filePath, 'utf-8')) as Partial<RollbackResult>;
    if (typeof value.failedVersion !== 'string' || typeof value.rolledBackAt !== 'string' || typeof value.reason !== 'string') return null;
    return value as RollbackResult;
  } catch {
    return null;
  }
}

export async function cleanRecoveryPlan(plan: RecoveryPlan): Promise<void> {
  await Promise.allSettled([
    rm(plan.backupDir, { recursive: true, force: true }),
    rm(plan.healthFile, { force: true }),
  ]);
}
