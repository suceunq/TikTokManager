import { app, ipcMain } from 'electron';
import type { ApiResult } from '../../shared/types';
import { isTrustedRendererUrl } from '../security';

export function handle<T>(channel: string, fn: (...args: any[]) => T | Promise<T>): void {
  ipcMain.handle(channel, async (event, ...args): Promise<ApiResult<T>> => {
    try {
      const frame = event.senderFrame;
      if (!frame || frame !== event.sender.mainFrame || !isTrustedRendererUrl(frame.url, app.isPackaged, app.getAppPath())) {
        throw new Error('Requête IPC refusée');
      }
      const data = await fn(...args);
      return { ok: true, data };
    } catch (err) {
      console.error(`[ipc:${channel}]`, err);
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });
}
