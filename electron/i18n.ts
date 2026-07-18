import { app } from 'electron';
import { resolveLocale, translate, type TranslationKey } from '../shared/i18n';
import * as settingsRepo from './db/settings.repo';

export function getLocale() {
  return resolveLocale(settingsRepo.get().language, app.getLocale());
}

export function t(key: TranslationKey, values?: Record<string, string | number>): string {
  return translate(getLocale(), key, values);
}
