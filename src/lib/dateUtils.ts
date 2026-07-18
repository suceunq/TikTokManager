import { format, parseISO } from 'date-fns';
import { de, enUS, es, fr, it } from 'date-fns/locale';
import type { SupportedLocale } from '@shared/i18n';

export const dateLocales = { fr, en: enUS, es, de, it };

export function formatDateLong(iso: string, locale: SupportedLocale = 'fr'): string {
  return format(parseISO(iso), 'PPPPp', { locale: dateLocales[locale] });
}

export function formatDateShort(iso: string, locale: SupportedLocale = 'fr'): string {
  return format(parseISO(iso), 'Pp', { locale: dateLocales[locale] });
}

export function formatDayNumber(date: Date): string {
  return format(date, 'd', { locale: fr });
}

export function formatMonthYear(date: Date, locale: SupportedLocale = 'fr'): string {
  return format(date, 'MMMM yyyy', { locale: dateLocales[locale] });
}

export function formatWeekdayShort(date: Date, locale: SupportedLocale = 'fr'): string {
  return format(date, 'EEE', { locale: dateLocales[locale] });
}

export function toDateInputValue(iso: string): string {
  return format(parseISO(iso), 'yyyy-MM-dd');
}

export function toTimeInputValue(iso: string): string {
  return format(parseISO(iso), 'HH:mm');
}

export function combineDateAndTime(dateStr: string, timeStr: string): string {
  return new Date(`${dateStr}T${timeStr}:00`).toISOString();
}
