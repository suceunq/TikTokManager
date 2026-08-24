import { app } from 'electron';
import { autoUpdater, type UpdateDownloadedEvent } from 'electron-updater';
import log from 'electron-log';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { UpdateInfo } from 'builder-util-runtime';
import type { InstalledReleaseInfo, UpdateState } from '../shared/types';
import { t } from './i18n';
import {
  cleanRecoveryPlan,
  launchRollbackGuard,
  prepareRecoveryPlan,
  readRollbackResult,
  verifySha512,
  type RecoveryPlan,
} from './update-recovery';

const CHECK_INTERVAL_MS = 60 * 60 * 1_000;
const STARTUP_CHECK_DELAY_MS = 10_000;
const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 15 * 60_000, 30 * 60_000];
const INSTALL_DELAY_MS = 1_500;
const HEALTH_CONFIRM_DELAY_MS = 15_000;
const RECOVERY_CLEANUP_DELAY_MS = 60_000;
const FAILED_VERSION_QUARANTINE_MS = 24 * 60 * 60 * 1_000;

interface Transaction {
  schemaVersion?: 1 | 2;
  fromVersion: string;
  version: string;
  releaseNotes: string | null;
  status: 'installing' | 'installed' | 'healthy' | 'rolledBack';
  startedAt: string;
  downloadedSha512?: string;
  recovery?: RecoveryPlan;
}

function extractReleaseNotes(info: UpdateInfo): string | null {
  if (typeof info.releaseNotes === 'string') return info.releaseNotes;
  if (Array.isArray(info.releaseNotes)) {
    const text = info.releaseNotes.map((note) => note.note ?? '').filter(Boolean).join('\n\n');
    return text || null;
  }
  return null;
}

function updatesDir(): string {
  return path.join(app.getPath('userData'), 'updates');
}

function transactionPath(): string {
  return path.join(updatesDir(), 'transaction.json');
}

function rollbackResultPath(): string {
  return path.join(updatesDir(), 'recovery', 'rollback-result.json');
}

function isTransaction(value: unknown): value is Transaction {
  if (!value || typeof value !== 'object') return false;
  const transaction = value as Partial<Transaction>;
  return (
    typeof transaction.fromVersion === 'string'
    && typeof transaction.version === 'string'
    && (transaction.releaseNotes === null || typeof transaction.releaseNotes === 'string')
    && ['installing', 'installed', 'healthy', 'rolledBack'].includes(transaction.status ?? '')
    && typeof transaction.startedAt === 'string'
  );
}

function expectedSha512(info: UpdateDownloadedEvent): string {
  const downloadedName = path.basename(info.downloadedFile).toLowerCase();
  const matchingFile = info.files.find((file) => {
    const cleanUrl = file.url.split(/[?#]/, 1)[0];
    try {
      return path.basename(decodeURIComponent(cleanUrl)).toLowerCase() === downloadedName;
    } catch {
      return path.basename(cleanUrl).toLowerCase() === downloadedName;
    }
  });
  const sha512 = matchingFile?.sha512 ?? (info.files.length === 1 ? info.files[0].sha512 : info.sha512);
  if (typeof sha512 !== 'string' || sha512.length < 80) {
    throw new Error('SHA-512 absent du manifeste de mise à jour');
  }
  return sha512;
}

/**
 * Automatic updater for packaged NSIS builds. A downloaded installer is accepted only after
 * electron-updater's verification and an independent SHA-512 comparison with latest.yml.
 * The current installation is copied outside its directory before the silent install so a
 * detached Windows guard can restore it if the new version never reports a healthy startup.
 */
export class AppUpdater {
  private state: UpdateState;
  private checking = false;
  private downloading = false;
  private retryIndex = 0;
  private periodicTimer: NodeJS.Timeout | null = null;
  private healthTimer: NodeJS.Timeout | null = null;
  private currentTransaction: Transaction | null = null;
  private quarantinedVersion: string | null = null;
  private quarantineUntil = 0;
  private readonly recoveryPromise: Promise<void>;

  constructor(
    private readonly emit: (state: UpdateState) => void,
    private readonly beforeInstall: () => void,
  ) {
    this.state = {
      phase: app.isPackaged ? 'idle' : 'unavailable-dev',
      currentVersion: app.getVersion(),
      availableVersion: null,
      releaseNotes: null,
      progressPercent: null,
      bytesPerSecond: null,
      secondsRemaining: null,
      errorMessage: null,
      automatic: true,
      nextCheckAt: null,
      installedRelease: null,
    };

    if (!app.isPackaged) {
      this.recoveryPromise = Promise.resolve();
      return;
    }

    const updaterLogPath = path.join(app.getPath('logs'), 'updater.log');
    log.transports.file.resolvePathFn = () => updaterLogPath;
    log.transports.file.maxSize = 2 * 1024 * 1024;
    autoUpdater.logger = log;
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.autoRunAppAfterInstall = true;
    autoUpdater.disableWebInstaller = true;

    autoUpdater.on('checking-for-update', () => {
      this.setState({ phase: 'checking', errorMessage: null });
    });
    autoUpdater.on('update-available', (info) => {
      void this.handleAvailable(info);
    });
    autoUpdater.on('update-not-available', () => {
      this.retryIndex = 0;
      this.setState({ phase: 'unavailable', availableVersion: null, errorMessage: null });
      this.scheduleNextCheck(CHECK_INTERVAL_MS);
    });
    autoUpdater.on('download-progress', (progress) => {
      const speed = progress.bytesPerSecond || 0;
      const remaining = speed > 0
        ? Math.max(0, Math.round((progress.total - progress.transferred) / speed))
        : null;
      this.setState({
        phase: 'downloading',
        progressPercent: Math.round(progress.percent),
        bytesPerSecond: speed,
        secondsRemaining: remaining,
      });
    });
    autoUpdater.on('update-downloaded', (info) => {
      void this.handleDownloaded(info).catch((error) => this.handleError(error));
    });
    autoUpdater.on('error', (error) => this.handleError(error));

    this.recoveryPromise = this.recoverPendingTransaction();
    this.scheduleNextCheck(STARTUP_CHECK_DELAY_MS);
  }

  private handleError(error: unknown): void {
    this.downloading = false;
    const message = error instanceof Error ? error.message : String(error);
    log.error('[updater]', error);
    this.setState({ phase: 'retrying', errorMessage: message });
    const delay = RETRY_DELAYS_MS[Math.min(this.retryIndex, RETRY_DELAYS_MS.length - 1)];
    this.retryIndex += 1;
    this.scheduleNextCheck(delay);
  }

  private scheduleNextCheck(delayMs: number): void {
    if (this.periodicTimer) clearTimeout(this.periodicTimer);
    const nextCheckAt = new Date(Date.now() + delayMs).toISOString();
    this.state = { ...this.state, nextCheckAt };
    this.periodicTimer = setTimeout(() => void this.check(), delayMs);
    this.periodicTimer.unref();
  }

  private async writeTransaction(transaction: Transaction): Promise<void> {
    const directory = updatesDir();
    const finalPath = transactionPath();
    const temporaryPath = `${finalPath}.tmp`;
    const backupPath = `${finalPath}.bak`;
    await mkdir(directory, { recursive: true });
    await writeFile(temporaryPath, JSON.stringify(transaction, null, 2), { encoding: 'utf-8', mode: 0o600 });
    await rm(backupPath, { force: true });
    try {
      await rename(finalPath, backupPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    try {
      await rename(temporaryPath, finalPath);
      await rm(backupPath, { force: true });
    } catch (error) {
      try {
        await rename(backupPath, finalPath);
      } catch {
        // Le fichier principal reste absent uniquement si aucune transaction précédente n'existait.
      }
      throw error;
    }
    this.currentTransaction = transaction;
  }

  private async readTransaction(): Promise<Transaction | null> {
    for (const candidate of [transactionPath(), `${transactionPath()}.bak`]) {
      try {
        const parsed = JSON.parse(await readFile(candidate, 'utf-8')) as unknown;
        if (isTransaction(parsed)) return parsed;
      } catch {
        // Essayer la sauvegarde atomique.
      }
    }
    return null;
  }

  private async recoverPendingTransaction(): Promise<void> {
    const rollback = await readRollbackResult(rollbackResultPath());
    if (rollback) {
      const rolledBackAt = Date.parse(rollback.rolledBackAt);
      if (Number.isFinite(rolledBackAt) && Date.now() - rolledBackAt < FAILED_VERSION_QUARANTINE_MS) {
        this.quarantinedVersion = rollback.failedVersion;
        this.quarantineUntil = rolledBackAt + FAILED_VERSION_QUARANTINE_MS;
        log.warn(`Version ${rollback.failedVersion} mise en quarantaine après rollback automatique`);
      }
    }

    const transaction = await this.readTransaction();
    if (!transaction) return;
    this.currentTransaction = transaction;

    if (transaction.version === app.getVersion() && transaction.status !== 'rolledBack') {
      const installedRelease: InstalledReleaseInfo = {
        version: transaction.version,
        previousVersion: transaction.fromVersion,
        releaseNotes: transaction.releaseNotes,
        installedAt: new Date().toISOString(),
      };
      this.state = { ...this.state, installedRelease };
      if (transaction.status === 'installing') {
        await this.writeTransaction({ ...transaction, status: 'installed' });
      }
      log.info(`Mise à jour ${transaction.fromVersion} -> ${transaction.version} démarrée avec succès`);
      return;
    }

    if (transaction.status === 'installing' || transaction.status === 'installed') {
      await this.writeTransaction({ ...transaction, status: 'rolledBack' });
      log.warn(`Version ${transaction.version} non active ; version ${app.getVersion()} conservée ou restaurée`);
    }
  }

  private async handleAvailable(info: UpdateInfo): Promise<void> {
    const releaseNotes = extractReleaseNotes(info);
    this.setState({ phase: 'available', availableVersion: info.version, releaseNotes, errorMessage: null });
    if (this.quarantinedVersion === info.version && Date.now() < this.quarantineUntil) {
      log.warn(`Téléchargement de ${info.version} suspendu jusqu'à la fin de sa quarantaine`);
      this.scheduleNextCheck(Math.max(60_000, this.quarantineUntil - Date.now()));
      return;
    }
    if (this.downloading) return;
    this.downloading = true;
    log.info(`Version ${info.version} disponible ; téléchargement automatique`);
    try {
      await autoUpdater.downloadUpdate();
    } catch (error) {
      this.handleError(error);
    }
  }

  private async handleDownloaded(info: UpdateDownloadedEvent): Promise<void> {
    this.downloading = false;
    const releaseNotes = extractReleaseNotes(info) ?? this.state.releaseNotes;
    const sha512 = expectedSha512(info);
    this.setState({
      phase: 'preparing',
      availableVersion: info.version,
      releaseNotes,
      progressPercent: 100,
      errorMessage: null,
    });

    await verifySha512(info.downloadedFile, sha512);
    const recovery = process.platform === 'win32'
      ? await prepareRecoveryPlan({
        installDir: path.dirname(app.getPath('exe')),
        executablePath: app.getPath('exe'),
        recoveryRoot: path.join(updatesDir(), 'recovery'),
        guardScriptSource: path.join(process.resourcesPath, 'update-rollback.ps1'),
        logPath: path.join(app.getPath('logs'), 'updater.log'),
        targetVersion: info.version,
      })
      : undefined;

    const transaction: Transaction = {
      schemaVersion: 2,
      fromVersion: app.getVersion(),
      version: info.version,
      releaseNotes,
      status: 'installing',
      startedAt: new Date().toISOString(),
      downloadedSha512: sha512,
      recovery,
    };
    await this.writeTransaction(transaction);
    if (recovery) launchRollbackGuard(recovery);

    log.info(`Téléchargement ${info.version} validé par SHA-512 ; installation silencieuse`);
    setTimeout(() => {
      this.beforeInstall();
      this.setState({ phase: 'installing' });
      autoUpdater.quitAndInstall(true, true);
    }, INSTALL_DELAY_MS).unref();
  }

  private setState(partial: Partial<UpdateState>): void {
    this.state = { ...this.state, currentVersion: app.getVersion(), ...partial };
    this.emit(this.state);
  }

  getState(): UpdateState {
    return { ...this.state, currentVersion: app.getVersion() };
  }

  async check(): Promise<UpdateState> {
    await this.recoveryPromise;
    if (!app.isPackaged) {
      this.setState({ phase: 'unavailable-dev', errorMessage: t('update.devError') });
      return this.getState();
    }
    if (this.checking || this.downloading || ['preparing', 'installing'].includes(this.state.phase)) {
      return this.getState();
    }
    this.checking = true;
    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      this.handleError(error);
    } finally {
      this.checking = false;
    }
    return this.getState();
  }

  async confirmHealthyStartup(): Promise<void> {
    await this.recoveryPromise;
    const transaction = this.currentTransaction;
    if (!transaction || transaction.version !== app.getVersion() || transaction.status === 'healthy') return;
    this.healthTimer = setTimeout(() => {
      void (async () => {
        if (transaction.recovery) {
          await writeFile(transaction.recovery.healthFile, JSON.stringify({
            version: app.getVersion(),
            healthyAt: new Date().toISOString(),
          }), { encoding: 'utf-8', mode: 0o600 });
        }
        if (this.currentTransaction) {
          await this.writeTransaction({ ...transaction, status: 'healthy' });
        } else {
          await rm(transactionPath(), { force: true });
        }
        log.info(`Version ${transaction.version} déclarée saine après chargement complet`);
        setTimeout(() => {
          if (transaction.recovery) void cleanRecoveryPlan(transaction.recovery);
        }, RECOVERY_CLEANUP_DELAY_MS).unref();
      })().catch((error) => log.error('[updater:health]', error));
    }, HEALTH_CONFIRM_DELAY_MS);
    this.healthTimer.unref();
  }

  async acknowledgeInstalledRelease(): Promise<void> {
    if (this.state.installedRelease) await rm(transactionPath(), { force: true });
    this.currentTransaction = null;
    this.setState({ phase: 'idle', installedRelease: null, availableVersion: null, releaseNotes: null });
  }

  dispose(): void {
    if (this.periodicTimer) clearTimeout(this.periodicTimer);
    if (this.healthTimer) clearTimeout(this.healthTimer);
    this.periodicTimer = null;
    this.healthTimer = null;
  }
}
