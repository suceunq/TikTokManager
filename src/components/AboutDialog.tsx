import { useUpdate } from '../context/UpdateContext';

export default function AboutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useUpdate();
  if (!open) return null;
  return <div className="modal-backdrop" onClick={onClose}><div className="modal-card about-modal" onClick={(e) => e.stopPropagation()}>
    <div className="modal-title-row"><div><h2>À propos de TikTok Manager</h2><p>Version {state?.currentVersion ?? '…'}</p></div><button onClick={onClose}>✕</button></div>
    <p>TikTok Manager est une application Windows en français pour organiser et planifier les vidéos et stories de plusieurs comptes TikTok depuis un calendrier visuel.</p>
    <section><h3>Crédits</h3><p>Conception et développement : bob59</p><p>Construit avec Electron, React et TypeScript.</p></section>
    <p className="about-footer">Créé par bob59 · © 2026</p>
    <div className="modal-actions"><button className="button secondary" onClick={onClose}>Fermer</button></div>
  </div></div>;
}
