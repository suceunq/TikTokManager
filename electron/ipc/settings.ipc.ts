import { app } from 'electron';
import { IPC } from '../../shared/ipc-contract';
import type { Settings } from '../../shared/types';
import * as settingsRepo from '../db/settings.repo';

import { handle } from './helpers';
import { validateSettings } from '../validation';

export function applyStartOnLogin(enabled: boolean): void {
  app.setLoginItemSettings({ openAtLogin: enabled });
}

export function registerSettingsIpc(onLanguageChanged?: () => void): void {
  handle(IPC.SETTINGS.GET, () => settingsRepo.get());
  handle(IPC.SETTINGS.UPDATE, (partial: Partial<Settings>) => {
    const updated = settingsRepo.update(validateSettings(partial));
    if (partial.startOnLogin !== undefined) {
      applyStartOnLogin(updated.startOnLogin);
    }
    if (partial.language !== undefined) onLanguageChanged?.();
    return updated;
  });
}
