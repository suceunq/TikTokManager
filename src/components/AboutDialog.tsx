import { useUpdate } from '../context/UpdateContext';
import { useI18n } from '../context/I18nContext';

export default function AboutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useUpdate();
  const { t } = useI18n();
  if (!open) return null;
  return <div className="modal-backdrop" onClick={onClose}><div className="modal-card about-modal" onClick={(e) => e.stopPropagation()}>
    <div className="modal-title-row"><div><h2>{t('about.title')}</h2><p>{t('about.version', { version: state?.currentVersion ?? '…' })}</p></div><button onClick={onClose}>✕</button></div>
    <p>{t('about.description')}</p>
    <section><h3>{t('about.credits')}</h3><p>{t('about.design')}</p><p>{t('about.builtWith')}</p></section>
    <p className="about-footer">{t('about.footer')}</p>
    <div className="modal-actions"><button className="button secondary" onClick={onClose}>{t('common.close')}</button></div>
  </div></div>;
}
