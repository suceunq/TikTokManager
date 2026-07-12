import { useEffect, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useUpdate } from '../context/UpdateContext';
import { formatReleaseNotes } from '../lib/releaseNotes';
import Button from '../components/Button';

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
  const { settings, loading, update } = useSettings();
  const [reminderLead, setReminderLead] = useState(15);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [preReminderEnabled, setPreReminderEnabled] = useState(true);
  const [launchMinimizedToTray, setLaunchMinimizedToTray] = useState(false);
  const [startOnLogin, setStartOnLogin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setReminderLead(settings.reminderLeadMinutesDefault);
      setNotificationsEnabled(settings.notificationsEnabled);
      setPreReminderEnabled(settings.preReminderEnabled);
      setLaunchMinimizedToTray(settings.launchMinimizedToTray);
      setStartOnLogin(settings.startOnLogin);
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    await update({
      reminderLeadMinutesDefault: reminderLead,
      notificationsEnabled,
      preReminderEnabled,
      launchMinimizedToTray,
      startOnLogin,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) {
    return <div className="loading-state">Chargement des paramètres...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Paramètres</h1>
          <p className="page-subtitle">Personnalisez les rappels et le comportement de l'application.</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="field">
          <label htmlFor="reminderLead">Délai de rappel par défaut (minutes avant la publication)</label>
          <input
            id="reminderLead"
            type="number"
            min={0}
            className="input"
            value={reminderLead}
            onChange={(e) => setReminderLead(Number(e.target.value))}
          />
          <span className="hint">Utilisé quand aucun rappel personnalisé n'est défini sur une publication.</span>
        </div>

        <Toggle checked={notificationsEnabled} onChange={setNotificationsEnabled} label="Activer les notifications" />
        <Toggle checked={preReminderEnabled} onChange={setPreReminderEnabled} label="Envoyer un rappel avant l'heure planifiée" />
        <Toggle checked={launchMinimizedToTray} onChange={setLaunchMinimizedToTray} label="Démarrer réduit dans la barre des tâches" />
        <Toggle checked={startOnLogin} onChange={setStartOnLogin} label="Démarrer avec Windows" />

        <div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement...' : saved ? 'Enregistré ✓' : 'Enregistrer les paramètres'}
          </Button>
        </div>
      </div>

      <UpdateSection />
    </div>
  );
}

function UpdateSection() {
  const { state, check, download, install } = useUpdate();
  const phase = state?.phase ?? 'idle';

  return (
    <div className="card" style={{ maxWidth: 520, marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16 }}>Mises à jour</h2>
          <p className="hint">Version installée : {state?.currentVersion ?? '...'}</p>
        </div>
        {(phase === 'idle' || phase === 'unavailable' || phase === 'error') && (
          <Button onClick={() => void check()}>Rechercher une mise à jour</Button>
        )}
      </div>

      {phase === 'unavailable-dev' && (
        <p className="hint">Recherche indisponible en mode développement (nécessite une version installée via l'installateur).</p>
      )}
      {phase === 'checking' && <p className="hint">Recherche en cours...</p>}
      {phase === 'unavailable' && <p style={{ color: 'var(--color-success)' }}>TikTok Manager est à jour.</p>}

      {phase === 'available' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p>Version {state?.availableVersion} disponible sur GitHub.</p>
          {state?.releaseNotes && (
            <pre style={{ maxHeight: 128, overflowY: 'auto', fontSize: 12, whiteSpace: 'pre-wrap', margin: 0 }}>{formatReleaseNotes(state.releaseNotes)}</pre>
          )}
          <div>
            <Button onClick={() => void download()}>Télécharger la mise à jour</Button>
          </div>
        </div>
      )}

      {phase === 'downloading' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p>Téléchargement en cours...</p>
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
          <span>Version {state?.availableVersion} prête. Redémarrage nécessaire pour l'installer.</span>
          <Button onClick={() => void install()}>Installer et redémarrer</Button>
        </div>
      )}

      {phase === 'error' && <p style={{ color: 'var(--color-danger)' }}>{state?.errorMessage ?? 'Erreur lors de la vérification.'}</p>}
    </div>
  );
}
