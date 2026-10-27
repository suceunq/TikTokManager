import CalendrierPage from './pages/CalendrierPage';
import PlanificationFormPage from './pages/PlanificationFormPage';
import ComptesPage from './pages/ComptesPage';
import HistoriquePage from './pages/HistoriquePage';
import ParametresPage from './pages/ParametresPage';
import { useRouter } from './context/RouterContext';

export default function AppRoutes() {
  const { path } = useRouter();
  return <div key={path} className="page-enter">{renderRoute(path)}</div>;
}

function renderRoute(path: string) {
  if (path === '/planification/nouvelle' || /^\/planification\/[^/]+\/editer$/.test(path)) return <PlanificationFormPage />;
  if (path === '/comptes') return <ComptesPage />;
  if (path === '/historique') return <HistoriquePage />;
  if (path === '/parametres') return <ParametresPage />;
  return <CalendrierPage />;
}
