import type { Compte, Plateforme, TypeContenu } from './types';

export const PLATEFORMES = ['tiktok', 'youtube'] as const;

export function isPlateforme(value: unknown): value is Plateforme {
  return typeof value === 'string' && (PLATEFORMES as readonly string[]).includes(value);
}

export function handleFor(compte: Pick<Compte, 'plateforme' | 'pseudoTiktok' | 'chaineYoutube'>): string {
  return compte.plateforme === 'youtube' ? compte.chaineYoutube : compte.pseudoTiktok;
}

export function allowedContentTypes(plateforme: Plateforme): TypeContenu[] {
  return plateforme === 'youtube' ? ['short', 'video'] : ['video', 'photo', 'story'];
}

export function isContentTypeAllowed(type: TypeContenu, plateforme: Plateforme): boolean {
  return allowedContentTypes(plateforme).includes(type);
}

type CompteLike = {
  plateforme?: unknown;
  chaineYoutube?: unknown;
};

export function applyAccountMigration<T extends CompteLike>(compte: T): T & { plateforme: Plateforme; chaineYoutube: string } {
  if (isPlateforme(compte.plateforme)) {
    return {
      ...compte,
      plateforme: compte.plateforme,
      chaineYoutube: typeof compte.chaineYoutube === 'string' ? compte.chaineYoutube : '',
    };
  }
  return { ...compte, plateforme: 'tiktok', chaineYoutube: '' };
}

export function isPhotoPost(type: TypeContenu): boolean {
  return type === 'photo';
}

export function isManualOnly(type: TypeContenu): boolean {
  return type === 'story';
}

type PublicationLike = {
  photoPaths?: unknown;
  visibilite?: unknown;
  remoteId?: unknown;
  remoteUrl?: unknown;
  lastError?: unknown;
  attemptCount?: unknown;
};

export function applyPublicationMigration<T extends PublicationLike>(publication: T): T & {
  photoPaths: string[];
  visibilite: null;
  remoteId: null;
  remoteUrl: null;
  lastError: null;
  attemptCount: number;
} {
  return {
    ...publication,
    photoPaths: Array.isArray(publication.photoPaths) ? (publication.photoPaths as string[]) : [],
    visibilite: null,
    remoteId: null,
    remoteUrl: null,
    lastError: null,
    attemptCount: typeof publication.attemptCount === 'number' && Number.isInteger(publication.attemptCount)
      ? publication.attemptCount
      : 0,
  } as T & { photoPaths: string[]; visibilite: null; remoteId: null; remoteUrl: null; lastError: null; attemptCount: number };
}

export const VISIBILITES_YOUTUBE = ['public', 'unlisted', 'private'] as const;
export const VISIBILITES_TIKTOK = ['selfOnly', 'friends', 'public'] as const;

export function visibilitesPour(plateforme: Plateforme): string[] {
  return plateforme === 'youtube' ? [...VISIBILITES_YOUTUBE] : [...VISIBILITES_TIKTOK];
}
