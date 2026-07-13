import { useUpdate } from '../context/UpdateContext';
import { formatReleaseNotes } from '../lib/releaseNotes';

export default function UpdateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, download, install } = useUpdate();
  if (!open || !state) return null;
  return <div className="modal-backdrop" onClick={onClose}><div className="modal-card update-modal" onClick={(e) => e.stopPropagation()}>
    <div className="modal-title-row"><div><h2>Mise à jour disponible</h2><p>Version {state.availableVersion} — vous utilisez la {state.currentVersion}</p></div><button onClick={onClose}>✕</button></div>
    {state.releaseNotes && <pre className="release-notes">{formatReleaseNotes(state.releaseNotes)}</pre>}
    {state.phase === 'downloading' && <div><p>Téléchargement en cours…</p><div className="update-progress"><span style={{ width: `${state.progressPercent ?? 0}%` }} /></div><p>{state.progressPercent ?? 0}% · {state.bytesPerSecond ? `${(state.bytesPerSecond / 1048576).toFixed(1)} Mo/s` : 'calcul…'} · Temps restant estimé : {state.secondsRemaining ?? '…'} s</p></div>}
    {state.errorMessage && <p className="form-error">{state.errorMessage}</p>}
    <div className="modal-actions"><button className="button secondary" onClick={onClose}>Plus tard</button>{state.phase === 'available' && <button className="button primary" onClick={() => void download()}>Télécharger</button>}{state.phase === 'ready' && <button className="button primary" onClick={() => void install()}>Installer et redémarrer</button>}</div>
  </div></div>;
}
