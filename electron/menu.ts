import { app, Menu, type MenuItemConstructorOptions, type BrowserWindow } from 'electron';
import { IPC } from '../shared/ipc-contract';
import type { AppUpdater } from './updater';
import { t } from './i18n';

/** Builds the native app menu, entirely in French to match the rest of the UI. Uses Electron's
 * standard roles for every item so shortcuts/behavior stay native - only the visible labels change.
 * Aide replaces the previously empty default Help menu with a real, discoverable update-check entry
 * that surfaces its result in the existing Parametres UI rather than a separate dialog. */
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
    {
      label: t('menu.file'), submenu: [{ role: 'quit', label: t('menu.quit') }],
    },
    {
      label: t('menu.edit'),
      submenu: [
        { role: 'undo', label: t('menu.undo') }, { role: 'redo', label: t('menu.redo') },
        { type: 'separator' },
        { role: 'cut', label: t('menu.cut') }, { role: 'copy', label: t('menu.copy') }, { role: 'paste', label: t('menu.paste') }, { role: 'delete', label: t('menu.delete') },
        { type: 'separator' },
        { role: 'selectAll', label: t('menu.selectAll') },
      ],
    },
    {
      label: t('menu.view'),
      submenu: [
        { role: 'reload', label: t('menu.reload') }, { role: 'forceReload', label: t('menu.forceReload') },
        ...(app.isPackaged ? [] : [{ role: 'toggleDevTools', label: t('menu.devTools') } as MenuItemConstructorOptions]),
        { type: 'separator' },
        { role: 'resetZoom', label: t('menu.actualSize') }, { role: 'zoomIn', label: t('menu.zoomIn') }, { role: 'zoomOut', label: t('menu.zoomOut') },
        { type: 'separator' },
        { role: 'togglefullscreen', label: t('menu.fullscreen') },
      ],
    },
    {
      label: t('menu.window'),
      submenu: [
        { role: 'minimize', label: t('menu.minimize') }, { role: 'close', label: t('menu.close') },
      ],
    },
    {
      label: t('menu.help'), submenu: [{ label: t('menu.checkUpdate'), click: checkForUpdates }],
    },
  ];

  return Menu.buildFromTemplate(template);
}
