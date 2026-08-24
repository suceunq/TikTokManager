import { useI18n } from '../context/I18nContext';
import { useRouter } from '../context/RouterContext';

export default function Sidebar({ onAbout, onFeedback }: { onAbout: () => void; onFeedback: () => void }) {
  const { t } = useI18n();
  const { path, navigate } = useRouter();
  const links = [
    { to: '/', label: t('nav.calendar'), icon: '📅', end: true }, { to: '/planification/nouvelle', label: t('nav.newPublication'), icon: '➕', end: true },
    { to: '/comptes', label: t('nav.accounts'), icon: '👤', end: true }, { to: '/historique', label: t('nav.history'), icon: '🕓', end: true }, { to: '/parametres', label: t('nav.settings'), icon: '⚙️', end: true },
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="dot" />
        TikTok Manager
      </div>
      <nav className="sidebar-nav">
        {links.map((link) => (
          <a
            key={link.to}
            href={`#${link.to}`}
            onClick={(event) => {
              event.preventDefault();
              navigate(link.to);
            }}
            className={`sidebar-link${path === link.to ? ' active' : ''}`}
          >
            <span>{link.icon}</span>
            <span>{link.label}</span>
          </a>
        ))}
      </nav>
      <div className="sidebar-bottom"><button className="sidebar-about sidebar-feedback" onClick={onFeedback}><span>✉</span><span>{t('nav.feedback')}</span></button><button className="sidebar-about" onClick={onAbout}><span>ℹ️</span><span>{t('nav.about')}</span></button></div>
    </aside>
  );
}
