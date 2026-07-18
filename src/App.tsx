import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import AppRoutes from './router';
import { SettingsProvider } from './context/SettingsContext';
import { AccountsProvider } from './context/AccountsContext';
import { PublicationsProvider } from './context/PublicationsContext';
import { UpdateProvider, useUpdate } from './context/UpdateContext';
import UpdateDialog from './components/UpdateDialog';
import AboutDialog from './components/AboutDialog';
import FeedbackDialog from './components/FeedbackDialog';
import { I18nProvider, useI18n } from './context/I18nContext';

function ApplicationShell() {
  const { t } = useI18n();
  const { state } = useUpdate();
  const [updateOpen, setUpdateOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  useEffect(() => { if (state?.phase === 'available') setUpdateOpen(true); }, [state?.phase, state?.availableVersion]);

  return (
    <div className="app-shell">
      <Sidebar onAbout={() => setAboutOpen(true)} onFeedback={() => setFeedbackOpen(true)} />
      <main className="main-area">
      {(state?.phase === 'available' || state?.phase === 'ready') && <button className="update-banner" onClick={() => setUpdateOpen(true)}>
      {state?.phase === 'ready'
        ? t('update.bannerReady', { version: state.availableVersion ?? '' })
        : t('update.bannerAvailable', { version: state.availableVersion ?? '' })}
      <span className="update-banner-link">{t('update.details')}</span>
      </button>}
      <AppRoutes />
      </main>
      <UpdateDialog open={updateOpen} onClose={() => setUpdateOpen(false)} />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
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
      <I18nProvider><AccountsProvider>
          <PublicationsProvider><UpdateProvider><ApplicationShell /></UpdateProvider></PublicationsProvider>
      </AccountsProvider></I18nProvider>
    </SettingsProvider>
  );
}
