export type TypeContenu = 'video' | 'story';

export type StatutPublication = 'planifie' | 'rappel_envoye' | 'publie' | 'manque' | 'annule';

export interface Compte {
  id: string;
  nom: string;
  pseudoTiktok: string;
  couleur: string;
  createdAt: string;
  updatedAt: string;
}

export interface NouveauCompte {
  nom: string;
  pseudoTiktok: string;
  couleur: string;
}

export interface Publication {
  id: string;
  compteId: string;
  type: TypeContenu;
  titre: string;
  description: string;
  hashtags: string[];
  videoPath: string;
  thumbnailPath: string | null;
  scheduledAt: string;
  reminderLeadMinutes: number | null;
  preReminderSentAt: string | null;
  statut: StatutPublication;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NouvellePublication {
  compteId: string;
  type: TypeContenu;
  titre: string;
  description: string;
  hashtags: string[];
  videoPath: string;
  thumbnailPath: string | null;
  scheduledAt: string;
  reminderLeadMinutes: number | null;
}

export interface Settings {
  reminderLeadMinutesDefault: number;
  notificationsEnabled: boolean;
  preReminderEnabled: boolean;
  launchMinimizedToTray: boolean;
  startOnLogin: boolean;
}

export interface HistoriqueFiltre {
  compteId?: string;
  statut?: StatutPublication;
  dateDebut?: string;
  dateFin?: string;
}

export interface ImportVideoResult {
  videoPath: string;
  thumbnailPath: string | null;
  originalName: string;
}

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}
