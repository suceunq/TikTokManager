import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { HistoriqueFiltre, NouvellePublication, Publication } from '@shared/types';
import { api, unwrap } from '../lib/ipc';

interface PublicationsContextValue {
  publications: Publication[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  listBetween: (startIso: string, endIso: string) => Promise<Publication[]>;
  listHistorique: (filtre: HistoriqueFiltre) => Promise<Publication[]>;
  create: (input: NouvellePublication) => Promise<Publication>;
  update: (id: string, input: NouvellePublication) => Promise<Publication>;
  remove: (id: string) => Promise<void>;
  markPublished: (id: string) => Promise<Publication>;
  cancel: (id: string) => Promise<Publication>;
  getById: (id: string) => Publication | undefined;
}

const PublicationsContext = createContext<PublicationsContextValue | null>(null);

export function PublicationsProvider({ children }: { children: ReactNode }) {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await unwrap(api.publications.list());
      setPublications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const listBetween = useCallback(
    (startIso: string, endIso: string) => unwrap(api.publications.listBetween(startIso, endIso)),
    []
  );

  const listHistorique = useCallback(
    (filtre: HistoriqueFiltre) => unwrap(api.publications.listHistorique(filtre)),
    []
  );

  const create = useCallback(async (input: NouvellePublication) => {
    const created = await unwrap(api.publications.create(input));
    await refresh();
    return created;
  }, [refresh]);

  const update = useCallback(async (id: string, input: NouvellePublication) => {
    const updated = await unwrap(api.publications.update(id, input));
    await refresh();
    return updated;
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    await unwrap(api.publications.remove(id));
    await refresh();
  }, [refresh]);

  const markPublished = useCallback(async (id: string) => {
    const updated = await unwrap(api.publications.markPublished(id));
    await refresh();
    return updated;
  }, [refresh]);

  const cancel = useCallback(async (id: string) => {
    const updated = await unwrap(api.publications.cancel(id));
    await refresh();
    return updated;
  }, [refresh]);

  const getById = useCallback((id: string) => publications.find((p) => p.id === id), [publications]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <PublicationsContext.Provider
      value={{ publications, loading, error, refresh, listBetween, listHistorique, create, update, remove, markPublished, cancel, getById }}
    >
      {children}
    </PublicationsContext.Provider>
  );
}

export function usePublications(): PublicationsContextValue {
  const ctx = useContext(PublicationsContext);
  if (!ctx) throw new Error('usePublications doit être utilisé dans un PublicationsProvider');
  return ctx;
}
