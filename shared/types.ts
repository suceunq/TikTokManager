export type Plateforme = 'tiktok' | 'youtube';

export type TypeContenu = 'video' | 'story' | 'short' | 'photo';

export type StatutPublication = 'planifie' | 'rappel_envoye' | 'en_cours' | 'publie' | 'echec' | 'manque' | 'annule';

export type Visibilite = 'public' | 'unlisted' | 'private' | 'selfOnly' | 'friends';

export interface Connexion {
  plateforme: Plateforme;
  connecte: boolean;
  titreCompte: string | null;
  avatarUrl: string | null;
  scopes: string[];
  connectedAt: string | null;
  expiresAt: string | null;
}

export interface Compte {
  id: string;
  nom: string;
  plateforme: Plateforme;
  pseudoTiktok: string;
  chaineYoutube: string;
  couleur: string;
  createdAt: string;
  updatedAt: string;
}

export interface NouveauCompte {
  nom: string;
  plateforme: Plateforme;
  pseudoTiktok: string;
  chaineYoutube: string;
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
  photoPaths: string[];
  thumbnailPath: string | null;
  visibilite: Visibilite | null;
  scheduledAt: string;
  reminderLeadMinutes: number | null;
  preReminderSentAt: string | null;
  statut: StatutPublication;
  publishedAt: string | null;
  remoteId: string | null;
  remoteUrl: string | null;
  lastError: string | null;
  attemptCount: number;
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
  photoPaths: string[];
  thumbnailPath: string | null;
  visibilite: Visibilite | null;
  scheduledAt: string;
  reminderLeadMinutes: number | null;
}

export interface Settings {
  reminderLeadMinutesDefault: number;
  notificationsEnabled: boolean;
  preReminderEnabled: boolean;
  launchMinimizedToTray: boolean;
  startOnLogin: boolean;
  language: import('./i18n').LanguagePreference;
  showWelcomeOnStartup: boolean;
}

export interface CredentialsApi {
  googleClientId: string;
  googleClientSecret: string;
  tiktokClientKey: string;
  tiktokClientSecret: string;
}

export interface ConnexionResult {
  ok: boolean;
  titreCompte?: string;
  avatarUrl?: string | null;
  errorKey?: string;
  detail?: string;
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
  validation: ValidationVideo;
}

export interface ImportMediaResult {
  kind: 'video' | 'photo';
  mediaPath: string;
  originalName: string;
  thumbnailPath: string | null;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
}

export interface ValidationVideo {
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  sizeBytes: number;
  hasAudio: boolean | null;
  ready: boolean;
  warnings: string[];
}

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export type UpdatePhase =
  | 'idle'
  | 'checking'
  | 'available'
  | 'unavailable'
  | 'downloading'
  | 'preparing'
  | 'installing'
  | 'retrying'
  | 'error'
  | 'unavailable-dev';

export interface InstalledReleaseInfo {
  version: string;
  previousVersion: string;
  releaseNotes: string | null;
  installedAt: string;
}

export interface UpdateState {
  phase: UpdatePhase;
  currentVersion: string;
  availableVersion: string | null;
  releaseNotes: string | null;
  progressPercent: number | null;
  bytesPerSecond?: number | null;
  secondsRemaining?: number | null;
  errorMessage: string | null;
  automatic: boolean;
  nextCheckAt: string | null;
  installedRelease: InstalledReleaseInfo | null;
}
