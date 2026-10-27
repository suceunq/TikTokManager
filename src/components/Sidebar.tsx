import type { ReactNode } from 'react';
import { useI18n } from '../context/I18nContext';
import { useRouter } from '../context/RouterContext';

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const ICONS = {
  calendar: <Icon><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></Icon>,
  plus: <Icon><circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" /></Icon>,
  user: <Icon><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Icon>,
  history: <Icon><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></Icon>,
  settings: <Icon><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></Icon>,
  mail: <Icon><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></Icon>,
  info: <Icon><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></Icon>,
};

export default function Sidebar({ onAbout, onFeedback }: { onAbout: () => void; onFeedback: () => void }) {
  const { t } = useI18n();
  const { path, navigate } = useRouter();
  const links = [
    { to: '/', label: t('nav.calendar'), icon: ICONS.calendar },
    { to: '/planification/nouvelle', label: t('nav.newPublication'), icon: ICONS.plus },
    { to: '/comptes', label: t('nav.accounts'), icon: ICONS.user },
    { to: '/historique', label: t('nav.history'), icon: ICONS.history },
    { to: '/parametres', label: t('nav.settings'), icon: ICONS.settings },
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="dot" />
        TikTok Manager
      </div>
      <nav className="sidebar-nav">
        {links.map((link) => {
          const active = path === link.to;
          return (
            <a
              key={link.to}
              href={`#${link.to}`}
              onClick={(event) => {
                event.preventDefault();
                navigate(link.to);
              }}
              aria-current={active ? 'page' : undefined}
              className={`sidebar-link${active ? ' active' : ''}`}
            >
              {link.icon}
              <span>{link.label}</span>
            </a>
          );
        })}
      </nav>
      <div className="sidebar-bottom">
        <button className="sidebar-about sidebar-feedback" onClick={onFeedback}>{ICONS.mail}<span>{t('nav.feedback')}</span></button>
        <button className="sidebar-about" onClick={onAbout}>{ICONS.info}<span>{t('nav.about')}</span></button>
      </div>
    </aside>
  );
}
