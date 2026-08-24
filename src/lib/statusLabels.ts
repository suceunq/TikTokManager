import type { StatutPublication, TypeContenu, Plateforme } from '@shared/types';
import type { TranslationKey } from '@shared/i18n';

export const STATUT_KEYS: Record<StatutPublication, TranslationKey> = { planifie: 'status.scheduled', rappel_envoye: 'status.reminderSent', en_cours: 'status.inProgress', publie: 'status.published', echec: 'status.failed', manque: 'status.missed', annule: 'status.cancelled' };

export const STATUT_COLORS: Record<StatutPublication, string> = {
  planifie: '#3B82F6',
  rappel_envoye: '#F59E0B',
  en_cours: '#8B5CF6',
  publie: '#22C55E',
  echec: '#EF4444',
  manque: '#EF4444',
  annule: '#6B7280',
};

export const TYPE_KEYS: Record<TypeContenu, TranslationKey> = { video: 'type.video', story: 'type.story', short: 'type.short', photo: 'planning.photos' };

export const PLATEFORME_LABELS: Record<Plateforme, TranslationKey> = { tiktok: 'platform.tiktok', youtube: 'platform.youtube' };
export const PLATEFORME_COLORS: Record<Plateforme, string> = { tiktok: '#FE2C55', youtube: '#FF0000' };
export const PLATEFORME_ICONS: Record<Plateforme, string> = { tiktok: '♪', youtube: '▶' };
