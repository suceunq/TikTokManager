import { randomUUID } from 'node:crypto';
import { getStore, persist } from './store';
import type { Compte, Connexion, NouveauCompte } from '../../shared/types';
import { cleanupPublicationMedia } from '../media/cleanup';
import { getLocale, t } from '../i18n';

export function list(): Compte[] {
  return [...getStore().comptes].sort((a, b) => a.nom.localeCompare(b.nom, getLocale(), { sensitivity: 'base' }));
}

export function getById(id: string): Compte | null {
  return getStore().comptes.find((c) => c.id === id) ?? null;
}

export function create(input: NouveauCompte): Compte {
  const now = new Date().toISOString();
  const compte: Compte = {
    id: randomUUID(),
    nom: input.nom,
    plateforme: input.plateforme,
    pseudoTiktok: input.pseudoTiktok,
    chaineYoutube: input.chaineYoutube,
    couleur: input.couleur,
    createdAt: now,
    updatedAt: now,
  };
  getStore().comptes.push(compte);
  persist();
  return compte;
}

export function update(id: string, input: NouveauCompte): Compte {
  const store = getStore();
  const compte = store.comptes.find((c) => c.id === id);
  if (!compte) throw new Error(t('validation.accountMissing'));
  compte.nom = input.nom;
  compte.plateforme = input.plateforme;
  compte.pseudoTiktok = input.pseudoTiktok;
  compte.chaineYoutube = input.chaineYoutube;
  compte.couleur = input.couleur;
  compte.updatedAt = new Date().toISOString();
  persist();
  return compte;
}

export function countPublicationsForAccount(id: string): number {
  return getStore().publications.filter((p) => p.compteId === id).length;
}

export function remove(id: string): void {
  const store = getStore();
  const removed = store.publications.filter((p) => p.compteId === id);
  store.comptes = store.comptes.filter((c) => c.id !== id);
  store.publications = store.publications.filter((p) => p.compteId !== id);
  persist();
  for (const publication of removed) cleanupPublicationMedia(publication.videoPath, publication.thumbnailPath);
}

export function getConnexion(compteId: string): Connexion | null {
  return getStore().connexions[compteId] ?? null;
}

export function setConnexion(compteId: string, connexion: Connexion): void {
  const store = getStore();
  store.connexions[compteId] = connexion;
  persist();
}

export function clearConnexion(compteId: string): void {
  const store = getStore();
  delete store.connexions[compteId];
  persist();
}
