import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import AppRoutes from './router';
import { SettingsProvider } from './context/SettingsContext';
import { AccountsProvider } from './context/AccountsContext';
import { PublicationsProvider } from './context/PublicationsContext';
import { UpdateProvider, useUpdate } from './context/UpdateContext';
import ReleaseNotesDialog from './components/ReleaseNotesDialog';
import AboutDialog from './components/AboutDialog';
import FeedbackDialog from './components/FeedbackDialog';
import { I18nProvider, useI18n } from './context/I18nContext';
import { WelcomeProvider } from './context/WelcomeContext';
import WelcomeDialog from './components/WelcomeDialog';

function ApplicationShell() {
  const { t } = useI18n();
  const { state, acknowledgeInstalled } = useUpdate();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [updateToastVisible, setUpdateToastVisible] = useState(false);
  const updateToastShown = useRef(false);

  // Bref rappel auto-disparaissant au debut du telechargement en arriere-plan - l'installation
  // elle-meme reste entierement silencieuse, ceci indique juste qu'une activite est en cours.
  useEffect(() => {
    if (state?.phase !== 'downloading' || updateToastShown.current) return;
    updateToastShown.current = true;
    setUpdateToastVisible(true);
    const timer = setTimeout(() => setUpdateToastVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [state?.phase]);

  return (
    <div className="app-shell">
      {updateToastVisible && <div className="update-toast" role="status">{t('update.downloadingToast')}</div>}
      <Sidebar onAbout={() => setAboutOpen(true)} onFeedback={() => setFeedbackOpen(true)} />
      <main className="main-area">
      <AppRoutes />
      </main>
      {state?.installedRelease && <ReleaseNotesDialog release={state.installedRelease} onClose={() => void acknowledgeInstalled()} />}
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <WelcomeDialog />
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
      <I18nProvider><WelcomeProvider><AccountsProvider>
          <PublicationsProvider><UpdateProvider><ApplicationShell /></UpdateProvider></PublicationsProvider>
      </AccountsProvider></WelcomeProvider></I18nProvider>
    </SettingsProvider>
  );
}
