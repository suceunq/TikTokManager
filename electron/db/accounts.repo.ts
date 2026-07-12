import { randomUUID } from 'node:crypto';
import { getStore, persist } from './store';
import type { Compte, NouveauCompte } from '../../shared/types';

export function list(): Compte[] {
  return [...getStore().comptes].sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }));
}

export function getById(id: string): Compte | null {
  return getStore().comptes.find((c) => c.id === id) ?? null;
}

export function create(input: NouveauCompte): Compte {
  const now = new Date().toISOString();
  const compte: Compte = {
    id: randomUUID(),
    nom: input.nom,
    pseudoTiktok: input.pseudoTiktok,
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
  if (!compte) throw new Error('Compte introuvable');
  compte.nom = input.nom;
  compte.pseudoTiktok = input.pseudoTiktok;
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
  store.comptes = store.comptes.filter((c) => c.id !== id);
  store.publications = store.publications.filter((p) => p.compteId !== id);
  persist();
}
