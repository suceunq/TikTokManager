import { shell } from 'electron';
import { IPC } from '../../shared/ipc-contract';
import { handle } from './helpers';

export function registerShellIpc(): void {
  handle(IPC.SHELL.OPEN_TIKTOK_UPLOAD, async () => {
    await shell.openExternal('https://www.tiktok.com/upload');
  });
}
