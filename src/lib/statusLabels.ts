import type { StatutPublication, TypeContenu } from '@shared/types';
import type { TranslationKey } from '@shared/i18n';

export const STATUT_KEYS: Record<StatutPublication, TranslationKey> = { planifie: 'status.scheduled', rappel_envoye: 'status.reminderSent', publie: 'status.published', manque: 'status.missed', annule: 'status.cancelled' };

export const STATUT_COLORS: Record<StatutPublication, string> = {
  planifie: '#3B82F6',
  rappel_envoye: '#F59E0B',
  publie: '#22C55E',
  manque: '#EF4444',
  annule: '#6B7280',
};

export const TYPE_KEYS: Record<TypeContenu, TranslationKey> = { video: 'type.video', story: 'type.story' };
