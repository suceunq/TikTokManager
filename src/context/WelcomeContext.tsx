import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useSettings } from './SettingsContext';

interface WelcomeContextValue {
  open: boolean;
  showWelcome: () => void;
  dismissWelcome: (neverShowAgain: boolean) => Promise<void>;
}

const WelcomeContext = createContext<WelcomeContextValue | null>(null);

export function WelcomeProvider({ children }: { children: ReactNode }) {
  const { settings, update } = useSettings();
  const [open, setOpen] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (!settings || initialized.current) return;
    initialized.current = true;
    if (settings.showWelcomeOnStartup) setOpen(true);
  }, [settings]);

  const dismissWelcome = async (neverShowAgain: boolean) => {
    if (neverShowAgain) await update({ showWelcomeOnStartup: false });
    setOpen(false);
  };

  return <WelcomeContext.Provider value={{ open, showWelcome: () => setOpen(true), dismissWelcome }}>{children}</WelcomeContext.Provider>;
}

export function useWelcome(): WelcomeContextValue {
  const value = useContext(WelcomeContext);
  if (!value) throw new Error('useWelcome must be used inside WelcomeProvider');
  return value;
}
