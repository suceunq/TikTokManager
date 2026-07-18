import { shell } from 'electron';
import { IPC } from '../../shared/ipc-contract';
import { handle } from './helpers';
import { t } from '../i18n';
import { isOfficialPayPalUrl } from '../../shared/donation';
import { DEFAULT_DONATION_URL } from '../../shared/app-config';

export function registerShellIpc(): void {
  handle(IPC.SHELL.OPEN_TIKTOK_UPLOAD, async () => {
    await shell.openExternal('https://www.tiktok.com/upload');
  });
  handle(IPC.SHELL.OPEN_DONATION, async () => {
    if (!isOfficialPayPalUrl(DEFAULT_DONATION_URL)) throw new Error(t('donation.invalidUrl'));
    await shell.openExternal(DEFAULT_DONATION_URL);
  });
}
