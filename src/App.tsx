import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import AppRoutes from './router';
import { SettingsProvider } from './context/SettingsContext';
import { AccountsProvider } from './context/AccountsContext';
import { PublicationsProvider } from './context/PublicationsContext';
import { UpdateProvider, useUpdate } from './context/UpdateContext';

function UpdateBanner() {
  const { state } = useUpdate();
  const navigate = useNavigate();

  if (state?.phase !== 'available' && state?.phase !== 'ready') return null;

  return (
    <button className="update-banner" onClick={() => navigate('/parametres')}>
      {state.phase === 'ready'
        ? `Mise à jour ${state.availableVersion} prête à installer`
        : `Mise à jour ${state.availableVersion} disponible`}
      <span className="update-banner-link">Voir dans Paramètres</span>
    </button>
  );
}

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
          <UpdateProvider>
            <div className="app-shell">
              <Sidebar />
              <main className="main-area">
                <UpdateBanner />
                <AppRoutes />
              </main>
            </div>
          </UpdateProvider>
        </PublicationsProvider>
      </AccountsProvider>
    </SettingsProvider>
  );
}
