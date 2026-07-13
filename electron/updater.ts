import { app } from 'electron';
import { autoUpdater } from 'electron-updater';
import type { UpdateInfo } from 'builder-util-runtime';
import type { UpdateState } from '../shared/types';

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

/**
 * Checks/downloads/installs updates published as GitHub Releases of this repo (see `publish` in
 * electron-builder.yml). Disabled in development (unpackaged app) - there is no installed NSIS
 * artifact to update against.
 */
export class AppUpdater {
  private state: UpdateState;

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
    };

    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;

    autoUpdater.on('checking-for-update', () => {
      this.setState({ phase: 'checking', errorMessage: null });
    });
    autoUpdater.on('update-available', (info) => {
      this.setState({ phase: 'available', availableVersion: info.version, releaseNotes: extractReleaseNotes(info) });
    });
    autoUpdater.on('update-not-available', () => {
      this.setState({ phase: 'unavailable', availableVersion: null, errorMessage: null });
    });
    autoUpdater.on('download-progress', (progress) => {
      const speed = progress.bytesPerSecond || 0;
      const remaining = speed > 0 ? Math.max(0, Math.round((progress.total - progress.transferred) / speed)) : null;
      this.setState({ phase: 'downloading', progressPercent: Math.round(progress.percent), bytesPerSecond: speed, secondsRemaining: remaining });
    });
    autoUpdater.on('update-downloaded', () => {
      this.setState({ phase: 'ready', progressPercent: 100 });
    });
    autoUpdater.on('error', (error) => {
      this.setState({ phase: 'error', errorMessage: error instanceof Error ? error.message : String(error) });
    });
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
      this.setState({ phase: 'unavailable-dev', errorMessage: 'Vérification indisponible en mode développement.' });
      return this.getState();
    }
    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      this.setState({ phase: 'error', errorMessage: error instanceof Error ? error.message : String(error) });
    }
    return this.getState();
  }

  async download(): Promise<void> {
    if (!app.isPackaged || this.state.phase !== 'available') return;
    try {
      await autoUpdater.downloadUpdate();
    } catch (error) {
      this.setState({ phase: 'error', errorMessage: error instanceof Error ? error.message : String(error) });
    }
  }

  install(): void {
    if (this.state.phase !== 'ready') return;
    autoUpdater.quitAndInstall();
  }
}
