import { Tray, Menu, BrowserWindow, app, nativeImage } from 'electron';
import path from 'node:path';
import { setQuitting } from '../appState';

let tray: Tray | null = null;

function getIconPath(): string {
  const iconFile = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
  return app.isPackaged
    ? path.join(process.resourcesPath, 'build', iconFile)
    : path.join(__dirname, '..', '..', '..', 'build', iconFile);
}

export function createTray(getMainWindow: () => BrowserWindow | null, onNewPublication: () => void): Tray {
  if (tray) return tray;

  let icon = nativeImage.createFromPath(getIconPath());
  if (icon.isEmpty()) {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip('TikTok Manager');

  const showWindow = () => {
    const win = getMainWindow();
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  };

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Ouvrir TikTok Manager', click: showWindow },
    { label: 'Nouvelle publication', click: () => { showWindow(); onNewPublication(); } },
    { type: 'separator' },
    {
      label: 'Quitter',
      click: () => {
        setQuitting(true);
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', showWindow);

  return tray;
}
