import { NavLink } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';

export default function Sidebar({ onAbout, onFeedback }: { onAbout: () => void; onFeedback: () => void }) {
  const { t } = useI18n();
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
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <span>{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-bottom"><button className="sidebar-about sidebar-feedback" onClick={onFeedback}><span>✉</span><span>{t('nav.feedback')}</span></button><button className="sidebar-about" onClick={onAbout}><span>ℹ️</span><span>{t('nav.about')}</span></button></div>
    </aside>
  );
}
