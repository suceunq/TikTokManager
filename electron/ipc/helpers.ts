import { ipcMain } from 'electron';
import type { ApiResult } from '../../shared/types';

export function handle<T>(channel: string, fn: (...args: any[]) => T | Promise<T>): void {
  ipcMain.handle(channel, async (_event, ...args): Promise<ApiResult<T>> => {
    try {
      const data = await fn(...args);
      return { ok: true, data };
    } catch (err) {
      console.error(`[ipc:${channel}]`, err);
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });
}
