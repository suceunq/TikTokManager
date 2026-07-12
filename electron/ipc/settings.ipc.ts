import { app } from 'electron';
import { IPC } from '../../shared/ipc-contract';
import type { Settings } from '../../shared/types';
import * as settingsRepo from '../db/settings.repo';

import { handle } from './helpers';

export function applyStartOnLogin(enabled: boolean): void {
  app.setLoginItemSettings({ openAtLogin: enabled });
}

export function registerSettingsIpc(): void {
  handle(IPC.SETTINGS.GET, () => settingsRepo.get());
  handle(IPC.SETTINGS.UPDATE, (partial: Partial<Settings>) => {
    const updated = settingsRepo.update(partial);
    if (partial.startOnLogin !== undefined) {
      applyStartOnLogin(updated.startOnLogin);
    }
    return updated;
  });
}
