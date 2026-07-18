import { BrowserWindow } from 'electron';
import * as publicationsRepo from '../db/publications.repo';
import * as settingsRepo from '../db/settings.repo';
import { notify } from './notifier';
import { t } from '../i18n';

const TICK_INTERVAL_MS = 30_000;
const STALE_GRACE_HOURS = 24;

let intervalHandle: ReturnType<typeof setInterval> | null = null;

function tick(getMainWindow: () => BrowserWindow | null): void {
  try {
  const settings = settingsRepo.get();
  if (!settings.notificationsEnabled) return;

  const now = new Date();
  const nowIso = now.toISOString();

  if (settings.preReminderEnabled) {
    const upcoming = publicationsRepo.listNeedingPreReminder(nowIso, settings.reminderLeadMinutesDefault);
    for (const pub of upcoming) {
      const minutesLeft = Math.max(
        1,
        Math.round((new Date(pub.scheduledAt).getTime() - now.getTime()) / 60000)
      );
      notify(
        t('notification.reminderTitle'), t('notification.reminderBody', { title: pub.titre, minutes: minutesLeft }),
        pub.id,
        getMainWindow
      );
      publicationsRepo.markPreReminderSent(pub.id);
    }
  }

  const due = publicationsRepo.listDuePublications(nowIso);
  for (const pub of due) {
    if (pub.statut === 'planifie') {
      notify(
        t('notification.dueTitle'), t('notification.dueBody', { title: pub.titre }),
        pub.id,
        getMainWindow
      );
      publicationsRepo.setStatut(pub.id, 'rappel_envoye');
    }
  }

  const cutoff = new Date(now.getTime() - STALE_GRACE_HOURS * 60 * 60 * 1000).toISOString();
  const stale = publicationsRepo.listStale(cutoff);
  for (const pub of stale) {
    publicationsRepo.setStatut(pub.id, 'manque');
  }
  } catch (error) {
    console.error('[scheduler] Échec du cycle de rappels:', error);
  }
}

export function startScheduler(getMainWindow: () => BrowserWindow | null): void {
  if (intervalHandle) return;
  tick(getMainWindow);
  intervalHandle = setInterval(() => tick(getMainWindow), TICK_INTERVAL_MS);
}

export function stopScheduler(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
