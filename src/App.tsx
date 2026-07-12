import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import AppRoutes from './router';
import { SettingsProvider } from './context/SettingsContext';
import { AccountsProvider } from './context/AccountsContext';
import { PublicationsProvider } from './context/PublicationsContext';

export default function App() {
  const navigate = useNavigate();

  useEffect(() => {
    const offNotification = window.api.onNotificationNavigate((publicationId) => {
      navigate(`/planification/${publicationId}/editer`);
    });
    const offAppNavigate = window.api.onAppNavigate((route) => {
      navigate(route);
    });
    return () => {
      offNotification();
      offAppNavigate();
    };
  }, [navigate]);

  return (
    <SettingsProvider>
      <AccountsProvider>
        <PublicationsProvider>
          <div className="app-shell">
            <Sidebar />
            <main className="main-area">
              <AppRoutes />
            </main>
          </div>
        </PublicationsProvider>
      </AccountsProvider>
    </SettingsProvider>
  );
}
