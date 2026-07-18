import { useEffect, useState } from 'react';
import { useI18n } from '../context/I18nContext';
import { useSettings } from '../context/SettingsContext';
import { useWelcome } from '../context/WelcomeContext';
import { api, unwrap } from '../lib/ipc';
import Button from './Button';

export default function WelcomeDialog() {
  const { t } = useI18n();
  const { settings } = useSettings();
  const { open, dismissWelcome } = useWelcome();
  const [neverShowAgain, setNeverShowAgain] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setNeverShowAgain(false); setError(null); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') void dismissWelcome(neverShowAgain); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, neverShowAgain, dismissWelcome]);

  if (!open) return null;
  const donationUrl = settings?.donationUrl.trim() ?? '';

  const donate = async () => {
    if (!donationUrl) return;
    try {
      setOpening(true);
      setError(null);
      await unwrap(api.shell.openDonation(donationUrl));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('welcome.openError'));
    } finally {
      setOpening(false);
    }
  };

  const close = () => void dismissWelcome(neverShowAgain);

  return (
    <div className="welcome-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section className="welcome-dialog" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
        <button className="welcome-close" onClick={close} aria-label={t('welcome.closeLabel')}>✕</button>
        <div className="welcome-mark" aria-hidden="true"><span>♪</span></div>
        <p className="welcome-eyebrow">{t('welcome.eyebrow')}</p>
        <h2 id="welcome-title">{t('welcome.headline')}</h2>
        <p className="welcome-description">{t('welcome.description')}</p>
        <div className="welcome-support">
          <span className="welcome-heart" aria-hidden="true">♥</span>
          <div><strong>{t('welcome.thanks')}</strong><p>{t('welcome.support')}</p></div>
        </div>
        {!donationUrl && <p className="welcome-config-hint">{t('welcome.configureHint')}</p>}
        {error && <p className="form-error">{error}</p>}
        <label className="welcome-checkbox"><input type="checkbox" checked={neverShowAgain} onChange={(event) => setNeverShowAgain(event.target.checked)} /> <span>{t('welcome.dontShow')}</span></label>
        <div className="welcome-actions">
          <Button variant="secondary" onClick={close}>{t('welcome.later')}</Button>
          <Button className="welcome-donate" disabled={!donationUrl || opening} onClick={() => void donate()}><span aria-hidden="true">♥</span>{t('welcome.donate')}</Button>
        </div>
      </section>
    </div>
  );
}
