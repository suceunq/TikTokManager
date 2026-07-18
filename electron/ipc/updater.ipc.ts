import { IPC } from '../../shared/ipc-contract';
import type { AppUpdater } from '../updater';
import { handle } from './helpers';

export function registerUpdaterIpc(updater: AppUpdater): void {
  handle(IPC.UPDATE.STATE, () => updater.getState());
  handle(IPC.UPDATE.CHECK, () => updater.check());
  handle(IPC.UPDATE.ACK_INSTALLED, () => updater.acknowledgeInstalledRelease());
}
