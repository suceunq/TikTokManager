import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { resolveLocale, translate, type SupportedLocale, type TranslationKey } from '@shared/i18n';
import { useSettings } from './SettingsContext';

interface I18nValue {
  locale: SupportedLocale;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const locale = resolveLocale(settings?.language, navigator.language);
  const value = useMemo<I18nValue>(() => ({ locale, t: (key, values) => translate(locale, key, values) }), [locale]);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}
