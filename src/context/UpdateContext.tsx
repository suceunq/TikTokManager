import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { UpdateState } from '@shared/types';
import { api, unwrap } from '../lib/ipc';

interface UpdateContextValue {
  state: UpdateState | null;
  check: () => Promise<void>;
  download: () => Promise<void>;
  install: () => Promise<void>;
}

const UpdateContext = createContext<UpdateContextValue | null>(null);

export function UpdateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UpdateState | null>(null);

  const refresh = useCallback(async () => {
    setState(await unwrap(api.update.getState()));
  }, []);

  const check = useCallback(async () => {
    setState(await unwrap(api.update.check()));
  }, []);

  const download = useCallback(async () => {
    await unwrap(api.update.download());
  }, []);

  const install = useCallback(async () => {
    await unwrap(api.update.install());
  }, []);

  useEffect(() => {
    refresh();
    return window.api.onUpdateStateChanged(setState);
  }, [refresh]);

  return <UpdateContext.Provider value={{ state, check, download, install }}>{children}</UpdateContext.Provider>;
}

export function useUpdate(): UpdateContextValue {
  const ctx = useContext(UpdateContext);
  if (!ctx) throw new Error('useUpdate doit être utilisé dans un UpdateProvider');
  return ctx;
}
