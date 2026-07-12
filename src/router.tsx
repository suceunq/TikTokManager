import { Routes, Route } from 'react-router-dom';
import CalendrierPage from './pages/CalendrierPage';
import PlanificationFormPage from './pages/PlanificationFormPage';
import ComptesPage from './pages/ComptesPage';
import HistoriquePage from './pages/HistoriquePage';
import ParametresPage from './pages/ParametresPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<CalendrierPage />} />
      <Route path="/planification/nouvelle" element={<PlanificationFormPage />} />
      <Route path="/planification/:id/editer" element={<PlanificationFormPage />} />
      <Route path="/comptes" element={<ComptesPage />} />
      <Route path="/historique" element={<HistoriquePage />} />
      <Route path="/parametres" element={<ParametresPage />} />
    </Routes>
  );
}
