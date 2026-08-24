import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

interface RouteLocation {
  path: string;
  state: unknown;
}

interface RouterValue extends RouteLocation {
  navigate: (destination: string | number, options?: { state?: unknown }) => void;
}

const RouterContext = createContext<RouterValue | null>(null);
const SAFE_LOCAL_ROUTE = /^\/[A-Za-z0-9/_-]*$/;

function currentLocation(): RouteLocation {
  const hash = window.location.hash.slice(1);
  return {
    path: hash && SAFE_LOCAL_ROUTE.test(hash) ? hash : '/',
    state: window.history.state ?? null,
  };
}

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<RouteLocation>(currentLocation);

  useEffect(() => {
    const sync = () => setLocation(currentLocation());
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, []);

  const navigate = useCallback((destination: string | number, options?: { state?: unknown }) => {
    if (typeof destination === 'number') {
      window.history.go(destination);
      return;
    }
    const path = SAFE_LOCAL_ROUTE.test(destination) && destination.length <= 240 ? destination : '/';
    window.history.pushState(options?.state ?? null, '', `#${path}`);
    setLocation({ path, state: options?.state ?? null });
  }, []);

  const value = useMemo(() => ({ ...location, navigate }), [location, navigate]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterValue {
  const value = useContext(RouterContext);
  if (!value) throw new Error('RouterProvider manquant');
  return value;
}
