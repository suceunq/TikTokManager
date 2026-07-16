import type { Publication } from '../shared/types';

export function resetForReschedule(publication: Publication, nextScheduledAt: string): void {
  if (publication.scheduledAt === nextScheduledAt) return;
  publication.preReminderSentAt = null;
  publication.statut = 'planifie';
  publication.publishedAt = null;
}
