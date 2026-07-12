import { app, Menu, type MenuItemConstructorOptions, type BrowserWindow } from 'electron';
import { IPC } from '../shared/ipc-contract';
import type { AppUpdater } from './updater';

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
      label: 'Fichier',
      submenu: [{ role: 'quit', label: 'Quitter' }],
    },
    {
      label: 'Édition',
      submenu: [
        { role: 'undo', label: 'Annuler' },
        { role: 'redo', label: 'Rétablir' },
        { type: 'separator' },
        { role: 'cut', label: 'Couper' },
        { role: 'copy', label: 'Copier' },
        { role: 'paste', label: 'Coller' },
        { role: 'delete', label: 'Supprimer' },
        { type: 'separator' },
        { role: 'selectAll', label: 'Tout sélectionner' },
      ],
    },
    {
      label: 'Affichage',
      submenu: [
        { role: 'reload', label: 'Recharger' },
        { role: 'forceReload', label: 'Forcer le rechargement' },
        ...(app.isPackaged ? [] : [{ role: 'toggleDevTools', label: 'Outils de développement' } as MenuItemConstructorOptions]),
        { type: 'separator' },
        { role: 'resetZoom', label: 'Taille réelle' },
        { role: 'zoomIn', label: 'Zoom avant' },
        { role: 'zoomOut', label: 'Zoom arrière' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Plein écran' },
      ],
    },
    {
      label: 'Fenêtre',
      submenu: [
        { role: 'minimize', label: 'Réduire' },
        { role: 'close', label: 'Fermer' },
      ],
    },
    {
      label: 'Aide',
      submenu: [{ label: 'Rechercher une mise à jour', click: checkForUpdates }],
    },
  ];

  return Menu.buildFromTemplate(template);
}
