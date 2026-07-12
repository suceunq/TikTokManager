import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Calendrier', icon: '📅', end: true },
  { to: '/planification/nouvelle', label: 'Nouvelle publication', icon: '➕', end: true },
  { to: '/comptes', label: 'Comptes', icon: '👤', end: true },
  { to: '/historique', label: 'Historique', icon: '🕓', end: true },
  { to: '/parametres', label: 'Paramètres', icon: '⚙️', end: true },
];

export default function Sidebar() {
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
    </aside>
  );
}
