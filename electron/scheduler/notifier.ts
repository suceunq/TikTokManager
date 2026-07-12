import { Notification, BrowserWindow } from 'electron';
import { IPC } from '../../shared/ipc-contract';

export function notify(
  title: string,
  body: string,
  publicationId: string,
  getMainWindow: () => BrowserWindow | null
): void {
  if (!Notification.isSupported()) return;

  const notification = new Notification({ title, body, silent: false });

  notification.on('click', () => {
    const win = getMainWindow();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
      win.webContents.send(IPC.NOTIFICATIONS.NAVIGATE, publicationId);
    }
  });

  notification.show();
}
