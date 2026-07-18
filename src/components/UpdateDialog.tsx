import { useUpdate } from '../context/UpdateContext';
import { formatReleaseNotes } from '../lib/releaseNotes';
import { useI18n } from '../context/I18nContext';

export default function UpdateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, download, install } = useUpdate();
  const { t } = useI18n();
  if (!open || !state) return null;
  return <div className="modal-backdrop" onClick={onClose}><div className="modal-card update-modal" onClick={(e) => e.stopPropagation()}>
    <div className="modal-title-row"><div><h2>{t('update.title')}</h2><p>{t('update.versions', { available: state.availableVersion ?? '', current: state.currentVersion })}</p></div><button onClick={onClose}>✕</button></div>
    {state.releaseNotes && <pre className="release-notes">{formatReleaseNotes(state.releaseNotes)}</pre>}
    {state.phase === 'downloading' && <div><p>{t('update.downloading')}</p><div className="update-progress"><span style={{ width: `${state.progressPercent ?? 0}%` }} /></div><p>{state.progressPercent ?? 0}% · {state.bytesPerSecond ? `${(state.bytesPerSecond / 1048576).toFixed(1)} MB/s` : t('update.calculating')} · {t('update.remaining', { seconds: state.secondsRemaining ?? '…' })}</p></div>}
    {state.errorMessage && <p className="form-error">{state.errorMessage}</p>}
    <div className="modal-actions"><button className="button secondary" onClick={onClose}>{t('common.later')}</button>{state.phase === 'available' && <button className="button primary" onClick={() => void download()}>{t('common.download')}</button>}{state.phase === 'ready' && <button className="button primary" onClick={() => void install()}>{t('common.installRestart')}</button>}</div>
  </div></div>;
}
