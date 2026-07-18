import { shell } from 'electron';
import { IPC } from '../../shared/ipc-contract';
import { handle } from './helpers';
import { t } from '../i18n';
import { isOfficialPayPalUrl } from '../../shared/donation';

export function registerShellIpc(): void {
  handle(IPC.SHELL.OPEN_TIKTOK_UPLOAD, async () => {
    await shell.openExternal('https://www.tiktok.com/upload');
  });
  handle(IPC.SHELL.OPEN_DONATION, async (rawUrl: string) => {
    if (!isOfficialPayPalUrl(rawUrl)) throw new Error(t('donation.invalidUrl'));
    await shell.openExternal(new URL(rawUrl).toString());
  });
}
