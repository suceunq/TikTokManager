import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Compte, NouveauCompte } from '@shared/types';
import { api, unwrap } from '../lib/ipc';

interface AccountsContextValue {
  accounts: Compte[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (input: NouveauCompte) => Promise<Compte>;
  update: (id: string, input: NouveauCompte) => Promise<Compte>;
  remove: (id: string) => Promise<{ removedPublications: number }>;
  getById: (id: string) => Compte | undefined;
}

const AccountsContext = createContext<AccountsContextValue | null>(null);

export function AccountsProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Compte[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await unwrap(api.accounts.list());
      setAccounts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (input: NouveauCompte) => {
    const created = await unwrap(api.accounts.create(input));
    await refresh();
    return created;
  }, [refresh]);

  const update = useCallback(async (id: string, input: NouveauCompte) => {
    const updated = await unwrap(api.accounts.update(id, input));
    await refresh();
    return updated;
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    const result = await unwrap(api.accounts.remove(id));
    await refresh();
    return result;
  }, [refresh]);

  const getById = useCallback((id: string) => accounts.find((a) => a.id === id), [accounts]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AccountsContext.Provider value={{ accounts, loading, error, refresh, create, update, remove, getById }}>
      {children}
    </AccountsContext.Provider>
  );
}

export function useAccounts(): AccountsContextValue {
  const ctx = useContext(AccountsContext);
  if (!ctx) throw new Error('useAccounts doit être utilisé dans un AccountsProvider');
  return ctx;
}
