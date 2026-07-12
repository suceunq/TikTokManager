import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { IPC } from '../shared/ipc-contract';
import { registerAppMediaProtocolScheme, registerAppMediaProtocolHandler } from './protocol';
import { registerAccountsIpc } from './ipc/accounts.ipc';
import { registerSettingsIpc, applyStartOnLogin } from './ipc/settings.ipc';
import { registerFilesIpc } from './ipc/files.ipc';
import { registerPublicationsIpc } from './ipc/publications.ipc';
import { registerShellIpc } from './ipc/shell.ipc';
import { startScheduler, stopScheduler } from './scheduler/scheduler';
import { createTray } from './tray/tray';
import { isQuitting, setQuitting } from './appState';
import * as settingsRepo from './db/settings.repo';

app.setName('TikTok Manager');
app.setAppUserModelId('com.tiktokmanager.app');

registerAppMediaProtocolScheme();

let mainWindow: BrowserWindow | null = null;

function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

function getIconPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'build', 'icon.ico')
    : path.join(__dirname, '..', '..', 'build', 'icon.ico');
}

function createWindow(startMinimized: boolean): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    show: !startMinimized,
    icon: getIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'));
  }

  mainWindow.on('close', (event) => {
    if (!isQuitting()) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  registerAppMediaProtocolHandler();

  registerAccountsIpc();
  registerSettingsIpc();
  registerFilesIpc(getMainWindow);
  registerPublicationsIpc();
  registerShellIpc();

  const settings = settingsRepo.get();
  applyStartOnLogin(settings.startOnLogin);
  createWindow(settings.launchMinimizedToTray);

  createTray(getMainWindow, () => {
    mainWindow?.webContents.send(IPC.APP.NAVIGATE, '/planification/nouvelle');
  });

  startScheduler(getMainWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(false);
    } else {
      mainWindow?.show();
    }
  });
});

app.on('before-quit', () => {
  setQuitting(true);
  stopScheduler();
});

app.on('window-all-closed', () => {
  // Keep the app running in the tray (macOS-like behavior on all platforms),
  // since the scheduler must keep running to fire reminders.
});
