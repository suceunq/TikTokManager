import { app } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { UpdateInfo } from 'builder-util-runtime';
import type { InstalledReleaseInfo, UpdateState } from '../shared/types';
import { t } from './i18n';

const CHECK_INTERVAL_MS = 60 * 60 * 1_000;
const STARTUP_CHECK_DELAY_MS = 10_000;
const RETRY_DELAY_MS = 15 * 60 * 1_000;
const INSTALL_DELAY_MS = 1_500;

interface Transaction {
  fromVersion: string;
  version: string;
  releaseNotes: string | null;
  status: 'installing' | 'installed' | 'rolledBack';
  startedAt: string;
}

function extractReleaseNotes(info: UpdateInfo): string | null {
  if (typeof info.releaseNotes === 'string') return info.releaseNotes;
  if (Array.isArray(info.releaseNotes)) {
    const text = info.releaseNotes
      .map((n) => n.note ?? '')
      .filter(Boolean)
      .join('\n\n');
    return text || null;
  }
  return null;
}

function updatesDir(): string {
  return join(app.getPath('userData'), 'updates');
}

function transactionPath(): string {
  return join(updatesDir(), 'transaction.json');
}

/**
 * Checks/downloads/installs updates published as GitHub Releases of this repo (see `publish` in
 * electron-builder.yml), entirely silently: no confirmation is ever requested. Integrity is
 * verified by electron-updater's built-in checksum check against latest.yml before an update is
 * ever installed. Disabled in development (unpackaged app) - there is no installed NSIS artifact
 * to update against.
 */
export class AppUpdater {
  private state: UpdateState;
  private checking = false;
  private periodicTimer: NodeJS.Timeout | null = null;

  constructor(private readonly emit: (state: UpdateState) => void) {
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

    if (!app.isPackaged) return;

    log.transports.file.maxSize = 2 * 1024 * 1024;
    autoUpdater.logger = log;
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('checking-for-update', () => {
      this.setState({ phase: 'checking', errorMessage: null });
    });
    autoUpdater.on('update-available', (info) => {
      log.info(`Version ${info.version} disponible ; telechargement automatique`);
      this.setState({ phase: 'available', availableVersion: info.version, releaseNotes: extractReleaseNotes(info) });
    });
    autoUpdater.on('update-not-available', () => {
      this.setState({ phase: 'unavailable', availableVersion: null, errorMessage: null });
      this.scheduleNextCheck(CHECK_INTERVAL_MS);
    });
    autoUpdater.on('download-progress', (progress) => {
      const speed = progress.bytesPerSecond || 0;
      const remaining = speed > 0 ? Math.max(0, Math.round((progress.total - progress.transferred) / speed)) : null;
      this.setState({ phase: 'downloading', progressPercent: Math.round(progress.percent), bytesPerSecond: speed, secondsRemaining: remaining });
    });
    autoUpdater.on('update-downloaded', (info) => {
      void this.handleDownloaded(info);
    });
    autoUpdater.on('error', (error) => {
      log.error(error);
      this.setState({ phase: 'retrying', errorMessage: error instanceof Error ? error.message : String(error) });
      this.scheduleNextCheck(RETRY_DELAY_MS);
    });

    void this.recoverPendingTransaction();
    this.scheduleNextCheck(STARTUP_CHECK_DELAY_MS);
  }

  private scheduleNextCheck(delayMs: number): void {
    if (this.periodicTimer) clearTimeout(this.periodicTimer);
    const nextCheckAt = new Date(Date.now() + delayMs).toISOString();
    this.state = { ...this.state, nextCheckAt };
    this.periodicTimer = setTimeout(() => void this.check(), delayMs);
    this.periodicTimer.unref();
  }

  private async writeTransaction(transaction: Transaction): Promise<void> {
    await mkdir(updatesDir(), { recursive: true });
    await writeFile(transactionPath(), JSON.stringify(transaction, null, 2), 'utf-8');
  }

  /** On startup, detects whether the previous silent install actually succeeded. */
  private async recoverPendingTransaction(): Promise<void> {
    try {
      const raw = await readFile(transactionPath(), 'utf-8');
      const transaction = JSON.parse(raw) as Transaction;
      if (transaction.status !== 'installing') return;
      if (transaction.version === app.getVersion()) {
        const installedRelease: InstalledReleaseInfo = {
          version: transaction.version,
          previousVersion: transaction.fromVersion,
          releaseNotes: transaction.releaseNotes,
          installedAt: new Date().toISOString(),
        };
        this.state = { ...this.state, installedRelease };
        await this.writeTransaction({ ...transaction, status: 'installed' });
        log.info(`Mise a jour ${transaction.fromVersion} -> ${transaction.version} appliquee avec succes`);
      } else {
        await this.writeTransaction({ ...transaction, status: 'rolledBack' });
        log.warn(`Installation de ${transaction.version} non appliquee ; version ${app.getVersion()} conservee`);
      }
    } catch {
      // aucune transaction precedente
    }
  }

  private async handleDownloaded(info: UpdateInfo): Promise<void> {
    const releaseNotes = extractReleaseNotes(info) ?? this.state.releaseNotes;
    await this.writeTransaction({
      fromVersion: app.getVersion(),
      version: info.version,
      releaseNotes,
      status: 'installing',
      startedAt: new Date().toISOString(),
    });
    log.info(`Telechargement de ${info.version} verifie (integrite OK) ; installation silencieuse programmee`);
    this.setState({ phase: 'preparing', availableVersion: info.version, releaseNotes, progressPercent: 100 });
    setTimeout(() => {
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
    if (!app.isPackaged) {
      this.setState({ phase: 'unavailable-dev', errorMessage: t('update.devError') });
      return this.getState();
    }
    if (this.checking || this.state.phase === 'downloading' || this.state.phase === 'preparing' || this.state.phase === 'installing') {
      return this.getState();
    }
    this.checking = true;
    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      log.error(error);
      this.setState({ phase: 'retrying', errorMessage: error instanceof Error ? error.message : String(error) });
      this.scheduleNextCheck(RETRY_DELAY_MS);
    } finally {
      this.checking = false;
    }
    return this.getState();
  }

  async acknowledgeInstalledRelease(): Promise<void> {
    if (this.state.installedRelease) {
      await rm(transactionPath(), { force: true });
    }
    this.setState({ phase: 'idle', installedRelease: null, availableVersion: null, releaseNotes: null });
  }
}
