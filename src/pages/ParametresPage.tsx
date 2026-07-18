import { useEffect, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useUpdate } from '../context/UpdateContext';
import { formatReleaseNotes } from '../lib/releaseNotes';
import Button from '../components/Button';
import { SUPPORTED_LOCALES, type LanguagePreference } from '@shared/i18n';
import { useI18n } from '../context/I18nContext';

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
      <span className="toggle">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="toggle-slider" />
      </span>
      {label}
    </label>
  );
}

export default function ParametresPage() {
  const { t } = useI18n();
  const { settings, loading, update } = useSettings();
  const [reminderLead, setReminderLead] = useState(15);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [preReminderEnabled, setPreReminderEnabled] = useState(true);
  const [launchMinimizedToTray, setLaunchMinimizedToTray] = useState(false);
  const [startOnLogin, setStartOnLogin] = useState(false);
  const [language, setLanguage] = useState<LanguagePreference>('system');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setReminderLead(settings.reminderLeadMinutesDefault);
      setNotificationsEnabled(settings.notificationsEnabled);
      setPreReminderEnabled(settings.preReminderEnabled);
      setLaunchMinimizedToTray(settings.launchMinimizedToTray);
      setStartOnLogin(settings.startOnLogin);
      setLanguage(settings.language);
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await update({ reminderLeadMinutesDefault: reminderLead, notificationsEnabled, preReminderEnabled, launchMinimizedToTray, startOnLogin, language });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading-state">{t('common.loading')}</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('settings.title')}</h1><p className="page-subtitle">{t('settings.subtitle')}</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {error && <p style={{ color: 'var(--color-danger)', margin: 0 }}>{error}</p>}
        <div className="field"><label htmlFor="language">{t('settings.language')}</label><select id="language" className="select" value={language} onChange={(e) => { const next = e.target.value as LanguagePreference; setLanguage(next); void update({ language: next }); }}><option value="system">{t('language.system')}</option>{SUPPORTED_LOCALES.map((code) => <option key={code} value={code}>{t(`language.${code}`)}</option>)}</select><span className="hint">{t('settings.languageHint')}</span></div>
        <div className="field">
          <label htmlFor="reminderLead">{t('settings.reminderLead')}</label>
          <input
            id="reminderLead"
            type="number"
            min={0}
            className="input"
            value={reminderLead}
            onChange={(e) => setReminderLead(Number(e.target.value))}
          />
          <span className="hint">{t('settings.reminderHint')}</span>
        </div>

        <Toggle checked={notificationsEnabled} onChange={setNotificationsEnabled} label={t('settings.notifications')} /><Toggle checked={preReminderEnabled} onChange={setPreReminderEnabled} label={t('settings.preReminder')} /><Toggle checked={launchMinimizedToTray} onChange={setLaunchMinimizedToTray} label={t('settings.launchMinimized')} /><Toggle checked={startOnLogin} onChange={setStartOnLogin} label={t('settings.startOnLogin')} />

        <div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t('common.saving') : saved ? t('settings.saved') : t('settings.save')}
          </Button>
        </div>
      </div>

      <UpdateSection />
    </div>
  );
}

function UpdateSection() {
  const { t } = useI18n();
  const { state, check, download, install } = useUpdate();
  const phase = state?.phase ?? 'idle';

  return (
    <div className="card" style={{ maxWidth: 520, marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16 }}>{t('settings.updates')}</h2><p className="hint">{t('settings.installedVersion', { version: state?.currentVersion ?? '…' })}</p>
        </div>
        {(phase === 'idle' || phase === 'unavailable' || phase === 'error') && (
          <Button onClick={() => void check()}>{t('settings.checkUpdate')}</Button>
        )}
      </div>

      {phase === 'unavailable-dev' && (
        <p className="hint">{t('settings.devUnavailable')}</p>
      )}
      {phase === 'checking' && <p className="hint">{t('settings.checking')}</p>}{phase === 'unavailable' && <p style={{ color: 'var(--color-success)' }}>{t('settings.upToDate')}</p>}

      {phase === 'available' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p>{t('settings.available', { version: state?.availableVersion ?? '' })}</p>
          {state?.releaseNotes && (
            <pre style={{ maxHeight: 128, overflowY: 'auto', fontSize: 12, whiteSpace: 'pre-wrap', margin: 0 }}>{formatReleaseNotes(state.releaseNotes)}</pre>
          )}
          <div>
            <Button onClick={() => void download()}>{t('common.download')}</Button>
          </div>
        </div>
      )}

      {phase === 'downloading' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p>{t('settings.downloading')}</p>
          <div style={{ height: 8, borderRadius: 4, background: 'var(--color-border)', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${state?.progressPercent ?? 0}%`,
                background: 'var(--color-primary)',
                transition: 'width 0.2s',
              }}
            />
          </div>
          <span className="hint">{state?.progressPercent ?? 0}%</span>
        </div>
      )}

      {phase === 'ready' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{t('settings.ready', { version: state?.availableVersion ?? '' })}</span><Button onClick={() => void install()}>{t('common.installRestart')}</Button>
        </div>
      )}

      {phase === 'error' && <p style={{ color: 'var(--color-danger)' }}>{state?.errorMessage ?? t('settings.updateError')}</p>}
    </div>
  );
}
