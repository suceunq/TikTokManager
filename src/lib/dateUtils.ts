import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export function formatDateLong(iso: string): string {
  return format(parseISO(iso), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });
}

export function formatDateShort(iso: string): string {
  return format(parseISO(iso), 'dd/MM/yyyy HH:mm', { locale: fr });
}

export function formatDayNumber(date: Date): string {
  return format(date, 'd', { locale: fr });
}

export function formatMonthYear(date: Date): string {
  return format(date, 'MMMM yyyy', { locale: fr });
}

export function formatWeekdayShort(date: Date): string {
  return format(date, 'EEE', { locale: fr });
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
