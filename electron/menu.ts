import { Menu, type MenuItemConstructorOptions, type BrowserWindow } from 'electron';
import { IPC } from '../shared/ipc-contract';
import type { AppUpdater } from './updater';

/** Builds the native app menu. File/Edit/View/Window keep Electron's standard roles (unchanged
 * behavior) - only Aide is customized, replacing the empty default Help menu with a real,
 * discoverable update-check entry that surfaces its result in the existing Parametres UI. */
export function buildAppMenu(getMainWindow: () => BrowserWindow | null, appUpdater: AppUpdater): Menu {
  const checkForUpdates = (): void => {
    const win = getMainWindow();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
      win.webContents.send(IPC.APP.NAVIGATE, '/parametres');
    }
    void appUpdater.check();
  };

  const template: MenuItemConstructorOptions[] = [
    { role: 'fileMenu' },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
    {
      label: 'Aide',
      submenu: [{ label: 'Rechercher une mise à jour', click: checkForUpdates }],
    },
  ];

  return Menu.buildFromTemplate(template);
}
