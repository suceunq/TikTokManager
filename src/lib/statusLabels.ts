import type { StatutPublication, TypeContenu } from '@shared/types';

export const STATUT_LABELS: Record<StatutPublication, string> = {
  planifie: 'Planifié',
  rappel_envoye: 'Rappel envoyé',
  publie: 'Publié',
  manque: 'Manqué',
  annule: 'Annulé',
};

export const STATUT_COLORS: Record<StatutPublication, string> = {
  planifie: '#3B82F6',
  rappel_envoye: '#F59E0B',
  publie: '#22C55E',
  manque: '#EF4444',
  annule: '#6B7280',
};

export const TYPE_LABELS: Record<TypeContenu, string> = {
  video: 'Vidéo',
  story: 'Story',
};
